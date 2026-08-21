import { useState } from 'react'
import analytics from '../../data/analytics.json'
import { num, pct } from '../../lib/format'
import type { Analytics } from '../../lib/types'
import { Figure, Tooltip, linear, ticks, useReveal, type TipState } from './chart-kit'

const data = analytics as Analytics

/* ==========================================================================
   Fig. 1 — Every model against the favourite-wins baseline
   Bars start at zero. They come out the same length, and that is the finding.
   ========================================================================== */

export function ModelComparison({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()

  const rows = [...data.models].sort((a, b) => b.accuracy - a.accuracy)
  const baseline = data.models[0].accuracy

  return (
    <Figure
      number={number}
      title="Every model lands in the same place"
      subtitle="Accuracy on 14,293 held-out matches, measured against a rule that just picks the higher-ranked player."
      source="Time-aware 80/20 split: models train on 2000–2019, predict 2019–2024. Bars start at zero — the differences really are this small."
      table={{
        columns: ['Model', 'Accuracy', 'vs baseline', 'AUC'],
        rows: rows.map((m) => [
          m.name,
          pct(m.accuracy, 1),
          m.key === 'baseline' ? '—' : `${m.lift >= 0 ? '+' : '−'}${Math.abs(m.lift * 100).toFixed(1)} pts`,
          m.auc ? m.auc.toFixed(3) : '—',
        ]),
      }}
    >
      {(width) => {
        // On a phone there is no room for a label gutter, so the name moves
        // above its own full-width bar instead of beside it.
        const compact = width < 520
        const rowH = compact ? 62 : 46
        const H = rows.length * rowH + 56
        const ML = compact ? 0 : 168
        const MR = compact ? 0 : 116
        const plot = width - ML - MR
        const x = linear(0, 0.8, 0, plot)

        return (
          <div className="chart">
            <svg ref={ref} width={width} height={H} role="img" aria-label="Model accuracy comparison">
              {/* grid */}
              {ticks(0, 0.8, 4).map((t) => (
                <g key={t}>
                  <line
                    x1={ML + x(t)}
                    y1={26}
                    x2={ML + x(t)}
                    y2={H - 30}
                    stroke="var(--grid)"
                    strokeWidth="1"
                  />
                  <text x={ML + x(t)} y={H - 12} className="ax" textAnchor="middle">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              {rows.map((m, i) => {
                const y = 26 + i * rowH
                const isBaseline = m.key === 'baseline'
                const w = shown ? x(m.accuracy) : 0
                const barY = compact ? y + 24 : y + 5
                return (
                  <g
                    key={m.key}
                    onMouseEnter={() =>
                      setTip({
                        x: Math.min(ML + x(m.accuracy) + 12, width - 20),
                        y: barY + 9,
                        title: m.name,
                        lines: [
                          { label: 'Accuracy', value: pct(m.accuracy, 2) },
                          {
                            label: 'vs baseline',
                            value: isBaseline
                              ? '—'
                              : `${m.lift >= 0 ? '+' : '−'}${Math.abs(m.lift * 100).toFixed(1)} pts`,
                          },
                          ...(m.auc ? [{ label: 'AUC', value: m.auc.toFixed(3) }] : []),
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={ML} y={y} width={plot} height={rowH - 6} fill="transparent" />
                    <text
                      x={compact ? 0 : ML - 14}
                      y={compact ? y + 12 : y + 19}
                      className="ax ax--name"
                      textAnchor={compact ? 'start' : 'end'}
                    >
                      {m.name}
                    </text>
                    <rect
                      x={ML}
                      y={barY}
                      width={Math.max(w, 0)}
                      height={18}
                      rx="4"
                      fill={isBaseline ? 'var(--ink-3)' : 'var(--series-1)'}
                      className="bar"
                      style={{ transitionDelay: `${i * 45}ms` }}
                    />
                    <text
                      x={compact ? plot : ML + x(m.accuracy) + 12}
                      y={compact ? y + 12 : y + 19}
                      className="ax ax--value"
                      textAnchor={compact ? 'end' : 'start'}
                    >
                      {pct(m.accuracy, 1)}
                      {!isBaseline && (
                        <tspan className="ax--delta">
                          {' '}
                          {m.lift >= 0 ? '+' : '−'}
                          {Math.abs(m.lift * 100).toFixed(1)}
                        </tspan>
                      )}
                    </text>
                  </g>
                )
              })}

              {/* the reference the whole project is measured against */}
              <line
                x1={ML + x(baseline)}
                y1={14}
                x2={ML + x(baseline)}
                y2={H - 28}
                stroke="var(--ball)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text x={ML + x(baseline)} y={10} className="ax ax--ref" textAnchor="middle">
                baseline {pct(baseline, 1)}
              </text>
            </svg>
            <Tooltip tip={tip} width={width} />
          </div>
        )
      }}
    </Figure>
  )
}

/* ==========================================================================
   Fig. 2 — Which input carries the weight (small multiples, own scale each)
   ========================================================================== */

const MEASURES = [
  {
    key: 'logregCoef' as const,
    title: 'Logistic regression',
    unit: 'standardised weight',
    format: (v: number) => v.toFixed(2),
  },
  {
    key: 'treeImportance' as const,
    title: 'Decision tree',
    unit: 'split importance',
    format: (v: number) => v.toFixed(2),
  },
  {
    key: 'permutation' as const,
    title: 'Neural network',
    unit: 'accuracy lost when shuffled',
    format: (v: number) => `${(v * 100).toFixed(1)} pts`,
  },
]

export function ImportanceChart({ number }: { number: number }) {
  const [ref, shown] = useReveal<HTMLDivElement>()

  return (
    <Figure
      number={number}
      title="The ranking signal dominates — but it arrives through two doors"
      subtitle="Three models, three ways of scoring the same four inputs. Each panel has its own scale, because the measures are not comparable."
      source="Ranking and points are near-duplicates of each other, so a model can lean on either. Age and height barely register in any of the three."
      table={{
        columns: ['Input', 'Logistic weight', 'Tree importance', 'NN permutation'],
        rows: data.importance.map((f) => [
          f.label,
          f.logregCoef.toFixed(3),
          f.treeImportance.toFixed(3),
          `${(f.permutation * 100).toFixed(2)} pts`,
        ]),
      }}
    >
      {() => (
        <div className="smalls" ref={ref}>
          {MEASURES.map((measure) => {
            const max = Math.max(...data.importance.map((f) => Math.abs(f[measure.key])))
            return (
              <div className="smalls__panel" key={measure.key}>
                <p className="smalls__title">{measure.title}</p>
                <p className="smalls__unit">{measure.unit}</p>
                {data.importance.map((f) => (
                  <div className="smalls__row" key={f.feature}>
                    <span className="smalls__label">{f.label}</span>
                    <span className="smalls__track">
                      <span
                        className="smalls__fill"
                        style={{
                          width: shown ? `${(Math.abs(f[measure.key]) / max) * 100}%` : '0%',
                        }}
                      />
                    </span>
                    <span className="smalls__val num">{measure.format(Math.abs(f[measure.key]))}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </Figure>
  )
}

/* ==========================================================================
   Fig. 3 — Confusion matrix for the shipped network
   ========================================================================== */

export function ConfusionMatrix({ number }: { number: number }) {
  const { tn, fp, fn, tp } = data.neuralNetwork.confusion
  const total = tn + fp + fn + tp
  const cells = [
    { label: 'Called A, A won', value: tp, correct: true },
    { label: 'Called A, B won', value: fp, correct: false },
    { label: 'Called B, A won', value: fn, correct: false },
    { label: 'Called B, B won', value: tn, correct: true },
  ]
  const max = Math.max(...cells.map((c) => c.value))

  return (
    <Figure
      number={number}
      title="The errors are spread evenly"
      subtitle="Where the network's calls landed across the held-out matches. It is not biased toward one side — it is simply wrong about a third of the time."
      source={`${num(total)} held-out matches. Shading runs light to dark with the count.`}
      table={{
        columns: ['Outcome', 'Matches', 'Share'],
        rows: cells.map((c) => [c.label, num(c.value), pct(c.value / total, 1)]),
      }}
    >
      {() => (
        <div className="confusion">
          {cells.map((c) => (
            <div
              className={`confusion__cell ${c.correct ? 'is-correct' : ''}`}
              key={c.label}
              style={{
                // one hue, light to dark with magnitude
                background: `color-mix(in srgb, var(--series-1) ${18 + (c.value / max) * 62}%, var(--surface-2))`,
              }}
            >
              <span className="confusion__value num">{num(c.value)}</span>
              <span className="confusion__label">{c.label}</span>
              <span className="confusion__share num">{pct(c.value / total, 1)}</span>
              <span className={`confusion__mark ${c.correct ? 'is-correct' : ''}`}>
                {c.correct ? '✓ right' : '✕ wrong'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Figure>
  )
}
