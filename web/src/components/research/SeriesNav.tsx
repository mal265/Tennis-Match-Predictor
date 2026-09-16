import analyticsJson from '../../data/analytics.json'
import reportJson from '../../data/report2.json'
import { liftPts, pct } from '../../lib/format'
import type { Analytics, Report2 } from '../../lib/types'
import { ArrowIcon } from '../Icons'

const analytics = analyticsJson as Analytics
const report = reportJson as Report2

const report1Best = [...analytics.models].sort((x, y) => y.accuracy - x.accuracy)[0]
const report1Step = report.steps.find((s) => s.key === 'report1')!
const finalStep = report.steps.find((s) => s.key === 'final')!

const REPORTS = [
  {
    n: 1 as const,
    title: 'The ranking ceiling',
    blurb:
      'Eight models on four static inputs — ranking, points, age, height. Every one lands within a point of the favourite-wins rule.',
    stat: pct(report1Best.accuracy, 1),
    statLabel: `best of eight · ${liftPts(report1Best.lift, 1)} pts`,
  },
  {
    n: 2 as const,
    title: 'Changing the inputs',
    blurb: `The simplest model from Report 1, fed five ratings built from match history. The gain goes from ${liftPts(report1Step.lift)} to ${liftPts(finalStep.lift)} points.`,
    stat: pct(report.final.correct / report.split.test, 2),
    statLabel: `final model · runs the predictor`,
  },
]

/** Both reports, side by side, so each reads as one half of the same study. */
export default function SeriesNav({
  current,
  onOpen,
}: {
  current: 1 | 2
  onOpen: (report: 1 | 2) => void
}) {
  return (
    <nav className="page series" aria-label="Research reports">
      {REPORTS.map((item) => {
        const active = item.n === current
        return (
          <button
            key={item.n}
            className="series__item"
            aria-current={active ? 'page' : undefined}
            onClick={() => !active && onOpen(item.n)}
          >
            <span className="series__top">
              <span className="series__num">Report {item.n}</span>
              <span className="series__state">
                {active ? (
                  'You are here'
                ) : (
                  <>
                    Read <ArrowIcon />
                  </>
                )}
              </span>
            </span>
            <span className="series__title">{item.title}</span>
            <span className="series__blurb">{item.blurb}</span>
            <span className="series__stat">
              <b className="num">{item.stat}</b>
              {item.statLabel}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
