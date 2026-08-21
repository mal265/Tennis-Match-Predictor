import { describeInfluence, influences } from '../../lib/model'
import { surname } from '../../lib/format'
import type { Player } from '../../lib/types'

/**
 * Diverging bars: each input is neutralised in turn and the prediction re-run,
 * so the bar length is the probability the model actually loses when that
 * number goes away. Poles are the two players' own colours; midpoint is neutral.
 */
export default function Influence({ a, b }: { a: Player; b: Player }) {
  const rows = influences(a, b)
  const max = Math.max(0.02, ...rows.map((r) => Math.abs(r.effect)))

  return (
    <section className="panel panel--influence">
      <h3 className="panel__title">What moved the needle</h3>
      <p className="panel__lede">
        Each input switched off in turn, the network re-run, and the gap measured. This is the
        model's own arithmetic — not a summary of it.
      </p>

      <div className="influence">
        <div className="influence__axis" aria-hidden="true">
          <span>← toward {surname(b.name)}</span>
          <span>toward {surname(a.name)} →</span>
        </div>

        {rows.map((row) => {
          const width = (Math.abs(row.effect) / max) * 50
          const towardA = row.effect >= 0
          return (
            <div className="influence__row" key={row.feature}>
              <span className="influence__label">
                {row.label}
                <em className="num">{describeInfluence(row)}</em>
              </span>

              <span className="influence__track">
                <span className="influence__zero" aria-hidden="true" />
                <span
                  className={`influence__bar influence__bar--${towardA ? 'a' : 'b'}`}
                  style={{
                    width: `${width}%`,
                    [towardA ? 'left' : 'right']: '50%',
                  }}
                />
              </span>

              <span className="influence__value num">
                {row.effect >= 0 ? '+' : '−'}
                {(Math.abs(row.effect) * 100).toFixed(1)} pts
              </span>
            </div>
          )
        })}
      </div>

      <p className="influence__foot">
        Ranking and points overlap almost completely, so the network leans on whichever it finds
        first and the other looks quieter than it is.
      </p>
    </section>
  )
}
