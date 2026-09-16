import reportJson from '../../data/report2.json'
import { num, pct } from '../../lib/format'
import type { Player, Report2 } from '../../lib/types'

const report = reportJson as Report2

/** Which held-out Elo-gap band this matchup falls into. */
function bandFor(gap: number): number {
  const index = report.eloBands.findIndex((b) => gap >= b.lo && (b.hi === null || gap < b.hi))
  return index === -1 ? report.eloBands.length - 1 : index
}

export default function UpsetRadar({ a, b }: { a: Player; b: Player }) {
  const exactGap = Math.abs(a.rating.elo - b.rating.elo)
  const index = bandFor(exactGap)
  const band = report.eloBands[index]
  const max = Math.max(...report.eloBands.map((d) => d.model))

  return (
    <section className="panel panel--radar">
      <h3 className="panel__title">Upset radar</h3>
      <p className="panel__lede">
        How often the model's pick actually won at this size of Elo gap, across{' '}
        {num(report.split.test)} held-out matches.
      </p>

      <div className="radar__headline">
        <span className="radar__gap num">{Math.round(exactGap)}</span>
        <span className="radar__gap-label">
          Elo points between them
          <em>band {band.label}</em>
        </span>
      </div>

      <p className="radar__verdict">
        In this band the model called <strong className="num">{pct(band.model)}</strong> of{' '}
        <span className="num">{num(band.matches)}</span> matches right, where the ranking rule
        managed <span className="num">{pct(band.baseline)}</span>. Roughly{' '}
        <strong className="num">{pct(1 - band.model, 0)}</strong> went the other way.
      </p>

      <div className="radar__chart">
        {report.eloBands.map((d, i) => (
          <div className={`radar__col ${i === index ? 'is-active' : ''}`} key={d.label}>
            <span className="radar__col-val num">{(d.model * 100).toFixed(0)}</span>
            <span className="radar__col-track">
              <span className="radar__col-fill" style={{ height: `${(d.model / max) * 100}%` }} />
            </span>
            <span className="radar__col-label num">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="radar__axis-note">Elo gap between the two players → model accuracy (%)</p>
    </section>
  )
}
