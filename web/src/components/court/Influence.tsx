import { describeInfluence, influences, type Conditions } from '../../lib/elo-model'
import { surname } from '../../lib/format'
import type { Player } from '../../lib/types'

/**
 * Diverging bars: each input is switched off in turn and the prediction re-run,
 * so bar length is the probability the model actually loses without it. Poles
 * are the two players' own colours; the midpoint is neutral.
 */
export default function Influence({
  a,
  b,
  conditions,
}: {
  a: Player
  b: Player
  conditions: Conditions
}) {
  const rows = influences(a, b, conditions)
  const max = Math.max(0.02, ...rows.map((r) => Math.abs(r.effect)))

  return (
    <section className="panel panel--influence">
      <h3 className="panel__title">What moved the needle</h3>
      <p className="panel__lede">
        Each input switched off in turn and the model re-run. For a logistic model that is exact —
        these are its own sums, not an estimate of them.
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
                <em className="num">{describeInfluence(row, conditions.surface)}</em>
              </span>

              <span className="influence__track">
                <span className="influence__zero" aria-hidden="true" />
                <span
                  className={`influence__bar influence__bar--${towardA ? 'a' : 'b'}`}
                  style={{ width: `${width}%`, [towardA ? 'left' : 'right']: '50%' }}
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
        Elo and surface Elo overlap: a player who is strong overall is usually strong on each
        surface. Switching either one off alone understates what the pair does together.
      </p>
    </section>
  )
}
