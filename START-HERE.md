# CourtVision — installing the new interface

This is a drop-in replacement for the front end of your Tennis-Match-Predictor
repo. The model, the dataset and the notebook are untouched — this only changes
what people see.

**You do not need to install Node, npm, or anything new.** The interface is
already built. You only need Node if you later want to change the design, which
is covered at the bottom.

---

## What's in here

Everything in this folder mirrors where it goes in your repo, so you can copy
the whole lot in one go.

| File | What it is |
| --- | --- |
| `app.py` | **Replaces yours.** Now a small shell that serves the new interface. |
| `requirements.txt` | **Replaces yours.** See the note below — this is deliberate. |
| `requirements-train.txt` | New. The packages you need for the notebook and retraining. |
| `README.md` | **Replaces yours.** Rewritten for the new setup. |
| `.gitignore` | New. Keeps `node_modules/` out of git. |
| `tools/export_data.py` | New. Regenerates everything the site displays from your dataset. |
| `web/` | New. The interface — source code plus the built bundle. |

Nothing else in your repo changes. `model.joblib`, `data/`, `charts/`,
`train_model.py` and `tennis_predictor.ipynb` all stay exactly as they are.

---

## Install it

### 1. Copy the files in

Unzip this, then copy everything into the root of your local repo — the folder
that already contains `app.py` and `model.joblib`. Say **yes** when Windows or
macOS asks whether to replace `app.py`, `requirements.txt` and `README.md`.
Replacing them is the point.

> **Watch out for `.gitignore`.** Files starting with a dot are hidden by
> default. On Windows tick *View → Hidden items* in File Explorer; on macOS
> press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>.</kbd> in Finder. If you miss
> it, nothing breaks today, but it's there to stop you accidentally committing a
> couple of hundred megabytes later.

Afterwards your repo root should look like this:

```text
app.py                 <- replaced
requirements.txt       <- replaced
requirements-train.txt <- new
README.md              <- replaced
.gitignore             <- new
tools/                 <- new
web/                   <- new
model.joblib           <- unchanged
data/                  <- unchanged
charts/                <- unchanged
train_model.py         <- unchanged
tennis_predictor.ipynb <- unchanged
```

### 2. Check it runs on your machine

```bash
pip install -r requirements.txt
streamlit run app.py
```

Your browser should open the new interface. Click **Serve it up** to make a
prediction and switch to the **Research** tab to check the charts draw. If that
works locally, it will work once deployed.

### 3. Push it

```bash
git add -A
git commit -m "Redesign the interface"
git push
```

While you're here, one bit of tidying is worth doing. Your repo has a stale
`__pycache__/app.cpython-310.pyc` committed to it — a compiled copy of the
*old* `app.py`. Python ignores it, but it does not belong in version control:

```bash
git rm -r --cached __pycache__
```

The new `.gitignore` stops it coming back. Then commit and push as above.

Streamlit Cloud watches your repo and redeploys on its own — usually within a
minute or two. You do not need to change any settings there: the app is still
`app.py`, so the main-file path it already points at is still correct.

If the old version is still showing after a few minutes, open your app on
[share.streamlit.io](https://share.streamlit.io), find it in the list, and use
the **⋮ → Reboot app** menu to force a fresh build.

---

## Two things worth understanding

### Why `requirements.txt` got so much shorter

It now contains only `streamlit`.

The trained network's weights have been exported to a JSON file that the
browser reads directly, so predictions are computed in the page rather than in
Python. Nothing on the server needs pandas, numpy or scikit-learn any more.
That makes the deployed app start faster and removes a whole class of
dependency-version problems on Streamlit Cloud.

When you want to run the notebook or retrain the model, install the fuller set
instead:

```bash
pip install -r requirements-train.txt
```

### `web/dist/index.html` has to stay committed

Streamlit Cloud installs Python packages and runs `app.py`. It never runs
`npm run build`. So the already-built interface has to be in the repository, or
the deployed app has nothing to serve.

This matters in one situation only: **if you edit anything under `web/src/`, you
must rebuild before committing**, or the deployed site will still show the old
version. See below.

---

## If you want to change the design later

Only then do you need [Node.js](https://nodejs.org) (any version 18 or newer).

```bash
cd web
npm install       # first time only
npm run dev       # opens http://localhost:5173 with instant reload
```

Edit files under `web/src/` and the browser updates as you save. When you're
happy:

```bash
npm run build     # rewrites web/dist/index.html
cd ..
git add -A
git commit -m "Tweak the interface"
git push
```

Rough map of the source:

```text
web/src/components/court/      the match predictor
web/src/components/research/   the written report
web/src/components/charts/     the figures
web/src/styles/tokens.css      colours, fonts, spacing — start here
web/src/data/                  generated JSON — don't edit by hand
```

### Regenerating the numbers

`web/src/data/` is written by `tools/export_data.py`. If you retrain the model
or change the dataset, rerun it so the site matches:

```bash
pip install -r requirements-train.txt
python train_model.py         # refits model.joblib
python tools/export_data.py   # rewrites web/src/data/
cd web && npm run build       # bakes the new numbers into the bundle
```

---

## Two data notes

While wiring the player cards to the match archive, two entries in the player
list didn't line up:

- **Alexander Bublik** was spelled "Alexandre" in the old app, so his record
  never matched the dataset. Fixed.
- **"Rubén Jódar"** at rank 15 does not appear anywhere in the 2000–2024
  archive, and there is no ATP player by that name. The interface handles it
  gracefully — his card just says there's no match history — but you'll probably
  want to swap him for a real player. The list lives in the `ROSTER` block near
  the top of `tools/export_data.py`; edit it there, rerun the export, and
  rebuild.

Neither affects the model or any figure in the report.
