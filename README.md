# Predicting ATP Tennis Match Outcomes

A comparison of machine learning models for predicting the winner of professional
men's tennis matches from information known before the match.

**TL;DR:** Seven models (from logistic regression to a neural network) all reach
about 64-66% accuracy, barely above a simple "the favorite wins" baseline. The
ranking gap between two players carries almost all of the predictive signal, and
the rest is close to irreducible upset randomness.

---

## 1. Question
Can we predict who wins an ATP match using only pre-match information such as the
players' rankings, ages, and heights? And does a more sophisticated model beat a
simple ranking-based rule?

## 2. Data
- Source: Jeff Sackmann's ATP dataset (via the guillemservera Kaggle mirror).
- Size: ~71,000 matches from 2000 to 2024, one row per match.
- Each row lists the winner and loser with their pre-match stats (ranking, ranking
  points, age, height, surface, round, best-of) and post-match stats (aces, etc.).
- Cleaning: dropped matches missing a ranking or surface; filled missing heights
  with the median. (Post-match stats are deliberately NOT used, see Method.)

## 3. Method
- **Avoiding leakage:** only pre-match information is used as input. Post-match
  stats like aces would leak the result.
- **Framing:** the two players are relabeled A and B at random, and the model
  predicts whether player A wins (a balanced 50/50 target), so it must learn from
  the features rather than the column layout.
- **Features:** differences between the two players, `rank_diff`, `points_diff`,
  `age_diff`, `height_diff` (plus surface and best-of in one experiment).
- **Split:** trained on earlier matches, tested on later ones (a time-based split),
  which mirrors real prediction.
- **Models compared:** a favorite-wins baseline, logistic regression, decision
  tree, random forest, gradient boosting, k-nearest neighbors, a linear SVM, and a
  neural network. Evaluated with accuracy and cross-validation.

## 4. Results

| Model | Accuracy |
| --- | --- |
| Baseline (favorite wins) | 0.637 |
| Logistic regression | 0.642 |
| Decision tree | 0.637 |
| Random forest | 0.641 |
| Gradient boosting | 0.641 |
| KNN | 0.629 |
| Linear SVM | 0.642 |
| Neural network | 0.642 |

![Model accuracy vs baseline](charts/model_comparison.png)
![Favorite win rate by surface](charts/favorite_win_rate.png)

Cross-validation confirmed these numbers are stable to within about a percentage point.

## 5. Findings
- All seven models land within a couple of points of each other and of the baseline.
- The ranking gap is by far the most important feature; ranking points carry the
  same information (they agree on the favorite ~100% of the time).
- Adding surface and match format barely changed accuracy.
- Together this points to a real predictability ceiling: ranking explains most of
  what is predictable, and upsets impose a hard limit no model beats.

## 6. Limitations
- Uses only simple pre-match features; no recent form, head-to-head, or
  surface-specific strength.
- Merges 25 seasons, over which the ranking-points system changed.
- Predicts only a binary winner; ignores injuries, retirements, and match context.

## 7. How to Run
```
pip install -r requirements.txt
```
Then open `tennis_predictor.ipynb` and run all cells top to bottom.

## 8. Repository Structure
```
tennis-match-predictor/
├── README.md
├── tennis_predictor.ipynb
├── requirements.txt
├── data/            # dataset (or a note on where to download it)
└── charts/          # exported figures used above
```
