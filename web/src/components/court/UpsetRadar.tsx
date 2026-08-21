import analytics from '../../data/analytics.json'
import { num, pct } from '../../lib/format'
import type { Analytics, Player } from '../../lib/types'

const data = analytics as Analytics

/** Which empirical rank-gap band this matchup falls into. */
function bandFor(gap: number): number {
  const edges = [3, 8, 15, 30, 60, 120]
  const index = edges.findIndex((edge) => gap <= edge)
  return index === -1 ? data.rankGap.length - 1 : index
}

export default function UpsetRadar({ a, b }: { a: Player; b: Player }) {
  const gap = Math.abs(a.rank - b.rank)
  const index = bandFor(gap)
  const band = data.rankGap[index]
  const max = Math.max(...data.rankGap.map((d) => d.baseline))

  return (
    <section className="panel panel--radar">
      <h3 className="panel__title">Upset radar</h3>
      <p className="panel__lede">
        How often the better-ranked player actually won, at this size of ranking gap, across{' '}
        {num(data.dataset.testMatches)} held-out matches.
      </p>

      <div className="radar__headline">
        <span className="radar__gap num">{gap}</span>
        <span className="radar__gap-label">
          places between them
          <em>band {band.label}</em>
        </span>
      </div>

      <p className="radar__verdict">
        Favourites in this band won <strong className="num">{pct(band.baseline)}</strong> of{' '}
        <span className="num">{num(band.matches)}</span> matches — so roughly{' '}
        <strong className="num">{pct(1 - band.baseline, 0)}</strong> ended in an upset.
      </p>

      <div className="radar__chart">
        {data.rankGap.map((d, i) => (
          <div className={`radar__col ${i === index ? 'is-active' : ''}`} key={d.label}>
            <span className="radar__col-val num">{(d.baseline * 100).toFixed(0)}</span>
            <span className="radar__col-track">
              <span
                className="radar__col-fill"
                style={{ height: `${(d.baseline / max) * 100}%` }}
              />
            </span>
            <span className="radar__col-label num">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="radar__axis-note">
        Ranking places between the two players → favourite win rate (%)
      </p>
    </section>
  )
}
