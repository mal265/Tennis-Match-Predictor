# CourtVision — Predicting ATP Match Outcomes with Machine Learning

**Watch this project live at https://tennismatchpredictor.streamlit.app/**

**Author: Roman Belchikov**

Can the winner of an ATP match be predicted from what is known before the first
serve? This project tests eight models against 71,463 matches and a stubborn
baseline — "the higher-ranked player wins" — and reports how little the machine
learning actually adds.

The result is a two-part site: an interactive match predictor that runs the
trained neural network in your browser, and a research report where every figure
is computed from the dataset rather than illustrated.

---

## Key result

| Model | Accuracy | vs baseline |
| --- | ---: | ---: |
| Logistic regression | 64.2% | +0.6 pts |
| Linear SVM | 64.2% | +0.5 pts |
| Neural network (32–16) | 64.2% | +0.5 pts |
| Random forest | 64.1% | +0.5 pts |
| Gradient boosting | 64.1% | +0.4 pts |
| Decision tree | 63.7% | +0.0 pts |
| **Baseline (favourite wins)** | **63.7%** | — |
| K-nearest neighbours | 62.9% | −0.7 pts |

Accuracy on 14,293 held-out matches under a chronological 80/20 split.

A linear model, a tree ensemble and a neural network all converge on the same
number. That is the finding: the ceiling is in the data, not in the algorithm.
Ranking information dominates, age and height are close to noise, and roughly a
third of professional matches are won by the player who was not supposed to win —
a share that has not moved in 25 seasons.

---

## Running it

The interface is a React app built from `web/`. Streamlit serves the built
bundle, so the familiar command still works:

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

Then rebuild before committing, since Streamlit serves the built file:

```bash
cd web && npm run build
```

### Retraining and regenerating the data

```bash
pip install -r requirements-train.txt
python train_model.py            # refits model.joblib
python tools/export_data.py      # regenerates everything the site displays
```

`tools/export_data.py` is the single source of truth for the site's numbers. It
exports the scaler and network weights to JSON for in-browser inference, refits
all eight models on the time-aware split, and mines player career records and
head-to-head results out of the same match archive.

---

## How it works

The trained scikit-learn pipeline is a `StandardScaler` feeding an
`MLPClassifier` with hidden layers of 32 and 16 units. Rather than call Python
for every prediction, the export script writes the scaler statistics and the
network's weights to `web/src/data/model.json`, and the browser runs the forward
pass directly — matching scikit-learn's own output to within 1e-6.

That is why the app is fully static and why the predictor and every figure in
the report are driven by exactly the same model.

---

## Data and method

Jeff Sackmann's ATP archive, 2000–2024: 71,463 matches, 2,096 players, 1,740
tournaments after dropping rows missing a surface or either ranking. Missing
heights are filled with the column median.

Each match is reduced to four player-A-minus-player-B differences —
`rank_diff`, `points_diff`, `age_diff`, `height_diff` — with player A assigned by
a seeded coin flip, so the model learns which *gap* wins rather than which name.

The split is chronological, not random: models train on the earliest 57,170
matches and are tested on the most recent 14,293. Shuffling would let a model
train on 2023 and predict 2019, which is hindsight rather than forecasting.

### What the model cannot see

Recent form, head-to-head history, surface-specific ability, injuries, fatigue
and travel — none of it is available to the model. That omission is where the
remaining predictive performance is hiding, and it is the obvious next version of
this project.

---

## Repository structure

```text
├── app.py                     Streamlit entry point — serves the built UI
├── train_model.py             Refits model.joblib
├── model.joblib               Trained scaler + neural network
├── tools/
│   └── export_data.py         Exports weights, analytics and player data as JSON
├── data/                      Cleaned ATP match archive
├── tennis_predictor.ipynb     Original exploration and model comparison
├── charts/                    Original matplotlib figures
└── web/                       React + TypeScript interface
    ├── src/
    │   ├── components/court/     The match predictor
    │   ├── components/research/  The research report
    │   ├── components/charts/    Custom SVG figures
    │   ├── lib/model.ts          In-browser inference
    │   └── data/                 Generated JSON (do not edit by hand)
    └── dist/index.html        Built bundle — committed, since Streamlit
                               Community Cloud does not run npm
```

---

## Deploying

Streamlit Community Cloud installs `requirements.txt` and runs `app.py`. It does
**not** run `npm run build`, so `web/dist/index.html` must be committed. Rebuild
and commit it whenever anything under `web/src/` changes.
