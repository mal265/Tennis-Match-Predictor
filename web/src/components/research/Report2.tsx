import analyticsJson from '../../data/analytics.json'
import playersJson from '../../data/players.json'
import reportJson from '../../data/report2.json'
import { predict } from '../../lib/elo-model'
import { liftPts, monthYear, num, pct } from '../../lib/format'
import { useActiveSection } from '../../lib/hooks'
import type { Analytics, Player, Report2 as Report2Data } from '../../lib/types'
import {
  BandLift,
  Calibration2,
  EloTables,
  InputWorth,
  LadderChart,
  Trajectories,
} from '../charts/Report2Charts'
import { ArrowIcon } from '../Icons'
import { Callout, Fact, Method, Pullquote, Section } from './parts'
import SeriesNav from './SeriesNav'

const report = reportJson as Report2Data
const analytics = analyticsJson as Analytics
const players = playersJson as Player[]

const step = (key: string) => report.steps.find((s) => s.key === key)!
const report1 = step('report1')
const eloStep = step('elo')
const surfaceStep = step('surface')
const formStep = step('form')
const finalStep = step('final')

/** From the raw count, so the headline can't inherit a rounding artefact. */
const finalAccuracy = report.final.correct / report.split.test
const vsReport1 = report.finalVsReport1
const sharper = report.finalVsReport1Probabilities
const peak = report.leaders.peak[0]
const rivalry = report.rivalry

const byId = (id: string) => players.find((p) => p.id === id)!
const sinner = byId('janniksinner')
const djokovic = byId('novakdjokovic')
const evenRest = { restA: 7, restB: 7 }
const sinnerOnHard = predict(sinner, djokovic, { surface: 'Hard', ...evenRest })
const sinnerOnGrass = predict(sinner, djokovic, { surface: 'Grass', ...evenRest })

/** Rating points from a player's first rated month to their peak. */
const climb = (name: string) => {
  const t = report.trajectories.find((item) => item.name === name)!
  return Math.round(t.peak.r - t.points[0].r)
}

/** Accuracy an input adds on top of the two ratings. */
const added = (key: string) => liftPts(step(key).accuracy - surfaceStep.accuracy)
const pPhrase = (p: number) => (p < 0.001 ? 'below 0.001' : `of ${p.toFixed(3)}`)
const pEquals = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)
const clearsReport1OnAccuracy = vsReport1.ciLow > 0
const clearsReport1OnLogLoss = sharper.logLoss.ciLow > 0

const SECTIONS = [
  { id: 'recap', label: 'Where Report 1 left off' },
  { id: 'design', label: 'Same model, new inputs' },
  { id: 'elo', label: 'A rating that learns' },
  { id: 'surface', label: 'One rating per surface' },
  { id: 'context', label: 'Form, rivalry, rest' },
  { id: 'scoreboard', label: 'The scoreboard' },
  { id: 'where', label: 'Where the gain lives' },
  { id: 'trust', label: 'Trusting the numbers' },
  { id: 'limits', label: 'What is still missing' },
  { id: 'verdict', label: 'Verdict' },
]
const SECTION_IDS = SECTIONS.map((s) => s.id)

export default function Report2({
  onOpenReport,
  onOpenPredictor,
}: {
  onOpenReport: (report: 1 | 2) => void
  onOpenPredictor: () => void
}) {
  const active = useActiveSection(SECTION_IDS)

  return (
    <article className="research">
      <header className="rhero">
        <div className="page rhero__inner">
          <p className="kicker">Report 2 of 2 · Roman Belchikov</p>
          <h1 className="rhero__title display">
            Same model,
            <br />
            <em>better inputs</em>
          </h1>
          <p className="rhero__standfirst">
            Report 1 ended on a hypothesis: the ceiling was in the data, not the algorithm. Report 2
            tests it. It keeps the plainest model from Report 1 — logistic regression — and swaps
            its four static inputs for five numbers built from every player's match history. Over
            the favourite-wins rule, the lift goes from {liftPts(report1.lift)} to{' '}
            {liftPts(finalStep.lift)} percentage points.
          </p>

          <dl className="rhero__facts">
            <Fact term="Baseline" detail="higher rank wins">
              {pct(report.baseline, 2)}
            </Fact>
            <Fact term="Report 1 model" detail="rank, points, age, height">
              {pct(report1.accuracy, 2)}
            </Fact>
            <Fact term="Report 2 final model" detail="powers the predictor">
              {pct(finalAccuracy, 2)}
            </Fact>
            <Fact
              term="Lift over baseline"
              detail={`95% interval ${liftPts(finalStep.ciLow)} to ${liftPts(finalStep.ciHigh)}`}
            >
              {liftPts(finalStep.lift)} pts
            </Fact>
          </dl>
        </div>
      </header>

      <SeriesNav current={2} onOpen={onOpenReport} />

      <div className="page research__layout">
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
          <Section id="recap" eyebrow="01" title="Where Report 1 left off">
            <p className="lead">
              Report 1 trained eight models on four pre-match numbers and watched all of them arrive
              in the same place. A neural network, a random forest and a logistic regression were
              separated by fractions of a point, and none moved far from simply backing the
              higher-ranked player.
            </p>
            <p>
              Its conclusion was a diagnosis. When very different algorithms converge, the limit is
              not the algorithm; it is what the algorithm is allowed to see. A ranking is a slow,
              rolling summary of a year of results. It says nothing about the surface, the opponent,
              or whether a player has just come back from a long absence.
            </p>
            <Pullquote>If the ceiling is in the data, change the data.</Pullquote>
          </Section>

          {/* ============================================================ */}
          <Section id="design" eyebrow="02" title="Same model, new inputs">
            <p>
              To make the comparison fair, Report 2 changes exactly one thing. The model is still a
              logistic regression, the earliest {num(report.split.train)} matches still train it,
              and the latest {num(report.split.test)} still test it. Only the inputs are new.
            </p>
            <p>
              Every new input is built by walking through the archive in date order. For each match
              the code first <strong>reads</strong> each player's current state and only then{' '}
              <strong>updates</strong> it with the result, so no feature ever contains the outcome
              it is being used to predict.
            </p>
            <Callout title="The five inputs">
              Overall Elo gap · Elo gap on the match surface · head-to-head edge (prior wins minus
              prior losses) · rest gap (days since each player's last match) · experience gap
              (career matches played). Each is player A minus player B, exactly as in Report 1.
            </Callout>
          </Section>

          {/* ============================================================ */}
          <Section id="elo" eyebrow="03" title="A rating that learns from every match">
            <p>
              Elo ratings come from chess. Every player starts at 1,500, and before each match the
              two ratings imply an expected result: a player rated 200 points higher is expected to
              win about 76% of the time. Afterwards the winner takes points from the loser in
              proportion to how surprising the result was. An upset moves both ratings a lot; a
              routine win barely moves them.
            </p>
            <p>
              This version adds one refinement: the step size shrinks as a player's match count
              grows. A newcomer's rating can climb quickly to where it belongs, while an established
              player's rating stays put unless the results keep saying otherwise.
            </p>
            <p>
              With no model at all — just “the higher Elo wins” — the rating is right{' '}
              {pct(report.singles.eloRule, 2)} of the time. Report 1's neural network managed{' '}
              {pct(analytics.neuralNetwork.accuracy, 2)}. A rating formula from the 1960s matches
              Report 1's most elaborate model before any machine learning is applied to it.
            </p>

            <EloTables number={1} />

            <p>
              Before trusting ratings with predictions, it is worth checking that they describe
              tennis as a fan would recognise it. They do: {peak.name}'s peak of{' '}
              {Math.round(peak.rating)} in {monthYear(peak.date)} is the highest in the archive,
              and every name on the lists is one you would expect to find there.
            </p>

            <Trajectories number={2} />

            <p>
              The histories show how the ratings are earned. Jannik Sinner climbed{' '}
              {num(climb('Jannik Sinner'))} points from a first rating to a peak, and Carlos Alcaraz{' '}
              {num(climb('Carlos Alcaraz'))}, while the long plateaus of the three older players move
              only when a sustained run of results says they should.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="surface" eyebrow="04" title="One rating per surface">
            <p>
              A single rating treats a clay-court specialist identically on grass. So each player
              also carries a separate rating for every surface, updated only by matches played on
              it. The spread can be enormous: Jannik Sinner rates{' '}
              {Math.round(sinner.rating.surfaces.Hard.rating)} on hard courts and{' '}
              {Math.round(sinner.rating.surfaces.Grass.rating)} on grass.
            </p>
            <p>
              Adding surface ratings to overall Elo lifts accuracy from {pct(eloStep.accuracy, 2)} to{' '}
              {pct(surfaceStep.accuracy, 2)} — the largest single addition in the study, and the
              first of Report 2's steps whose interval clears zero. It is also why the surface
              matters so much in the predictor: Sinner against Djokovic goes from{' '}
              {pct(sinnerOnHard, 0)} on hard courts to {pct(sinnerOnGrass, 0)} on grass.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="context" eyebrow="05" title="Form, rivalry, rest and mileage">
            <p>
              Four more signals are cheap to compute from the archive. Three earned a place in the
              final model; the most intuitive one did not.
            </p>

            <h3 className="rsection__sub">Recent form made it worse</h3>
            <p>
              Win rate over each player's last ten matches sounds like exactly what a ranking
              misses. Added on top of the two ratings, it lowered accuracy from{' '}
              {pct(surfaceStep.accuracy, 2)} to {pct(formStep.accuracy, 2)}. The likeliest
              explanation is that Elo already is a measure of recent form — every result moves it —
              so a raw win rate adds noise rather than information. It was left out of the final
              model.
            </p>

            <h3 className="rsection__sub">Head-to-head</h3>
            <p>
              {pct(report.context.rematchShare, 0)} of held-out matches were rematches, so a rivalry
              record is often available. The edge is simply prior wins minus prior losses against
              this opponent. Some rivalries are almost perfectly level: {rivalry.a} and {rivalry.b}{' '}
              met {rivalry.aWins + rivalry.bWins} times in the archive and finished{' '}
              {rivalry.aWins}–{rivalry.bWins}. Added to the ratings it is worth {added('h2h')}{' '}
              points.
            </p>

            <h3 className="rsection__sub">Rest and experience</h3>
            <p>
              Days since each player's last match ({added('rest')} points) and career matches played
              ({added('experience')}) both carry signs that look backwards at first. More rest than
              the opponent slightly <em>lowers</em> a player's chances; the likeliest reason is that
              long gaps in the archive follow injuries and withdrawals rather than holidays. And
              once the ratings are known, more career matches is a mild negative too: between two
              equally rated players, the one with fewer matches is most likely the younger player
              still improving.
            </p>
            <p>
              How rest is measured matters. Raw day counts ({pct(report.restVariants.raw, 2)}) beat
              capping every gap at 60 days ({pct(report.restVariants.capped, 2)}), which suggests
              the signal lives in the very long absences in particular.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="scoreboard" eyebrow="06" title="The scoreboard, with error bars">
            <p>
              A difference of a few tenths of a point can be pure luck on a test set of this size.
              So every model below is compared with the baseline on the same held-out matches, and
              the uncertainty is drawn rather than hidden.
            </p>

            <LadderChart number={3} />

            <p>
              The final model is right {pct(finalAccuracy, 2)} of the time:{' '}
              {liftPts(finalStep.lift)} points over the baseline, with a 95% interval of{' '}
              {liftPts(finalStep.ciLow)} to {liftPts(finalStep.ciHigh)} and a McNemar p-value{' '}
              {pPhrase(finalStep.pValue)}. Elo on its own is not distinguishable from the baseline;
              it is the combination of ratings and context that clears the noise.
            </p>

            <h3 className="rsection__sub">Against Report 1 directly</h3>
            <p>
              Measured against Report 1's model instead of the baseline, the final model gains{' '}
              {liftPts(vsReport1.lift)} points of accuracy, with a 95% interval of{' '}
              {liftPts(vsReport1.ciLow)} to {liftPts(vsReport1.ciHigh)} ({pEquals(vsReport1.pValue)}).{' '}
              {clearsReport1OnAccuracy
                ? 'That interval clears zero as well.'
                : 'That interval just includes zero, so on accuracy alone the improvement over Report 1 is suggestive rather than conclusive.'}
            </p>
            <p>
              Accuracy is a blunt instrument, though: it only asks which side of 50% a prediction
              fell. Comparing the probabilities themselves, match by match, average log loss moves
              from {sharper.logLoss.reference.toFixed(4)} to {sharper.logLoss.model.toFixed(4)}
              {clearsReport1OnLogLoss
                ? ` — an improvement whose 95% interval clears zero (${pEquals(sharper.logLoss.pValue)}), and the Brier score agrees. Report 2's probabilities are measurably sharper than Report 1's, even on the matches where both models make the same call.`
                : `, but that interval also includes zero (${pEquals(sharper.logLoss.pValue)}). A longer test window would be needed to settle the comparison.`}
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="where" eyebrow="07" title="Where the gain lives">
            <p>
              An average hides where a model earns its keep. Split by how far apart the players are
              ranked, Report 2's advantage turns up in exactly the matches Report 1 found hardest.
            </p>

            <BandLift number={4} />

            <p>
              When the players are within eight ranking places, the baseline is right only{' '}
              {pct(report.rankBands[0].baseline, 0)}–{pct(report.rankBands[1].baseline, 0)} of the
              time, and Report 2 adds {liftPts(report.rankBands[0].finalLift)} and{' '}
              {liftPts(report.rankBands[1].finalLift)} points. Ratings built from results can
              separate two players whose rankings cannot. In the widest mismatches, where the
              ranking already calls three matches in four, Report 2 does slightly worse than the
              baseline.
            </p>

            <InputWorth number={5} />

            <p>
              Two inputs carry nearly all of the model's skill. Shuffling the Elo gap costs{' '}
              {(report.importance[0].drop * 100).toFixed(2)} points of accuracy and shuffling the
              surface gap {(report.importance[1].drop * 100).toFixed(2)}; each of the other three
              costs well under a quarter of a point.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="trust" eyebrow="08" title="Trusting the numbers">
            <p>A better model is only useful if its probabilities still mean what they say.</p>

            <Calibration2 number={6} />

            <div className="compare">
              <CompareTile
                label="Accuracy"
                from={pct(report1.accuracy, 2)}
                to={pct(finalAccuracy, 2)}
                note="higher is better"
              />
              <CompareTile
                label="AUC"
                from={report1.auc.toFixed(3)}
                to={report.final.auc.toFixed(3)}
                note="higher is better"
              />
              <CompareTile
                label="Log loss"
                from={report1.logLoss.toFixed(4)}
                to={report.final.logLoss.toFixed(4)}
                note="lower is better"
              />
            </div>

            <p>
              On every measure the final model improves on Report 1's, fitted and tested on
              identical matches: AUC rises from {report1.auc.toFixed(3)} to{' '}
              {report.final.auc.toFixed(3)}, and log loss falls from {report1.logLoss.toFixed(4)} to{' '}
              {report.final.logLoss.toFixed(4)}.
            </p>
          </Section>

          {/* ============================================================ */}
          <Section id="limits" eyebrow="09" title="What is still missing">
            <ul className="research__list">
              <li>
                <strong>Injuries and withdrawals.</strong> The model sees a long gap between matches,
                never the reason for it.
              </li>
              <li>
                <strong>Rest is coarse.</strong> The archive dates every match by the start of its
                tournament, so players meeting inside the same event usually show identical rest —{' '}
                {pct(report.context.sameRestShare, 0)} of held-out matches have no rest difference
                at all.
              </li>
              <li>
                <strong>Frozen ratings.</strong> A rating only changes when a player plays, so anyone
                returning from a long absence comes back at their old number. Players with no
                history in the archive start at a flat 1,500.
              </li>
              <li>
                <strong>No match statistics.</strong> Serve and return numbers are recorded after
                the match, so using them would leak the result.
              </li>
              <li>
                <strong>One test window.</strong> Every figure comes from one chronological split —
                the most recent fifth of the archive. Evaluating across several seasons would show
                how stable the gain is.
              </li>
            </ul>
          </Section>

          {/* ============================================================ */}
          <Section id="verdict" eyebrow="10" title="Verdict">
            <p className="lead">
              Report 1 concluded that the ceiling was in the data. Report 2 moved it by changing the
              data and nothing else: the same logistic regression, fed ratings instead of rankings,
              lifts accuracy over the favourite-wins rule from {liftPts(report1.lift)} to{' '}
              {liftPts(finalStep.lift)} points.
            </p>
            <p>
              The gain over the baseline is clearly real, and it concentrates where it matters most:
              the close matches that rankings cannot separate.{' '}
              {clearsReport1OnAccuracy
                ? 'It also clears the noise against Report 1 directly.'
                : clearsReport1OnLogLoss
                  ? 'Against Report 1 directly, accuracy alone falls just short of a conclusive result, but the probabilities are measurably sharper.'
                  : 'Against Report 1 directly, neither accuracy nor log loss is yet conclusive; a longer test window would settle it.'}
            </p>
            <p>
              It is still a modest model. About {pct(1 - finalAccuracy, 0)} of matches go against its
              pick, and the missing pieces — injuries, fatigue inside a tournament, what happens on
              the day — are exactly the ones an archive of results cannot supply.
            </p>
            <p>
              <button className="btn-ball" onClick={onOpenPredictor}>
                Try the model in the predictor <ArrowIcon />
              </button>
            </p>

            <div className="methods">
              <h3 className="methods__title">Methods, briefly</h3>
              <dl className="methods__grid">
                <Method term="Data">
                  The same archive as Report 1: {num(report.split.train + report.split.test)} ATP
                  matches from 2000 to {monthYear(report.asOf)}, ordered by tournament date and
                  match number.
                </Method>
                <Method term="Ratings">
                  Elo starting at 1,500 with step size <code>K = 250 / (matches + 5)^0.4</code>.
                  Surface ratings apply the same rule to each surface separately.
                </Method>
                <Method term="No leakage">
                  Every feature is read from a player's state before a match and updated only
                  afterwards.
                </Method>
                <Method term="Model">
                  Scikit-learn <code>LogisticRegression</code> on the raw gaps, trained on the
                  earliest {num(report.split.train)} matches and tested on the latest{' '}
                  {num(report.split.test)}.
                </Method>
                <Method term="Uncertainty">
                  Accuracy intervals from a paired bootstrap with McNemar's test; log loss and Brier
                  score compared per match with a paired normal approximation.
                </Method>
                <Method term="Reproducibility">
                  The export script re-derives the notebook's results on every run —{' '}
                  {report.reproduction.matched} of {report.reproduction.checked} match — and ships
                  the model's coefficients, which the predictor evaluates in your browser.
                </Method>
              </dl>
            </div>
          </Section>
        </div>
      </div>
    </article>
  )
}

function CompareTile({
  label,
  from,
  to,
  note,
}: {
  label: string
  from: string
  to: string
  note: string
}) {
  return (
    <div className="compare__tile">
      <p className="compare__label">{label}</p>
      <p className="compare__values">
        <span className="compare__from num">{from}</span>
        <span className="compare__arrow" aria-hidden="true">
          →
        </span>
        <span className="compare__to num">{to}</span>
      </p>
      <p className="compare__note">Report 1 → Report 2 · {note}</p>
    </div>
  )
}
