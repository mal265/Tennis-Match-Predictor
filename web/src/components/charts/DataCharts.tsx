import { useState } from 'react'
import analytics from '../../data/analytics.json'
import { SURFACE_COLOR, num, pct } from '../../lib/format'
import type { Analytics } from '../../lib/types'
import { Figure, Legend, Tooltip, linear, ticks, useReveal, type TipState } from './chart-kit'

const data = analytics as Analytics

/** Horizontal spacing between points on a line chart, used to size hover targets. */
const pointSpacing = (plotW: number, count: number) => plotW / (count - 1)

/* ==========================================================================
   Surface — the favourite wins at nearly the same rate everywhere
   ========================================================================== */

export function SurfaceChart({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = data.bySurface

  return (
    <Figure
      number={number}
      title="Surface barely moves the odds"
      subtitle="Share of matches won by the better-ranked player, by court surface, across all 25 seasons."
      source="Bars start at zero. Hard courts favour the favourite most, carpet least — a spread of under three percentage points."
      legend={
        <Legend
          items={rows.map((r) => ({
            label: `${r.surface} · ${num(r.matches)} matches`,
            color: SURFACE_COLOR[r.surface] ?? 'var(--series-1)',
          }))}
        />
      }
      table={{
        columns: ['Surface', 'Matches', 'Favourite win rate', 'Avg minutes', 'Avg aces'],
        rows: rows.map((r) => [
          r.surface,
          num(r.matches),
          pct(r.favoriteWinRate, 1),
          r.avgMinutes,
          r.avgAces,
        ]),
      }}
    >
      {(width) => {
        const H = 300
        const MB = 52
        const MT = 24
        const plotH = H - MB - MT
        const band = width / rows.length
        const y = linear(0, 0.8, plotH, 0)

        return (
          <div className="chart">
            <svg ref={ref} width={width} height={H} role="img" aria-label="Favourite win rate by surface">
              {ticks(0, 0.8, 4).map((t) => (
                <g key={t}>
                  <line
                    x1={0}
                    y1={MT + y(t)}
                    x2={width}
                    y2={MT + y(t)}
                    stroke="var(--grid)"
                    strokeWidth="1"
                  />
                  <text x={2} y={MT + y(t) - 5} className="ax">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              {rows.map((r, i) => {
                const w = Math.min(band - 26, 120)
                const cx = i * band + band / 2
                const h = shown ? plotH - y(r.favoriteWinRate) : 0
                return (
                  <g
                    key={r.surface}
                    onMouseEnter={() =>
                      setTip({
                        x: cx,
                        y: MT + y(r.favoriteWinRate),
                        title: r.surface,
                        lines: [
                          { label: 'Favourite wins', value: pct(r.favoriteWinRate, 1) },
                          { label: 'Matches', value: num(r.matches) },
                          { label: 'Avg length', value: `${r.avgMinutes} min` },
                          { label: 'Avg aces', value: String(r.avgAces) },
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={i * band} y={MT} width={band} height={plotH} fill="transparent" />
                    <rect
                      x={cx - w / 2}
                      y={MT + plotH - h}
                      width={w}
                      height={h}
                      rx="4"
                      fill={SURFACE_COLOR[r.surface] ?? 'var(--series-1)'}
                      className="bar bar--v"
                    />
                    <text x={cx} y={MT + y(r.favoriteWinRate) - 10} className="ax ax--value" textAnchor="middle">
                      {pct(r.favoriteWinRate, 1)}
                    </text>
                    <text x={cx} y={H - 30} className="ax ax--name" textAnchor="middle">
                      {r.surface}
                    </text>
                    <text x={cx} y={H - 13} className="ax" textAnchor="middle">
                      {num(r.matches)}
                    </text>
                  </g>
                )
              })}
            </svg>
            <Tooltip tip={tip} width={width} />
          </div>
        )
      }}
    </Figure>
  )
}

/* ==========================================================================
   Rank gap — where prediction actually gets easy
   ========================================================================== */

export function RankGapChart({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = data.rankGap

  return (
    <Figure
      number={number}
      title="Prediction only gets easy when the gap is huge"
      subtitle="Accuracy by how many ranking places separate the two players. Near-equals are close to a coin flip for both the baseline and the network."
      source="Held-out matches only. The network's edge over the baseline is largest in the middle bands, and vanishes at the extremes."
      legend={
        <Legend
          items={[
            { label: 'Favourite-wins baseline', color: 'var(--series-1)' },
            { label: 'Neural network', color: 'var(--series-2)' },
          ]}
        />
      }
      table={{
        columns: ['Ranking gap', 'Matches', 'Baseline', 'Neural network'],
        rows: rows.map((r) => [r.label, num(r.matches), pct(r.baseline, 1), pct(r.model, 1)]),
      }}
    >
      {(width) => {
        const H = 320
        const MB = 56
        const MT = 22
        const plotH = H - MB - MT
        const band = width / rows.length
        const y = linear(0, 0.8, plotH, 0)
        const bw = Math.min((band - 30) / 2, 40)

        return (
          <div className="chart">
            <svg ref={ref} width={width} height={H} role="img" aria-label="Accuracy by ranking gap">
              {ticks(0, 0.8, 4).map((t) => (
                <g key={t}>
                  <line x1={0} y1={MT + y(t)} x2={width} y2={MT + y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <text x={2} y={MT + y(t) - 5} className="ax">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              {rows.map((r, i) => {
                const cx = i * band + band / 2
                const hb = shown ? plotH - y(r.baseline) : 0
                const hm = shown ? plotH - y(r.model) : 0
                return (
                  <g
                    key={r.label}
                    onMouseEnter={() =>
                      setTip({
                        x: cx,
                        y: MT + Math.min(y(r.baseline), y(r.model)),
                        title: `${r.label} places apart`,
                        lines: [
                          { label: 'Baseline', value: pct(r.baseline, 1), color: 'var(--series-1)' },
                          { label: 'Network', value: pct(r.model, 1), color: 'var(--series-2)' },
                          { label: 'Matches', value: num(r.matches) },
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={i * band} y={MT} width={band} height={plotH} fill="transparent" />
                    {/* 2px gap keeps the pair readable as two marks */}
                    <rect
                      x={cx - bw - 1}
                      y={MT + plotH - hb}
                      width={bw}
                      height={hb}
                      rx="4"
                      fill="var(--series-1)"
                      className="bar bar--v"
                    />
                    <rect
                      x={cx + 1}
                      y={MT + plotH - hm}
                      width={bw}
                      height={hm}
                      rx="4"
                      fill="var(--series-2)"
                      className="bar bar--v"
                      style={{ transitionDelay: '90ms' }}
                    />
                    <text x={cx} y={H - 34} className="ax ax--name" textAnchor="middle">
                      {r.label}
                    </text>
                    <text x={cx} y={H - 17} className="ax" textAnchor="middle">
                      {num(r.matches)}
                    </text>
                  </g>
                )
              })}
              <text x={width / 2} y={H - 2} className="ax ax--axis-title" textAnchor="middle">
                ranking places between the two players
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
   By year — the ceiling has not moved in 25 seasons
   ========================================================================== */

export function YearChart({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = data.byYear
  const mean = data.dataset.favoriteWinRate

  return (
    <Figure
      number={number}
      title="Twenty-five seasons, one flat line"
      subtitle="Share of matches won by the better-ranked player, season by season. No trend, no drift — just noise around the same number."
      source="Every ATP match in the archive with both players ranked. The dashed line is the 25-season average."
      table={{
        columns: ['Season', 'Matches', 'Favourite win rate'],
        rows: rows.map((r) => [r.year, num(r.matches), pct(r.favoriteWinRate, 1)]),
      }}
    >
      {(width) => {
        const H = 300
        const MB = 42
        const MT = 20
        const ML = 40
        const plotH = H - MB - MT
        const plotW = width - ML - 12
        const lo = 0.55
        const hi = 0.75
        const x = linear(0, rows.length - 1, 0, plotW)
        const y = linear(lo, hi, plotH, 0)

        const path = rows
          .map((r, i) => `${i ? 'L' : 'M'} ${ML + x(i)} ${MT + y(r.favoriteWinRate)}`)
          .join(' ')

        return (
          <div className="chart">
            <svg ref={ref} width={width} height={H} role="img" aria-label="Favourite win rate by season">
              {ticks(lo, hi, 4).map((t) => (
                <g key={t}>
                  <line x1={ML} y1={MT + y(t)} x2={width} y2={MT + y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <text x={ML - 8} y={MT + y(t) + 4} className="ax" textAnchor="end">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}

              <line
                x1={ML}
                y1={MT + y(mean)}
                x2={width}
                y2={MT + y(mean)}
                stroke="var(--ball)"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text x={width - 4} y={MT + y(mean) - 8} className="ax ax--ref" textAnchor="end">
                25-season average {pct(mean, 1)}
              </text>

              <path
                d={path}
                fill="none"
                stroke="var(--series-1)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="line"
                style={{ strokeDasharray: 3000, strokeDashoffset: shown ? 0 : 3000 }}
              />

              {rows.map((r, i) => (
                <g
                  key={r.year}
                  onMouseEnter={() =>
                    setTip({
                      x: ML + x(i),
                      y: MT + y(r.favoriteWinRate),
                      title: String(r.year),
                      lines: [
                        { label: 'Favourite wins', value: pct(r.favoriteWinRate, 1) },
                        { label: 'Matches', value: num(r.matches) },
                      ],
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                >
                  <rect x={ML + x(i) - pointSpacing(plotW, rows.length) / 2} y={MT} width={pointSpacing(plotW, rows.length)} height={plotH} fill="transparent" />
                  <circle
                    cx={ML + x(i)}
                    cy={MT + y(r.favoriteWinRate)}
                    r="4.5"
                    fill="var(--surface-1)"
                    stroke="var(--series-1)"
                    strokeWidth="2"
                  />
                  {i % 4 === 0 && (
                    <text x={ML + x(i)} y={H - 16} className="ax" textAnchor="middle">
                      {r.year}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            <Tooltip tip={tip} width={width} />
          </div>
        )
      }}
    </Figure>
  )
}

/* ==========================================================================
   By tournament level — where favourites are safest
   ========================================================================== */

export function LevelChart({ number }: { number: number }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  const rows = data.byLevel
  const max = Math.max(...rows.map((r) => r.favoriteWinRate))

  return (
    <Figure
      number={number}
      title="Best-of-five protects the favourite"
      subtitle="Favourite win rate by tournament tier. Longer formats and stronger fields leave less room for a single hot set to decide things."
      source="Grand Slams and Davis Cup ties are played over five sets or in team formats; ATP Tour events are the widest and most volatile field."
      table={{
        columns: ['Tier', 'Matches', 'Favourite win rate'],
        rows: rows.map((r) => [r.level, num(r.matches), pct(r.favoriteWinRate, 1)]),
      }}
    >
      {() => (
        <div className="hbars" ref={ref}>
          {rows.map((r) => (
            <div className="hbars__row" key={r.level}>
              <span className="hbars__label">{r.level}</span>
              <span className="hbars__track">
                <span
                  className="hbars__fill"
                  style={{ width: shown ? `${(r.favoriteWinRate / max) * 100}%` : '0%' }}
                />
              </span>
              <span className="hbars__val num">{pct(r.favoriteWinRate, 1)}</span>
              <span className="hbars__count num">{num(r.matches)}</span>
            </div>
          ))}
        </div>
      )}
    </Figure>
  )
}
