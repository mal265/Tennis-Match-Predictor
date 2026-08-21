import { useMemo, useState } from 'react'
import analytics from '../../data/analytics.json'
import { responseCurve } from '../../lib/model'
import { num, pct } from '../../lib/format'
import type { Analytics } from '../../lib/types'
import { Figure, Legend, Tooltip, linear, ticks, useReveal, type TipState } from './chart-kit'

const data = analytics as Analytics

/* ==========================================================================
   Calibration — is a stated 70% actually worth 70%?
   ========================================================================== */

export function CalibrationChart({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = data.neuralNetwork.calibration
  const maxCount = Math.max(...rows.map((r) => r.count))

  return (
    <Figure
      number={number}
      title="When it says 70%, it means about 70%"
      subtitle="Predicted probability against what actually happened, in 5-point bins. Points on the diagonal are honestly calibrated; below it means overconfidence."
      source="Marker size scales with how many held-out matches fell in that bin. The model is well behaved in the middle and slightly overconfident at the edges."
      legend={
        <Legend
          items={[
            { label: 'Held-out matches, binned', color: 'var(--series-1)' },
            { label: 'Perfect calibration', color: 'var(--ink-3)' },
          ]}
        />
      }
      table={{
        columns: ['Predicted', 'Actual', 'Matches'],
        rows: rows.map((r) => [pct(r.predicted, 1), pct(r.actual, 1), num(r.count)]),
      }}
    >
      {(width) => {
        const size = Math.min(width, 460)
        const M = 44
        const plot = size - M - 16
        const x = linear(0, 1, 0, plot)
        const y = linear(0, 1, plot, 0)

        return (
          <div className="chart chart--square">
            <svg ref={ref} width={size} height={size} role="img" aria-label="Calibration curve">
              {ticks(0, 1, 4).map((t) => (
                <g key={t}>
                  <line x1={M} y1={12 + y(t)} x2={M + plot} y2={12 + y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <line x1={M + x(t)} y1={12} x2={M + x(t)} y2={12 + plot} stroke="var(--grid)" strokeWidth="1" />
                  <text x={M - 8} y={16 + y(t)} className="ax" textAnchor="end">
                    {(t * 100).toFixed(0)}
                  </text>
                  <text x={M + x(t)} y={size - 22} className="ax" textAnchor="middle">
                    {(t * 100).toFixed(0)}
                  </text>
                </g>
              ))}

              <line
                x1={M}
                y1={12 + y(0)}
                x2={M + plot}
                y2={12 + y(1)}
                stroke="var(--ink-3)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />

              {rows.map((r, i) => (
                <circle
                  key={i}
                  cx={M + x(r.predicted)}
                  cy={12 + y(r.actual)}
                  r={shown ? 5 + (r.count / maxCount) * 9 : 0}
                  fill="var(--series-1)"
                  fillOpacity="0.75"
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                  className="dot"
                  style={{ transitionDelay: `${i * 25}ms` }}
                  onMouseEnter={() =>
                    setTip({
                      x: M + x(r.predicted),
                      y: 12 + y(r.actual),
                      title: `Model said ~${pct(r.predicted, 0)}`,
                      lines: [
                        { label: 'Actually won', value: pct(r.actual, 1) },
                        { label: 'Matches', value: num(r.count) },
                      ],
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                />
              ))}

              <text x={M + plot / 2} y={size - 4} className="ax ax--axis-title" textAnchor="middle">
                predicted win probability (%)
              </text>
              <text
                x={12}
                y={12 + plot / 2}
                className="ax ax--axis-title"
                textAnchor="middle"
                transform={`rotate(-90 12 ${12 + plot / 2})`}
              >
                observed win rate (%)
              </text>
            </svg>
            <Tooltip tip={tip} width={size} />
          </div>
        )
      }}
    </Figure>
  )
}

/* ==========================================================================
   ROC — ranking matches better than it calls them
   ========================================================================== */

export function RocChart({ number }: { number: number }) {
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = data.neuralNetwork.roc
  const auc = data.neuralNetwork.auc

  return (
    <Figure
      number={number}
      title="A real edge, just not a decisive one"
      subtitle={`The network separates winners from losers better than chance — an AUC of ${auc.toFixed(3)}, where 0.5 is a coin flip and 1.0 is perfect.`}
      source="AUC measures ranking quality rather than accuracy: it asks how often a randomly chosen winner is scored above a randomly chosen loser."
      table={{
        columns: ['False positive rate', 'True positive rate'],
        rows: rows.filter((_, i) => i % 6 === 0).map((r) => [r.fpr.toFixed(3), r.tpr.toFixed(3)]),
      }}
    >
      {(width) => {
        const size = Math.min(width, 460)
        const M = 44
        const plot = size - M - 16
        const x = linear(0, 1, 0, plot)
        const y = linear(0, 1, plot, 0)
        const path = rows.map((r, i) => `${i ? 'L' : 'M'} ${M + x(r.fpr)} ${12 + y(r.tpr)}`).join(' ')
        const area = `${path} L ${M + x(1)} ${12 + y(0)} Z`

        return (
          <div className="chart chart--square">
            <svg ref={ref} width={size} height={size} role="img" aria-label="ROC curve">
              {ticks(0, 1, 4).map((t) => (
                <g key={t}>
                  <line x1={M} y1={12 + y(t)} x2={M + plot} y2={12 + y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <text x={M - 8} y={16 + y(t)} className="ax" textAnchor="end">
                    {t.toFixed(1)}
                  </text>
                  <text x={M + x(t)} y={size - 22} className="ax" textAnchor="middle">
                    {t.toFixed(1)}
                  </text>
                </g>
              ))}

              <path d={area} fill="var(--series-1)" fillOpacity={shown ? 0.14 : 0} className="area" />
              <line
                x1={M}
                y1={12 + y(0)}
                x2={M + plot}
                y2={12 + y(1)}
                stroke="var(--ink-3)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <path
                d={path}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="line"
                style={{ strokeDasharray: 2200, strokeDashoffset: shown ? 0 : 2200 }}
              />

              <text x={M + plot * 0.52} y={12 + y(0.42)} className="ax ax--ref">
                AUC {auc.toFixed(3)}
              </text>
              <text x={M + plot * 0.42} y={12 + y(0.3)} className="ax" transform={`rotate(-38 ${M + plot * 0.42} ${12 + y(0.3)})`}>
                chance
              </text>

              <text x={M + plot / 2} y={size - 4} className="ax ax--axis-title" textAnchor="middle">
                false positive rate
              </text>
              <text
                x={12}
                y={12 + plot / 2}
                className="ax ax--axis-title"
                textAnchor="middle"
                transform={`rotate(-90 12 ${12 + plot / 2})`}
              >
                true positive rate
              </text>
            </svg>
          </div>
        )
      }}
    </Figure>
  )
}

/* ==========================================================================
   Response curve — the shape the network actually learned, sampled live
   ========================================================================== */

export function ResponseCurve({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const curve = useMemo(() => responseCurve(121, 300), [])

  return (
    <Figure
      number={number}
      title="The curve the network actually learned"
      subtitle="Win probability as the ranking gap widens, with points, age and height held level. Sampled live from the same weights the predictor runs on."
      source="A 100-place ranking advantage is worth far less than intuition suggests, and the curve flattens hard past about 150 places."
      table={{
        columns: ['Ranking gap (places better)', 'Win probability'],
        rows: curve
          .filter((_, i) => i % 10 === 0)
          .map((p) => [(-p.gap).toFixed(0), pct(p.prob, 1)]),
      }}
    >
      {(width) => {
        const H = 320
        const MB = 46
        const MT = 18
        const ML = 46
        const plotH = H - MB - MT
        const plotW = width - ML - 14
        const x = linear(-300, 300, 0, plotW)
        const y = linear(0, 1, plotH, 0)
        const path = curve.map((p, i) => `${i ? 'L' : 'M'} ${ML + x(p.gap)} ${MT + y(p.prob)}`).join(' ')

        const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - rect.left - ML
          const gap = -300 + (px / plotW) * 600
          if (gap < -300 || gap > 300) return setTip(null)
          const point = curve.reduce((best, p) =>
            Math.abs(p.gap - gap) < Math.abs(best.gap - gap) ? p : best,
          )
          setTip({
            x: ML + x(point.gap),
            y: MT + y(point.prob),
            title: point.gap === 0 ? 'Level on ranking' : `${Math.abs(point.gap).toFixed(0)} places ${point.gap < 0 ? 'better' : 'worse'}`,
            lines: [{ label: 'Win probability', value: pct(point.prob, 1) }],
          })
        }

        return (
          <div className="chart">
            <svg
              ref={ref}
              width={width}
              height={H}
              role="img"
              aria-label="Model response to ranking gap"
              onMouseMove={onMove}
              onMouseLeave={() => setTip(null)}
            >
              {ticks(0, 1, 4).map((t) => (
                <g key={t}>
                  <line x1={ML} y1={MT + y(t)} x2={width} y2={MT + y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <text x={ML - 8} y={MT + y(t) + 4} className="ax" textAnchor="end">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              {[-300, -200, -100, 0, 100, 200, 300].map((g) => (
                <text key={g} x={ML + x(g)} y={H - 26} className="ax" textAnchor="middle">
                  {g === 0 ? '0' : g < 0 ? `+${-g}` : `−${g}`}
                </text>
              ))}

              {/* the coin-flip line and the point of equality */}
              <line x1={ML} y1={MT + y(0.5)} x2={width} y2={MT + y(0.5)} stroke="var(--axis)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1={ML + x(0)} y1={MT} x2={ML + x(0)} y2={MT + plotH} stroke="var(--axis)" strokeWidth="1.5" strokeDasharray="4 4" />

              <path
                d={path}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="line"
                style={{ strokeDasharray: 2400, strokeDashoffset: shown ? 0 : 2400 }}
              />

              {tip && (
                <circle cx={tip.x} cy={tip.y} r="6" fill="var(--ball)" stroke="var(--surface-1)" strokeWidth="2" />
              )}

              <text x={ML + plotW / 2} y={H - 6} className="ax ax--axis-title" textAnchor="middle">
                {width < 560
                  ? '← A ranked better · places · A ranked worse →'
                  : '← player A ranked better · ranking places · player A ranked worse →'}
              </text>
            </svg>
            <Tooltip tip={tip} width={width} />
          </div>
        )
      }}
    </Figure>
  )
}
