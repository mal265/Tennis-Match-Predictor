"""Report 2 — keep the model simple, change what it can see.

Rebuilds every number in Report 2 from the match archive using the notebook's
feature definitions (tools/elo_features.py), and exports the final logistic
regression that the in-browser predictor runs. Called from tools/export_data.py.
"""

from __future__ import annotations

import math
import warnings

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss, roc_auc_score

from elo_features import FEATURES, START_RATING, build_features, load_matches

warnings.filterwarnings("ignore")

REPORT1_FEATURES = ["rank_diff", "points_diff", "age_diff", "height_diff"]
BASE = ["elo_diff", "surface_elo_diff"]
SURFACES = ["Hard", "Clay", "Grass"]

LABELS = {
    "elo_diff": "Elo gap",
    "surface_elo_diff": "Surface Elo gap",
    "h2h_diff": "Head-to-head edge",
    "rest_diff": "Rest gap",
    "exp_diff": "Experience gap",
}

# Each step adds to the one before it, mirroring the notebook's experiments.
STEPS = [
    ("report1", "Report 1 model", "ranking, points, age, height", REPORT1_FEATURES),
    ("elo", "Elo rating", "one number per player, updated every match", ["elo_diff"]),
    ("surface", "+ surface Elo", "a separate rating on each surface", BASE),
    ("form", "+ recent form", "win rate over the last ten matches", BASE + ["form_diff"]),
    ("h2h", "+ head-to-head", "prior wins minus losses against this opponent", BASE + ["h2h_diff"]),
    ("rest", "+ rest days", "days since each player's last match", BASE + ["rest_diff"]),
    ("experience", "+ experience", "career matches played before this one", BASE + ["exp_diff"]),
    ("final", "Final model", "Elo, surface Elo, head-to-head, rest, experience", FEATURES),
]

# What tennis_predictor_v2.ipynb printed. Re-derived on every export so a data or
# library change that moves a result is caught rather than silently published.
NOTEBOOK = [
    ("baseline", 3, 0.637), ("baseline", 4, 0.6366), ("rank_only", 3, 0.636),
    ("experience_only", 3, 0.571), ("elo_rule", 3, 0.642), ("elo", 4, 0.6425),
    ("surface", 4, 0.6461), ("form", 4, 0.6446), ("h2h", 4, 0.6472), ("rest", 4, 0.6479),
    ("experience", 4, 0.6468), ("rest_capped", 4, 0.6465), ("final", 4, 0.6495),
]

TRACKED = ["Roger Federer", "Rafael Nadal", "Novak Djokovic", "Carlos Alcaraz", "Jannik Sinner"]

ELO_BANDS = [(0, 25), (25, 50), (50, 100), (100, 150), (150, 250), (250, 400), (400, None)]
RANK_BANDS = [(0, 3, "0–3"), (3, 8, "4–8"), (8, 15, "9–15"), (15, 30, "16–30"),
              (30, 60, "31–60"), (60, 120, "61–120"), (120, None, "120+")]


def r(value, digits: int = 4):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), digits)


def paired(model_ok: np.ndarray, ref_ok: np.ndarray, draws: int = 20000) -> dict:
    """Is the accuracy difference on the same matches bigger than chance?

    The paired bootstrap resamples matches; because each match contributes -1, 0
    or +1 to the difference, that is exactly a multinomial draw over three counts.
    McNemar's test (with continuity correction) gives the matching p-value.
    """
    d = model_ok.astype(int) - ref_ok.astype(int)
    n = len(d)
    up, down = int((d == 1).sum()), int((d == -1).sum())
    rng = np.random.default_rng(42)
    sample = rng.multinomial(n, [up / n, down / n, 1 - (up + down) / n], size=draws)
    lo, hi = np.percentile((sample[:, 0] - sample[:, 1]) / n, [2.5, 97.5])
    chi2 = (abs(up - down) - 1) ** 2 / (up + down) if up + down else 0.0
    return {
        "lift": r(d.mean(), 6),
        "ciLow": r(lo, 6),
        "ciHigh": r(hi, 6),
        "pValue": float(f"{math.erfc(math.sqrt(chi2 / 2)):.3g}"),
        "onlyModelRight": up,
        "onlyReferenceRight": down,
    }


def paired_loss(p_model: np.ndarray, p_ref: np.ndarray, y: np.ndarray) -> dict:
    """Compare two models' probabilities match by match (improvement > 0 = model better).

    Accuracy only asks which side of 50% a probability fell; log loss and the
    Brier score judge the probability itself. Paired normal approximation.
    """
    eps = 1e-15

    def log_loss_each(p):
        p = np.clip(p, eps, 1 - eps)
        return -(y * np.log(p) + (1 - y) * np.log(1 - p))

    out = {}
    for name, loss in (("logLoss", log_loss_each), ("brier", lambda p: (p - y) ** 2)):
        ref, model = loss(p_ref), loss(p_model)
        diff = ref - model
        se = diff.std(ddof=1) / math.sqrt(len(diff))
        z = diff.mean() / se
        out[name] = {
            "reference": r(ref.mean(), 6),
            "model": r(model.mean(), 6),
            "improvement": r(diff.mean(), 6),
            "ciLow": r(diff.mean() - 1.96 * se, 6),
            "ciHigh": r(diff.mean() + 1.96 * se, 6),
            "pValue": float(f"{math.erfc(abs(z) / math.sqrt(2)):.3g}"),
        }
    return out


def build(data_path, analytics: dict):
    """Returns (report, model, ratings, matches) for export_data.py to write out."""
    matches = load_matches(data_path)
    names = (
        pd.concat([
            matches[["winner_id", "winner_name"]].set_axis(["id", "name"], axis=1),
            matches[["loser_id", "loser_name"]].set_axis(["id", "name"], axis=1),
        ])
        .drop_duplicates("id")
        .set_index("id")["name"]
    )
    ids = {name: pid for pid, name in names.items()}
    tracked = {ids[name] for name in TRACKED}

    matches, st = build_features(matches, track=tracked)
    cut = int(len(matches) * 0.8)
    train, test = matches.iloc[:cut], matches.iloc[cut:]
    y = test["target"].to_numpy()

    def fit(cols):
        return LogisticRegression(max_iter=1000).fit(train[cols], train["target"])

    baseline_pred = (test["rank_diff"] < 0).astype(int).to_numpy()
    baseline_ok = baseline_pred == y
    found = {"baseline": accuracy_score(y, baseline_pred)}

    # --- the ladder --------------------------------------------------------
    steps, fitted, correct, probas = [], {}, {}, {}
    for key, label, detail, cols in STEPS:
        model = fit(cols)
        pred = model.predict(test[cols])
        proba = model.predict_proba(test[cols])[:, 1]
        fitted[key], correct[key], probas[key] = model, pred == y, proba
        found[key] = accuracy_score(y, pred)
        steps.append({
            "key": key,
            "label": label,
            "detail": detail,
            "features": cols,
            "accuracy": r(found[key], 6),
            "auc": r(roc_auc_score(y, proba)),
            "logLoss": r(log_loss(y, proba)),
            **paired(correct[key], baseline_ok),
        })
        print(f"  {label:<18} {found[key]:.4f}  lift {steps[-1]['lift'] * 100:+.2f} pts"
              f"  95% CI [{steps[-1]['ciLow'] * 100:+.2f}, {steps[-1]['ciHigh'] * 100:+.2f}]"
              f"  p={steps[-1]['pValue']}")

    found["rank_only"] = accuracy_score(y, fit(["rank_diff"]).predict(test[["rank_diff"]]))
    found["experience_only"] = accuracy_score(y, fit(["exp_diff"]).predict(test[["exp_diff"]]))
    found["elo_rule"] = accuracy_score(y, (test["elo_diff"] > 0).astype(int))
    found["rest_capped"] = accuracy_score(y, fit(BASE + ["rest_cap_diff"]).predict(test[BASE + ["rest_cap_diff"]]))

    matched = sum(round(found[key], dp) == want for key, dp, want in NOTEBOOK)
    print(f"  notebook reproduction: {matched}/{len(NOTEBOOK)} results match")
    for key, dp, want in NOTEBOOK:
        if round(found[key], dp) != want:
            print(f"    MISMATCH {key}: notebook {want}, export {round(found[key], dp)}")

    # --- the shipped model -------------------------------------------------
    final = fitted["final"]
    final_proba = final.predict_proba(test[FEATURES])[:, 1]
    coef = dict(zip(FEATURES, final.coef_[0]))
    spread = train[FEATURES].std()

    perm = permutation_importance(final, test[FEATURES], y, n_repeats=10, random_state=42, scoring="accuracy")
    importance = sorted(
        ({"feature": f, "label": LABELS[f], "drop": r(d, 6), "coef": float(coef[f]),
          "standardised": r(coef[f] * spread[f])} for f, d in zip(FEATURES, perm.importances_mean)),
        key=lambda item: -item["drop"],
    )

    edges = np.arange(0.0, 1.01, 0.05)
    bins = np.clip(np.digitize(final_proba, edges) - 1, 0, len(edges) - 2)
    calibration = [
        {"predicted": r(final_proba[bins == b].mean()), "actual": r(y[bins == b].mean()), "count": int((bins == b).sum())}
        for b in range(len(edges) - 1)
        if (bins == b).sum() >= 40
    ]

    # --- where the gain comes from ----------------------------------------
    elo_gap = test["elo_diff"].abs().to_numpy()
    elo_bands = []
    for lo, hi in ELO_BANDS:
        mask = (elo_gap >= lo) & (elo_gap < hi) if hi else elo_gap >= lo
        elo_bands.append({
            "label": f"{lo}–{hi}" if hi else f"{lo}+",
            "lo": lo, "hi": hi,
            "matches": int(mask.sum()),
            "baseline": r(baseline_ok[mask].mean()),
            "model": r(correct["final"][mask].mean()),
        })

    rank_gap = test["rank_diff"].abs().to_numpy()
    rank_bands = []
    for lo, hi, label in RANK_BANDS:
        if hi is None:
            mask = rank_gap > lo
        elif lo == 0:
            mask = rank_gap <= hi
        else:
            mask = (rank_gap > lo) & (rank_gap <= hi)
        base_acc = baseline_ok[mask].mean()
        rank_bands.append({
            "label": label,
            "matches": int(mask.sum()),
            "baseline": r(base_acc),
            "report1Lift": r(correct["report1"][mask].mean() - base_acc),
            "finalLift": r(correct["final"][mask].mean() - base_acc),
        })

    # --- the ratings themselves -------------------------------------------
    def leaders(pairs, minimum, games_of, top=10):
        eligible = [(pid, v) for pid, v in pairs if games_of(pid) >= minimum]
        return sorted(eligible, key=lambda kv: -kv[1])[:top]

    current = [{"name": names[pid], "rating": r(v, 0), "games": int(st.games[pid])}
               for pid, v in leaders(st.elo.items(), 50, lambda pid: st.games[pid])]
    peak = [{"name": names[pid], "rating": r(v, 0), "date": str(st.peak[pid][1].date())}
            for pid, v in leaders(((pid, v[0]) for pid, v in st.peak.items()), 100, lambda pid: st.games[pid])]
    surface_kings = {
        surface: [
            {"name": names[pid], "rating": r(v, 0), "games": int(st.surface_games[(pid, surface)])}
            for (pid, s), v in sorted(
                ((key, v) for key, v in st.surface_elo.items()
                 if key[1] == surface and st.surface_games[key] >= 50),
                key=lambda kv: -kv[1],
            )[:5]
        ]
        for surface in SURFACES
    }

    trajectories = []
    for name in TRACKED:
        history = st.history[ids[name]]
        series = pd.Series([rating for _, rating in history], index=pd.DatetimeIndex([d for d, _ in history]))
        monthly = series.groupby(series.index.to_period("M")).last()
        best = series.idxmax()
        trajectories.append({
            "name": name,
            "points": [{"t": str(period), "r": r(value, 1)} for period, value in monthly.items()],
            "peak": {"t": str(best.to_period("M")), "r": r(series.max(), 0)},
        })

    djokovic, nadal = ids["Novak Djokovic"], ids["Rafael Nadal"]
    rivalry = {
        "a": "Novak Djokovic", "b": "Rafael Nadal",
        "aWins": int(((matches["winner_id"] == djokovic) & (matches["loser_id"] == nadal)).sum()),
        "bWins": int(((matches["winner_id"] == nadal) & (matches["loser_id"] == djokovic)).sum()),
    }

    nn = analytics["neuralNetwork"]
    report = {
        "asOf": str(matches["tourney_date"].max().date()),
        "split": {"train": int(len(train)), "test": int(len(test))},
        "baseline": r(found["baseline"], 6),
        "report1": {
            "logisticAccuracy": r(found["report1"], 6),
            "networkAccuracy": nn["accuracy"],
            "networkAuc": nn["auc"],
            "networkLogLoss": nn["logLoss"],
        },
        "final": {
            "accuracy": r(found["final"], 6),
            "auc": r(roc_auc_score(y, final_proba)),
            "logLoss": r(log_loss(y, final_proba)),
            "correct": int(correct["final"].sum()),
        },
        "steps": steps,
        "finalVsReport1": paired(correct["final"], correct["report1"]),
        "finalVsReport1Probabilities": paired_loss(probas["final"], probas["report1"], y.astype(float)),
        "singles": {
            "rankOnly": r(found["rank_only"], 6),
            "experienceOnly": r(found["experience_only"], 6),
            "eloRule": r(found["elo_rule"], 6),
        },
        "restVariants": {"raw": r(found["rest"], 6), "capped": r(found["rest_capped"], 6)},
        "context": {
            "rematchShare": r((test["h2h_diff"] != 0).mean()),
            "sameRestShare": r((test["rest_diff"] == 0).mean()),
        },
        "importance": importance,
        "calibration": calibration,
        "eloBands": elo_bands,
        "rankBands": rank_bands,
        "leaders": {"current": current, "peak": peak, "surfaces": surface_kings},
        "trajectories": trajectories,
        "rivalry": rivalry,
        "reproduction": {"checked": len(NOTEBOOK), "matched": matched},
    }

    model = {
        "features": FEATURES,
        "labels": LABELS,
        "coef": [float(coef[f]) for f in FEATURES],
        "intercept": float(final.intercept_[0]),
        "startRating": START_RATING,
        "asOf": report["asOf"],
        "trainedOn": int(len(train)),
        "testAccuracy": report["final"]["accuracy"],
    }
    return report, model, st, matches


def attach_ratings(players: list[dict], st, matches: pd.DataFrame, key) -> None:
    """Give each player card the ratings the final model reads, as of the archive's last match."""
    ids = {}
    for id_col, name_col in (("winner_id", "winner_name"), ("loser_id", "loser_name")):
        for pid, name in zip(matches[id_col], matches[name_col]):
            ids.setdefault(key(name), pid)

    for card in players:
        pid = ids.get(key(card["name"]))
        if pid is None:
            card["rating"] = {
                "rated": False,
                "elo": START_RATING,
                "games": 0,
                "peak": None,
                "lastMatch": None,
                "surfaces": {s: {"rating": START_RATING, "games": 0} for s in SURFACES},
            }
            continue

        peak_rating, peak_date = st.peak[pid]
        card["rating"] = {
            "rated": True,
            "elo": r(st.elo[pid]),
            "games": int(st.games[pid]),
            "peak": {"rating": r(peak_rating, 1), "date": str(peak_date.date())},
            "lastMatch": {"date": str(st.last_date[pid].date()), "event": st.last_event[pid]},
            "surfaces": {
                s: {"rating": r(st.surface_elo[(pid, s)]), "games": int(st.surface_games[(pid, s)])}
                for s in SURFACES
            },
        }
