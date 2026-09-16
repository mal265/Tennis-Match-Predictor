# CourtVision — Predicting ATP Match Outcomes with Machine Learning

**Author: Roman Belchikov**

👉 Check the demo at: https://tennismatchpredictor.streamlit.app/

Can the winner of an ATP match be predicted from what is known before the first
serve? This project answers in two parts, using 71,463 matches from 2000 to
May 2024.

- **Report 1 — The ranking ceiling.** Eight models on four static inputs:
  ranking, ranking points, age and height. Every one lands within a point of the
  rule "the higher-ranked player wins".
- **Report 2 — Changing the inputs.** Report 1's simplest model, logistic
  regression, given five inputs built from match history instead: Elo rating,
  surface Elo, head-to-head, rest and experience. This is the model behind the
  live predictor.

The site pairs an interactive match predictor, which runs Report 2's model in the
browser, with both reports. Every figure is computed from the dataset or a trained
model; nothing is illustrative.

---

## Results

Every accuracy below is measured on the same 14,293 most recent matches, using a
chronological 80/20 split.

### Report 1 — four static inputs

| Model | Accuracy |
| --- | ---: |
| Logistic regression | 64.2% |
| Linear SVM | 64.2% |
| Neural network | 64.2% |
| Random forest | 64.1% |
| Gradient boosting | 64.1% |
| Decision tree | 63.7% |
| **Baseline (favourite wins)** | **63.7%** |
| K-nearest neighbours | 62.9% |

A linear model, a tree ensemble and a neural network all converge on the same
number, which points to the limit being in the inputs rather than the algorithm.

### Report 2 — ratings built from match history

All rows are logistic regressions. "+" rows add one input to Elo and surface Elo.

| Inputs | Accuracy | Lift over baseline | 95% interval |
| --- | ---: | ---: | ---: |
| Report 1's four inputs | 64.23% | +0.57 | +0.16 to +0.99 |
| Elo | 64.25% | +0.59 | −0.11 to +1.29 |
| Elo + surface Elo | 64.61% | +0.95 | +0.22 to +1.68 |
| + recent form | 64.46% | +0.80 | +0.08 to +1.53 |
| + head-to-head | 64.72% | +1.06 | +0.34 to +1.78 |
| + rest days | 64.79% | +1.13 | +0.41 to +1.85 |
| + experience | 64.68% | +1.02 | +0.30 to +1.75 |
| **Final: Elo, surface Elo, head-to-head, rest, experience** | **64.95%** | **+1.29** | **+0.57 to +2.02** |

Intervals come from a paired bootstrap on the same matches. Findings:

- The final model's gain over the baseline is clear (McNemar p < 0.001).
- Against Report 1's model directly, it gains +0.72 points of accuracy, which is
  suggestive but not conclusive (p = 0.06). Its probabilities are measurably
  sharper, though: log loss improves from 0.6313 to 0.6212 (p < 0.001).
- The gain concentrates in close matches. Between players within eight ranking
  places, it adds roughly 3.6 to 4.2 points.
- Recent form made the model worse, most likely because Elo already reflects it.
- Elo on its own, with no model at all ("the higher Elo wins"), scores 64.16% —
  the same as Report 1's neural network.

---

## Running it

The interface is a React app built from `web/`. Streamlit serves the built
bundle:

```bash
pip install -r requirements.txt
streamlit run app.py
```

If `web/dist/index.html` is missing, build it once:

```bash
cd web && npm install && npm run build
```

### Working on the UI

`npm run dev` gives hot reload without going through Streamlit:

```bash
cd web && npm run dev
```

Rebuild before committing, because Streamlit serves the built file:

```bash
cd web && npm run build
```

### Retraining and regenerating the data

```bash
pip install -r requirements-train.txt
python train_model.py            # refits Report 1's network (model.joblib)
python tools/export_data.py      # rebuilds both reports and the predictor's data
cd web && npm run build          # bakes the new numbers into the site
```

`tools/export_data.py` is the single source of truth for every number on the
site. For Report 1 it exports the network's weights and refits all eight models.
For Report 2 it rebuilds the rating features, refits the ladder of logistic
regressions, runs the significance tests, and exports the final model's
coefficients. It also re-derives the results printed in
`tennis_predictor_v2.ipynb` on every run and reports any that no longer match.

---

## How it works

**Report 2's features** are built by walking the archive in date order. For each
match, the code first reads each player's current state and only then updates it
with the result, so no feature contains the outcome it is used to predict.

- **Elo** starts every player at 1,500. After each match the winner takes points
  from the loser in proportion to how surprising the result was, with a step size
  of `K = 250 / (matches + 5)^0.4` that shrinks as a player's match count grows.
- **Surface Elo** applies the same rule separately on each surface.
- **Head-to-head** is prior wins minus prior losses against the same opponent.
- **Rest** is days since each player's last match; **experience** is career
  matches played.

**In the browser**, the predictor evaluates the final logistic regression
directly from its exported coefficients, so it is the same arithmetic the report
evaluates. Report 1's neural network is exported too, so Report 1's figures are
drawn from the network they describe. Both match scikit-learn's own predictions.

---

## Data

Jeff Sackmann's ATP archive, 2000 to May 2024: 71,463 matches, 2,096 players and
1,740 tournaments after dropping rows missing a surface or either ranking.
Missing heights are filled with the column median.

Each match is reduced to player-A-minus-player-B differences, with player A
assigned by a seeded coin flip, so a model learns which *gap* wins rather than
which name.

The split is chronological, not random: models train on the earliest 57,170
matches and are tested on the most recent 14,293. Shuffling would let a model
train on 2023 and predict 2019, which is hindsight rather than forecasting.

### What the models still cannot see

Injuries and withdrawals, fatigue within a tournament, serve and return
statistics (recorded only after a match), and anything that happens on the day.
Ratings also stay frozen while a player is absent.

---

## Repository structure

```text
├── app.py                        Streamlit entry point — serves the built site
├── train_model.py                Refits Report 1's network (model.joblib)
├── model.joblib                  Report 1's trained scaler + neural network
├── tennis_predictor.ipynb        Report 1: exploration and model comparison
├── tennis_predictor_v2.ipynb     Report 2: Elo and match-history features
├── tools/
│   ├── export_data.py            Builds every JSON file the site reads
│   ├── elo_features.py           Report 2's features, ported from the notebook
│   └── report2.py                Report 2's ladder, significance tests, ratings
├── data/                         Cleaned ATP match archive
├── charts/                       Original matplotlib figures
└── web/                          React + TypeScript interface
    ├── src/
    │   ├── components/court/        The match predictor
    │   ├── components/research/     Report 1 and Report 2
    │   ├── components/charts/       Custom SVG figures for both reports
    │   ├── lib/elo-model.ts         In-browser Report 2 model (powers the predictor)
    │   ├── lib/model.ts             In-browser Report 1 network
    │   └── data/                    Generated JSON — do not edit by hand
    └── dist/index.html           Built site — committed, because Streamlit
                                  Community Cloud does not run npm
```

---

## Deploying

Streamlit Community Cloud installs `requirements.txt` and runs `app.py`. It does
**not** run `npm run build`, so `web/dist/index.html` must be committed. Rebuild
and commit it whenever anything under `web/src/` changes.
