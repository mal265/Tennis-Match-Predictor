"""Pre-match rating features for Report 2 — a faithful port of tennis_predictor_v2.ipynb.

Every feature walks the matches in date order, READS each player's state going
into the match and only then UPDATES it with the result, so no feature ever
contains the outcome it is used to predict. The notebook builds each feature in
its own loop; here they share one pass, which produces identical values because
no feature reads another's state. tools/report2.py checks the resulting
accuracies against the notebook's printed outputs.
"""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

# The five inputs of Report 2's final model, in the order the model expects.
FEATURES = ["elo_diff", "surface_elo_diff", "h2h_diff", "rest_diff", "exp_diff"]

START_RATING = 1500.0
FORM_WINDOW = 10
DEFAULT_REST_DAYS = 30  # a player's first recorded match has no previous date
REST_CAP_DAYS = 60


def dynamic_k(games_played: int) -> float:
    """How far one result moves a rating: large for newcomers, small once established."""
    return 250 / ((games_played + 5) ** 0.4)


def expected_score(rating: float, opponent: float) -> float:
    """Elo's win probability for `rating` against `opponent`."""
    return 1 / (1 + 10 ** ((opponent - rating) / 400))


def load_matches(path) -> pd.DataFrame:
    """Load and order matches exactly as the notebook does: by date, then match number."""
    df = pd.read_csv(path, low_memory=False)
    df["tourney_date"] = pd.to_datetime(df["tourney_date"])
    return df.sort_values(["tourney_date", "match_num"]).reset_index(drop=True)


@dataclass
class Ratings:
    """Every player's state after the last match in the archive."""

    elo: dict = field(default_factory=lambda: defaultdict(lambda: START_RATING))
    games: dict = field(default_factory=lambda: defaultdict(int))
    surface_elo: dict = field(default_factory=lambda: defaultdict(lambda: START_RATING))
    surface_games: dict = field(default_factory=lambda: defaultdict(int))
    recent: dict = field(default_factory=lambda: defaultdict(lambda: deque(maxlen=FORM_WINDOW)))
    h2h: dict = field(default_factory=lambda: defaultdict(int))
    last_date: dict = field(default_factory=dict)
    last_event: dict = field(default_factory=dict)
    peak: dict = field(default_factory=dict)
    history: dict = field(default_factory=lambda: defaultdict(list))


def build_features(df: pd.DataFrame, track: set | None = None) -> tuple[pd.DataFrame, Ratings]:
    """Add the notebook's pre-match features to `df` (which must already be date-ordered).

    `track` names player ids whose rating after every match should be kept, for
    plotting rating histories.
    """
    track = track or set()
    n = len(df)
    is_a = df["winner_is_A"].to_numpy().astype(bool)
    st = Ratings()

    exp_w, exp_l = np.zeros(n), np.zeros(n)
    elo_w, elo_l = np.zeros(n), np.zeros(n)
    selo_w, selo_l = np.zeros(n), np.zeros(n)
    form_w, form_l = np.full(n, 0.5), np.full(n, 0.5)
    h2h_w = np.zeros(n)
    rest_w, rest_l = np.zeros(n), np.zeros(n)

    for i, row in enumerate(df.itertuples(index=False)):
        w, l, s, d = row.winner_id, row.loser_id, row.surface, row.tourney_date

        # --- read: the state each player carries into this match -------------
        exp_w[i], exp_l[i] = st.games[w], st.games[l]

        a, b = st.elo[w], st.elo[l]
        elo_w[i], elo_l[i] = a, b

        sa, sb = st.surface_elo[(w, s)], st.surface_elo[(l, s)]
        selo_w[i], selo_l[i] = sa, sb

        if st.recent[w]:
            form_w[i] = sum(st.recent[w]) / len(st.recent[w])
        if st.recent[l]:
            form_l[i] = sum(st.recent[l]) / len(st.recent[l])

        h2h_w[i] = st.h2h[(w, l)] - st.h2h[(l, w)]

        rest_w[i] = (d - st.last_date[w]).days if w in st.last_date else DEFAULT_REST_DAYS
        rest_l[i] = (d - st.last_date[l]).days if l in st.last_date else DEFAULT_REST_DAYS

        # --- update: fold the result in --------------------------------------
        expected_w = expected_score(a, b)
        st.elo[w] = a + dynamic_k(st.games[w]) * (1 - expected_w)
        st.elo[l] = b - dynamic_k(st.games[l]) * (1 - expected_w)

        surface_expected_w = expected_score(sa, sb)
        st.surface_elo[(w, s)] = sa + dynamic_k(st.surface_games[(w, s)]) * (1 - surface_expected_w)
        st.surface_elo[(l, s)] = sb - dynamic_k(st.surface_games[(l, s)]) * (1 - surface_expected_w)

        st.games[w] += 1
        st.games[l] += 1
        st.surface_games[(w, s)] += 1
        st.surface_games[(l, s)] += 1
        st.recent[w].append(1)
        st.recent[l].append(0)
        st.h2h[(w, l)] += 1
        st.last_date[w] = d
        st.last_date[l] = d
        st.last_event[w] = row.tourney_name
        st.last_event[l] = row.tourney_name

        for pid in (w, l):
            rating = st.elo[pid]
            if pid not in st.peak or rating > st.peak[pid][0]:
                st.peak[pid] = (rating, d)
            if pid in track:
                st.history[pid].append((d, rating))

    out = df.copy()
    out["exp_diff"] = np.where(is_a, exp_w - exp_l, exp_l - exp_w)
    out["elo_diff"] = np.where(is_a, elo_w - elo_l, elo_l - elo_w)
    out["surface_elo_diff"] = np.where(is_a, selo_w - selo_l, selo_l - selo_w)
    out["form_diff"] = np.where(is_a, form_w - form_l, form_l - form_w)
    out["h2h_diff"] = np.where(is_a, h2h_w, -h2h_w)
    out["rest_diff"] = np.where(is_a, rest_w - rest_l, rest_l - rest_w)

    rest_w_cap = np.minimum(rest_w, REST_CAP_DAYS)
    rest_l_cap = np.minimum(rest_l, REST_CAP_DAYS)
    out["rest_cap_diff"] = np.where(is_a, rest_w_cap - rest_l_cap, rest_l_cap - rest_w_cap)

    return out, st
