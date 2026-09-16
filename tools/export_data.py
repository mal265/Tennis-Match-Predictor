"""Export the trained model and the research analytics as JSON for the web app.

Everything the frontend shows is produced here, straight from `model.joblib` and
`data/atp_2000_2024_model_ready.csv`, so no chart or number in the UI is hand-typed.

Outputs (written to web/src/data/):
  model.json      - Report 1: StandardScaler + MLP weights, run in the browser
  analytics.json  - Report 1: model comparison, surface / rank-gap / yearly splits
  model_v2.json   - Report 2: the final logistic regression the predictor runs
  report2.json    - Report 2: the feature ladder, significance tests, Elo ratings
  players.json    - the ATP snapshot used by the predictor, enriched with career
                    records, head-to-head results and current Elo ratings
"""

from __future__ import annotations

import json
import unicodedata
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, log_loss, roc_auc_score, roc_curve
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

import report2

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "atp_2000_2024_model_ready.csv"
MODEL_PATH = ROOT / "model.joblib"
OUT_DIR = ROOT / "web" / "src" / "data"
FEATURES = ["rank_diff", "points_diff", "age_diff", "height_diff"]

# The ATP snapshot the app predicts on. Ranking / points / age / height are the
# author's original figures; everything else on the player card is derived below.
ROSTER = [
    {"name": "Jannik Sinner", "rank": 1, "points": 13450, "age": 23, "height": 190, "country": "ITA"},
    {"name": "Carlos Alcaraz", "rank": 2, "points": 8160, "age": 22, "height": 188, "country": "ESP"},
    {"name": "Alexander Zverev", "rank": 3, "points": 8120, "age": 27, "height": 198, "country": "GER"},
    {"name": "Félix Auger-Aliassime", "rank": 4, "points": 4740, "age": 24, "height": 193, "country": "CAN"},
    {"name": "Novak Djokovic", "rank": 5, "points": 3760, "age": 38, "height": 188, "country": "SRB"},
    {"name": "Daniil Medvedev", "rank": 6, "points": 3620, "age": 29, "height": 198, "country": "RUS"},
    {"name": "Alex de Minaur", "rank": 7, "points": 3560, "age": 25, "height": 183, "country": "AUS"},
    {"name": "Taylor Fritz", "rank": 8, "points": 3400, "age": 27, "height": 193, "country": "USA"},
    {"name": "Flavio Cobolli", "rank": 9, "points": 3330, "age": 22, "height": 185, "country": "ITA"},
    {"name": "Ben Shelton", "rank": 10, "points": 2680, "age": 22, "height": 196, "country": "USA"},
    {"name": "Alexander Bublik", "rank": 11, "points": 2535, "age": 27, "height": 190, "country": "KAZ"},
    {"name": "Jakub Menšík", "rank": 12, "points": 2380, "age": 23, "height": 188, "country": "CZE"},
    {"name": "Lorenzo Musetti", "rank": 13, "points": 2375, "age": 22, "height": 186, "country": "ITA"},
    {"name": "Casper Ruud", "rank": 14, "points": 2345, "age": 26, "height": 183, "country": "NOR"},
    {"name": "Rubén Jódar", "rank": 15, "points": 2243, "age": 21, "height": 183, "country": "ESP"},
]


def slug(name: str) -> str:
    """Accent-insensitive key so 'Jakub Menšík' matches 'Jakub Mensik' in the CSV."""
    stripped = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return "".join(ch.lower() for ch in stripped if ch.isalnum() or ch == " ").replace(" ", "")


def r(value, digits: int = 4):
    """Round for JSON, turning numpy scalars and NaN into plain Python."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    return round(float(value), digits)


# --------------------------------------------------------------------------
# 1. Model weights -> JSON (so the browser can run the network itself)
# --------------------------------------------------------------------------
def export_model() -> dict:
    pipeline = joblib.load(MODEL_PATH)
    scaler = pipeline.named_steps["scaler"]
    mlp = pipeline.named_steps["mlp"]

    return {
        "features": FEATURES,
        "scaler": {"mean": [r(v, 8) for v in scaler.mean_], "scale": [r(v, 8) for v in scaler.scale_]},
        "layers": [
            {
                "weights": [[r(w, 6) for w in row] for row in coef],
                "bias": [r(b, 6) for b in bias],
                "activation": "relu" if i < len(mlp.coefs_) - 1 else mlp.out_activation_,
            }
            for i, (coef, bias) in enumerate(zip(mlp.coefs_, mlp.intercepts_))
        ],
        "architecture": {
            "hidden": list(mlp.hidden_layer_sizes),
            "iterations": int(mlp.n_iter_),
            "classes": [int(c) for c in mlp.classes_],
        },
    }


# --------------------------------------------------------------------------
# 2. Research analytics, recomputed on the time-aware split
# --------------------------------------------------------------------------
def export_analytics(df: pd.DataFrame) -> dict:
    df = df.sort_values("tourney_date").reset_index(drop=True)
    cut = int(len(df) * 0.8)
    train, test = df.iloc[:cut], df.iloc[cut:]

    X_train, y_train = train[FEATURES], train["target"].astype(int)
    X_test, y_test = test[FEATURES], test["target"].astype(int)

    scaler = StandardScaler().fit(X_train)
    Xs_train, Xs_test = scaler.transform(X_train), scaler.transform(X_test)

    print(f"  train {len(train):,}  test {len(test):,}")

    baseline_pred = (test["rank_diff"] < 0).astype(int)
    baseline_acc = accuracy_score(y_test, baseline_pred)

    logreg = LogisticRegression(max_iter=1000).fit(X_train, y_train)
    tree = DecisionTreeClassifier(max_depth=4, random_state=42).fit(X_train, y_train)
    forest = RandomForestClassifier(n_estimators=200, max_depth=8, random_state=42, n_jobs=-1).fit(X_train, y_train)
    gb = GradientBoostingClassifier(max_depth=3, random_state=42).fit(X_train, y_train)
    knn = KNeighborsClassifier(n_neighbors=15).fit(Xs_train, y_train)
    svm = LinearSVC(max_iter=5000).fit(Xs_train, y_train)
    nn = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=400, random_state=42,
                       early_stopping=True, n_iter_no_change=20).fit(Xs_train, y_train)

    fitted = [
        ("baseline", "Favourite wins", "heuristic", baseline_pred, None),
        ("logreg", "Logistic regression", "linear", logreg.predict(X_test), logreg.predict_proba(X_test)[:, 1]),
        ("tree", "Decision tree", "tree", tree.predict(X_test), tree.predict_proba(X_test)[:, 1]),
        ("forest", "Random forest", "ensemble", forest.predict(X_test), forest.predict_proba(X_test)[:, 1]),
        ("boosting", "Gradient boosting", "ensemble", gb.predict(X_test), gb.predict_proba(X_test)[:, 1]),
        ("knn", "K-nearest neighbours", "instance", knn.predict(Xs_test), knn.predict_proba(Xs_test)[:, 1]),
        ("svm", "Linear SVM", "linear", svm.predict(Xs_test), None),
        ("nn", "Neural network", "network", nn.predict(Xs_test), nn.predict_proba(Xs_test)[:, 1]),
    ]

    models = []
    for key, name, family, pred, proba in fitted:
        models.append({
            "key": key,
            "name": name,
            "family": family,
            "accuracy": r(accuracy_score(y_test, pred)),
            "lift": r(accuracy_score(y_test, pred) - baseline_acc),
            "auc": r(roc_auc_score(y_test, proba)) if proba is not None else None,
            "logLoss": r(log_loss(y_test, proba)) if proba is not None else None,
        })
    print("  " + "  ".join(f"{m['key']}={m['accuracy']:.3f}" for m in models))

    # The neural network is the model shipped in the app, so the deeper
    # diagnostics below all describe it.
    nn_proba = nn.predict_proba(Xs_test)[:, 1]
    nn_pred = nn.predict(Xs_test)
    tn, fp, fn, tp = confusion_matrix(y_test, nn_pred).ravel()

    # Reliability: does a stated 70% actually win 70% of the time?
    edges = np.arange(0.0, 1.01, 0.05)
    bins = np.clip(np.digitize(nn_proba, edges) - 1, 0, len(edges) - 2)
    calibration = []
    for b in range(len(edges) - 1):
        mask = bins == b
        if mask.sum() < 40:
            continue
        calibration.append({
            "predicted": r(nn_proba[mask].mean()),
            "actual": r(y_test.to_numpy()[mask].mean()),
            "count": int(mask.sum()),
        })

    fpr, tpr, _ = roc_curve(y_test, nn_proba)
    idx = np.unique(np.linspace(0, len(fpr) - 1, 80).astype(int))
    roc = [{"fpr": r(fpr[i], 4), "tpr": r(tpr[i], 4)} for i in idx]

    # Predictability against the size of the ranking gap.
    gap = test["rank_diff"].abs()
    gap_edges = [(0, 3), (3, 8), (8, 15), (15, 30), (30, 60), (60, 120), (120, 10**6)]
    gap_labels = ["0–3", "4–8", "9–15", "16–30", "31–60", "61–120", "120+"]
    rank_gap = []
    for (lo, hi), label in zip(gap_edges, gap_labels):
        mask = (gap > lo) & (gap <= hi) if lo else (gap <= hi)
        mask = mask.to_numpy()
        if mask.sum() == 0:
            continue
        rank_gap.append({
            "label": label,
            "matches": int(mask.sum()),
            "baseline": r(accuracy_score(y_test[mask], baseline_pred[mask])),
            "model": r(accuracy_score(y_test[mask], nn_pred[mask])),
        })

    # Full-dataset splits (all 25 seasons, not just the test window).
    by_surface = []
    for surface, group in df.groupby("surface"):
        if len(group) < 500:
            continue
        by_surface.append({
            "surface": surface,
            "matches": int(len(group)),
            "favoriteWinRate": r(group["favorite_won"].mean()),
            "avgMinutes": r(group["minutes"].mean(), 1),
            "avgAces": r(group[["w_ace", "l_ace"]].sum(axis=1).mean(), 1),
        })
    by_surface.sort(key=lambda s: -s["matches"])

    by_year = [
        {
            "year": int(year),
            "matches": int(len(group)),
            "favoriteWinRate": r(group["favorite_won"].mean()),
        }
        for year, group in df.groupby("year")
    ]

    level_names = {"G": "Grand Slam", "M": "Masters 1000", "A": "ATP Tour", "D": "Davis Cup", "F": "Tour Finals"}
    by_level = []
    for level, group in df.groupby("tourney_level"):
        if len(group) < 500:
            continue
        by_level.append({
            "level": level_names.get(level, str(level)),
            "matches": int(len(group)),
            "favoriteWinRate": r(group["favorite_won"].mean()),
        })
    by_level.sort(key=lambda s: -s["favoriteWinRate"])

    # Which of the four inputs is actually carrying the model?
    coefs = LogisticRegression(max_iter=1000).fit(Xs_train, y_train).coef_[0]
    perm = permutation_importance(nn, Xs_test, y_test, n_repeats=5, random_state=42, n_jobs=-1)
    labels = {
        "rank_diff": "Ranking gap",
        "points_diff": "ATP points gap",
        "age_diff": "Age gap",
        "height_diff": "Height gap",
    }
    importance = [
        {
            "feature": f,
            "label": labels[f],
            "logregCoef": r(c),
            "treeImportance": r(t),
            "permutation": r(p),
        }
        for f, c, t, p in zip(FEATURES, coefs, tree.feature_importances_, perm.importances_mean)
    ]

    return {
        "dataset": {
            "matches": int(len(df)),
            "trainMatches": int(len(train)),
            "testMatches": int(len(test)),
            "firstYear": int(df["year"].min()),
            "lastYear": int(df["year"].max()),
            "players": int(pd.concat([df["winner_name"], df["loser_name"]]).nunique()),
            "tournaments": int(df["tourney_name"].nunique()),
            "upsetRate": r(1 - df["favorite_won"].mean()),
            "favoriteWinRate": r(df["favorite_won"].mean()),
        },
        "models": models,
        "neuralNetwork": {
            "accuracy": r(accuracy_score(y_test, nn_pred)),
            "auc": r(roc_auc_score(y_test, nn_proba)),
            "logLoss": r(log_loss(y_test, nn_proba)),
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "calibration": calibration,
            "roc": roc,
        },
        "rankGap": rank_gap,
        "bySurface": by_surface,
        "byYear": by_year,
        "byLevel": by_level,
        "importance": importance,
    }


# --------------------------------------------------------------------------
# 3. Player cards: career records + head-to-head, mined from the same matches
# --------------------------------------------------------------------------
def export_players(df: pd.DataFrame) -> list[dict]:
    df = df.copy()
    df["w_key"] = df["winner_name"].map(slug)
    df["l_key"] = df["loser_name"].map(slug)
    keys = {slug(p["name"]): p for p in ROSTER}

    players = []
    for player in ROSTER:
        key = slug(player["name"])
        wins = df[df["w_key"] == key]
        losses = df[df["l_key"] == key]
        played = len(wins) + len(losses)

        card = dict(player)
        card["id"] = key

        if played == 0:
            print(f"  {player['name']:<26} no matches in 2000-2024 data")
            card["career"] = None
            card["h2h"] = {}
            players.append(card)
            continue

        surfaces = {}
        for surface in ["Hard", "Clay", "Grass"]:
            w = int((wins["surface"] == surface).sum())
            l = int((losses["surface"] == surface).sum())
            if w + l:
                surfaces[surface] = {"wins": w, "losses": l, "winRate": r(w / (w + l), 3)}

        top10_w = int((wins["loser_rank"] <= 10).sum())
        top10_l = int((losses["winner_rank"] <= 10).sum())
        years = pd.concat([wins["year"], losses["year"]])

        card["career"] = {
            "matches": played,
            "wins": len(wins),
            "losses": len(losses),
            "winRate": r(len(wins) / played, 3),
            "titles": int((wins["round"] == "F").sum()),
            "finals": int((wins["round"] == "F").sum() + (losses["round"] == "F").sum()),
            "bestRank": int(min(wins["winner_rank"].min(), losses["loser_rank"].min())),
            "firstYear": int(years.min()),
            "lastYear": int(years.max()),
            "surfaces": surfaces,
            "bestSurface": max(surfaces.items(), key=lambda kv: (kv[1]["winRate"], kv[1]["wins"]))[0] if surfaces else None,
            "vsTop10": {"wins": top10_w, "losses": top10_l},
            "avgAces": r(pd.concat([wins["w_ace"], losses["l_ace"]]).mean(), 1),
            "grandSlamWins": int((wins["tourney_level"] == "G").sum()),
        }

        h2h = {}
        for opponent_key in keys:
            if opponent_key == key:
                continue
            w = int((wins["l_key"] == opponent_key).sum())
            l = int((losses["w_key"] == opponent_key).sum())
            if w + l:
                last = pd.concat([
                    wins[wins["l_key"] == opponent_key].assign(won=True),
                    losses[losses["w_key"] == opponent_key].assign(won=False),
                ]).sort_values("tourney_date").iloc[-1]
                h2h[opponent_key] = {
                    "wins": w,
                    "losses": l,
                    "lastMeeting": {
                        "year": int(last["year"]),
                        "tournament": str(last["tourney_name"]),
                        "surface": str(last["surface"]),
                        "round": str(last["round"]),
                        "score": str(last["score"]),
                        "won": bool(last["won"]),
                    },
                }
        card["h2h"] = h2h
        print(f"  {player['name']:<26} {len(wins):>4}W {len(losses):>4}L   {len(h2h)} rivalries")
        players.append(card)

    return players


def write_json(name: str, payload, indent: int | None = None) -> None:
    (OUT_DIR / name).write_text(
        json.dumps(payload, indent=indent, ensure_ascii=False), encoding="utf-8", newline="\n"
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(DATA_PATH, parse_dates=["tourney_date"])
    print(f"Loaded {len(df):,} matches")

    print("Report 1: exporting the neural network...")
    write_json("model.json", export_model())

    print("Report 1: computing analytics (training 7 models)...")
    analytics = export_analytics(df)
    write_json("analytics.json", analytics, indent=1)

    print("Report 2: building Elo features and fitting the ladder...")
    report, model_v2, ratings, matches = report2.build(DATA_PATH, analytics)
    write_json("report2.json", report, indent=1)
    write_json("model_v2.json", model_v2)

    print("Building player cards...")
    players = export_players(df)
    report2.attach_ratings(players, ratings, matches, key=slug)
    write_json("players.json", players, indent=1)

    for f in sorted(OUT_DIR.glob("*.json")):
        print(f"  {f.name:<16} {f.stat().st_size / 1024:>7.1f} KB")


if __name__ == "__main__":
    main()
