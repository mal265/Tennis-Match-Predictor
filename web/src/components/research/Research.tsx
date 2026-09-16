import analytics from '../../data/analytics.json'
import { architecture } from '../../lib/model'
import { num, pct } from '../../lib/format'
import { useActiveSection } from '../../lib/hooks'
import type { Analytics } from '../../lib/types'
import {
  ConfusionMatrix,
  ImportanceChart,
  ModelComparison,
} from '../charts/ModelCharts'
import { LevelChart, RankGapChart, SurfaceChart, YearChart } from '../charts/DataCharts'
import { CalibrationChart, ResponseCurve, RocChart } from '../charts/ConfidenceCharts'
import { ArrowIcon } from '../Icons'
import { Callout, Fact, Method, Pullquote, Section } from './parts'
import SeriesNav from './SeriesNav'

const data = analytics as Analytics
const nn = data.neuralNetwork
const best = [...data.models].sort((a, b) => b.accuracy - a.accuracy)[0]
const worst = [...data.models].sort((a, b) => a.accuracy - b.accuracy)[0]
const baseline = data.models[0].accuracy
const easiest = data.rankGap[data.rankGap.length - 1]
const hardest = data.rankGap[0]

const SECTIONS = [
  { id: 'question', label: 'The question' },
  { id: 'data', label: 'The data' },
  { id: 'scoreboard', label: 'The scoreboard' },
  { id: 'signal', label: 'Where the signal is' },
  { id: 'easy', label: 'When it gets easy' },
  { id: 'confidence', label: 'Trusting the number' },
  { id: 'ceiling', label: 'The ceiling' },
  { id: 'limits', label: 'Limits' },
  { id: 'verdict', label: 'Verdict' },
]

export default function Research({ onOpenReport }: { onOpenReport: (report: 1 | 2) => void }) {
  const active = useActiveSection(SECTIONS.map((s) => s.id))

  return (
    <article className="research">
      {/* ---------------------------------------------------------------- */}
      <header className="rhero">
        <div className="page rhero__inner">
          <p className="kicker">Report 1 of 2 · Roman Belchikov</p>
          <h1 className="rhero__title display">
            Rankings already know
            <br />
            <em>almost everything</em>
          </h1>
          <p className="rhero__standfirst">
            Eight models, {num(data.dataset.matches)} ATP matches and four pre-match numbers. The
            best of them beat “just pick the higher-ranked player” by{' '}
            {(best.lift * 100).toFixed(1)} percentage points. This is the story of why that number
            is so small — and why that is the interesting result, not the disappointing one.
          </p>

          <dl className="rhero__facts">
            <Fact term="Matches analysed" detail={`${data.dataset.firstYear}–${data.dataset.lastYear}`}>
              {num(data.dataset.matches)}
            </Fact>
            <Fact term="Baseline accuracy" detail="higher rank wins">
              {pct(baseline, 1)}
            </Fact>
            <Fact term="Best model" detail={best.name.toLowerCase()}>
              {pct(best.accuracy, 1)}
            </Fact>
            <Fact term="Matches won by the underdog" detail="the irreducible part">
              {pct(data.dataset.upsetRate, 1)}
            </Fact>
          </dl>
        </div>
      </header>

      <SeriesNav current={1} onOpen={onOpenReport} />

      <div className="page research__layout">
        {/* -------------------------------------------------------------- */}
        <nav className="toc" aria-label="Report contents">
          <p className="toc__title kicker">Contents</p>
          <ol className="toc__list">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id}>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="research__body">
          {/* ============================================================ */}
          <Section id="question" eyebrow="01" title="The question">
            <p className="lead">
              Before a match starts, what do we actually know? A ranking, a points total, two ages
              and two heights. The question this project set out to answer is whether that is
              enough — and, more pointedly, whether a machine-learning model can squeeze anything
              out of it that a tennis fan couldn't get by simply backing the better-ranked player.
            </p>
            <p>
              That second half matters. Beating chance is trivial here: the favourite wins{' '}
              {pct(data.dataset.favoriteWinRate, 1)} of the time, so a rule with no model in it at
              all is already right about two matches in three. The bar is not 50%. The bar is{' '}
              {pct(baseline, 1)}, and it is a genuinely hard bar to clear.
            </p>
            <Pullquote>
              The competition isn't chance. It's a one-line rule that already works.
            </Pullquote>
          </Section>

          {/* ============================================================ */}
          <Section id="data" eyebrow="02" title="The data">
            <p>
              The archive covers {num(data.dataset.matches)} ATP matches between{' '}
              {data.dataset.firstYear} and {data.dataset.lastYear} —{' '}
              {num(data.dataset.players)} players across {num(data.dataset.tournaments)} tournaments,
              from Jeff Sackmann's public dataset. Matches missing a surface or either player's
              ranking were dropped; missing heights were filled with the column median.
            </p>
            <p>
              Each match becomes one row with a coin-flip assignment: one player is arbitrarily
              labelled A, and the model predicts whether A won. Every input is a difference —{' '}
              <code>rank_diff</code>, <code>points_diff</code>, <code>age_diff</code>,{' '}
              <code>height_diff</code> — so the model never learns that a particular name wins, only
              that a particular <em>gap</em> wins.
            </p>
            <Callout title="Why the split is by date, not at random">
              Shuffling the rows would let the model train on 2023 and predict 2019, which is not a
              forecast — it is hindsight. Everything here trains on the earliest{' '}
              {num(data.dataset.trainMatches)} matches and is tested on the most recent{' '}
              {num(data.dataset.testMatches)}. Accuracies come out lower this way. They also mean
              something.
            </Callout>
          </Section>

          {/* ============================================================ */}
          <Section id="scoreboard" eyebrow="03" title="The scoreboard">
            <p>
              Eight approaches were tested: the favourite-wins rule, logistic regression, a decision
              tree, a random forest, gradient boosting, k-nearest neighbours, a linear SVM, and a
              neural network. They span most of the standard toolkit, from a one-line heuristic to a{' '}
              {architecture.hidden.join('–')} hidden-unit network.
            </p>

            <ModelComparison number={1} />

            <p>
              The spread from best to worst is {((best.accuracy - worst.accuracy) * 100).toFixed(1)}{' '}
              percentage points. {best.name} tops the table at {pct(best.accuracy, 1)};{' '}
              {worst.name.toLowerCase()} sits at the bottom on {pct(worst.accuracy, 1)}, the only
              model that fails to beat the baseline at all. Everything else is bunched inside half a
              point of a rule you could write on a napkin.
            </p>
            <p>
              It is tempting to read that as failure. It is better read as a measurement: when a
              linear model, a tree ensemble and a neural network all converge on the same number,
              the ceiling is not in the algorithm. It is in the data.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="signal" eyebrow="04" title="Where the signal is">
            <p>
              If the four inputs are the whole world the model can see, it is worth asking which of
              them it is actually using. Three different models, scored three different ways, agree
              on the shape of the answer — with one wrinkle.
            </p>

            <ImportanceChart number={2} />

            <p>
              Age and height are close to noise. Shuffling height costs the network{' '}
              {(data.importance[3].permutation * 100).toFixed(1)} percentage points of accuracy;
              shuffling age costs {(data.importance[2].permutation * 100).toFixed(1)}. Neither is
              doing meaningful work.
            </p>
            <p>
              The wrinkle is that ranking and ranking points split the credit unevenly, and not in
              the direction the summary usually claims. The decision tree gives{' '}
              {pct(data.importance[1].treeImportance, 0)} of its importance to{' '}
              <em>points</em>, not rank. That is not a contradiction — it is collinearity. The two
              columns encode nearly the same fact, so a model picks one, leans on it, and leaves the
              other looking idle. The honest statement is that <strong>ranking information</strong>{' '}
              dominates, and which of its two columns carries that information is close to arbitrary.
            </p>

            <ResponseCurve number={3} />

            <p>
              The learned curve is flatter than intuition expects. A 100-place ranking advantage
              does not make a match a formality; it moves the needle to roughly the low seventies.
              Beyond about 150 places the curve barely climbs at all — the model has run out of
              things to say, because a #200 and a #400 look much the same from where it is standing.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="easy" eyebrow="05" title="When prediction gets easy">
            <p>
              Aggregate accuracy hides an important structure: the model is not uniformly mediocre.
              It is nearly useless in some matches and quite good in others, and the ranking gap is
              what separates the two.
            </p>

            <RankGapChart number={4} />

            <p>
              Between players within {hardest.label} ranking places of each other, the baseline is
              right {pct(hardest.baseline, 1)} of the time — a coin flip with extra steps. Past{' '}
              {easiest.label} places apart, it climbs to {pct(easiest.baseline, 1)}. The predictable
              matches are the mismatches, and the mismatches are the ones nobody needed a model for.
            </p>
            <p>
              The obvious next suspects are surface and format. Surface turns out to matter
              remarkably little.
            </p>

            <SurfaceChart number={5} />

            <p>
              Across {num(data.dataset.matches)} matches the gap between the most and least
              favourite-friendly surface is{' '}
              {(
                (data.bySurface[0].favoriteWinRate -
                  Math.min(...data.bySurface.map((s) => s.favoriteWinRate))) *
                100
              ).toFixed(1)}{' '}
              percentage points. Clay's reputation for producing specialists and upsets does not
              show up at this resolution.
            </p>
            <p>Format, on the other hand, does.</p>

            <LevelChart number={6} />

            <p>
              Favourites win {pct(data.byLevel[1].favoriteWinRate, 1)} of Grand Slam matches against{' '}
              {pct(data.byLevel[data.byLevel.length - 1].favoriteWinRate, 1)} on the regular tour.
              Best-of-five is a longer measurement of the same quantity, and longer measurements are
              less noisy. An underdog needs to be better for three hours, not for forty minutes.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="confidence" eyebrow="06" title="Trusting the number">
            <p>
              Accuracy is a blunt way to judge a forecaster. A model that says “72%” and is right
              72% of the time is doing its job even when it loses individual matches. So the more
              useful question is whether the probabilities mean what they say.
            </p>

            <CalibrationChart number={7} />

            <p>
              Mostly, they do. Through the middle of the range the points sit close to the diagonal,
              which is the property that makes the output usable as a probability rather than a
              verdict. The tails drift — at the extremes the model is a little more confident than
              the results justify, which is exactly where a bettor would get hurt.
            </p>

            <RocChart number={8} />

            <p>
              Ranking quality tells the same story from another angle: an AUC of {nn.auc.toFixed(3)}{' '}
              means that given a random winner and a random loser, the model scores the winner higher
              about {pct(nn.auc, 0)} of the time. Real signal, comfortably above chance, nowhere near
              decisive. Log loss lands at {nn.logLoss.toFixed(3)}.
            </p>

            <ConfusionMatrix number={9} />

            <p>
              The errors are also symmetric — {num(nn.confusion.fp)} matches called for A that B won,{' '}
              {num(nn.confusion.fn)} the other way. The model is not systematically biased toward
              favourites or underdogs. It is just uncertain, evenly.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="ceiling" eyebrow="07" title="The ceiling">
            <p>
              One last check: is this a fixed property of the sport, or an artefact of a particular
              era being blended into the training set?
            </p>

            <YearChart number={10} />

            <p>
              Twenty-five seasons, four different world number ones, a complete turnover of the top
              hundred — and the favourite's win rate never leaves a narrow band around{' '}
              {pct(data.dataset.favoriteWinRate, 1)}. Whatever is generating the remaining{' '}
              {pct(data.dataset.upsetRate, 1)} of results is a stable feature of professional
              tennis, not a phase.
            </p>
            <Pullquote>
              The limit isn't the model. It's the information that exists before the first serve.
            </Pullquote>
          </Section>

          {/* ============================================================ */}
          <Section id="limits" eyebrow="08" title="What this cannot do">
            <p>
              The project is deliberately narrow, and the narrowness is where the remaining
              performance is hiding. The model has no access to:
            </p>
            <ul className="research__list">
              <li>
                <strong>Recent form.</strong> A player three matches into a hot streak and one
                coming back from six weeks off look identical.
              </li>
              <li>
                <strong>Head-to-head history.</strong> Styles make matchups; the model has never
                heard of a matchup.
              </li>
              <li>
                <strong>Surface-specific ability.</strong> None of the four inputs mentions the
                surface, so a clay specialist looks identical everywhere.
              </li>
              <li>
                <strong>Fitness, injury, travel and scheduling.</strong> A retirement at 2–1 down
                counts the same as a straight-sets loss.
              </li>
              <li>
                <strong>Anything in-match.</strong> Serve percentages and break points are recorded
                after the fact, so using them would be leakage, not prediction.
              </li>
            </ul>
            <p>
              Report 2 builds three of these — surface, head-to-head and rest — out of the same
              archive, and measures exactly what each one is worth.
            </p>
            <p>
              There is also a structural caveat: ranking systems and tournament structures changed
              over the 25 seasons in the archive. Pooling them makes the task more realistic and the
              generalisation harder to reason about at the same time.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="verdict" eyebrow="09" title="Verdict">
            <p className="lead">
              Rankings already know almost everything that pre-match data can know. A neural network
              adds {(best.lift * 100).toFixed(1)} percentage points to a rule that fits in a
              sentence, and three unrelated model families independently confirm that the ceiling is
              real.
            </p>
            <p>
              The right way to use this system is as a probability estimator, not an oracle. It will
              tell you that a match is 78/22 and it will be approximately correct about what 78
              means — and then the 22 will happen, about one time in five, because that is what 22
              means. Tennis reserves roughly a third of its results for the player who was not
              supposed to win, and no amount of pre-match arithmetic gets those back.
            </p>
            <p>
              Getting further requires better inputs, not better algorithms: form, head-to-head,
              surface-specific records, fatigue. That is precisely what Report 2 tests. This
              report's contribution is knowing, with numbers attached, exactly how far four columns
              can carry you.
            </p>
            <p>
              <button className="btn-ball" onClick={() => onOpenReport(2)}>
                Continue to Report 2 <ArrowIcon />
              </button>
            </p>

            <div className="methods">
              <h3 className="methods__title">Methods, briefly</h3>
              <dl className="methods__grid">
                <Method term="Data">
                  Jeff Sackmann's ATP archive, {data.dataset.firstYear}–{data.dataset.lastYear};{' '}
                  {num(data.dataset.matches)} matches after cleaning.
                </Method>
                <Method term="Features">
                  Player-A-minus-player-B differences in ranking, ranking points, age and height.
                </Method>
                <Method term="Split">
                  Chronological 80/20 — {num(data.dataset.trainMatches)} train,{' '}
                  {num(data.dataset.testMatches)} test.
                </Method>
                <Method term="Model in this report">
                  Scikit-learn <code>MLPClassifier</code>, hidden layers{' '}
                  {architecture.hidden.join(' and ')}, ReLU, Adam, early stopping — converged in{' '}
                  {architecture.iterations} iterations behind a <code>StandardScaler</code>.
                </Method>
                <Method term="Reported metrics">
                  Accuracy, AUC and log loss on the held-out window; calibration in 5-point bins.
                </Method>
                <Method term="In this page">
                  The network's weights are exported to JSON and run in your browser, so Fig. 3
                  is drawn by the model itself. The live predictor now runs Report 2's model.
                </Method>
              </dl>
            </div>
          </Section>
        </div>
      </div>
    </article>
  )
}
