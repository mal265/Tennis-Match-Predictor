import { useMemo, useState } from 'react'
import reportJson from '../../data/report2.json'
import { SURFACE_COLOR, liftPts, monthYear, num, pct } from '../../lib/format'
import type { RatedSurface, Report2 } from '../../lib/types'
import { Figure, Legend, Tooltip, linear, ticks, useReveal, type TipState } from './chart-kit'

const report = reportJson as Report2
const step = (key: string) => report.steps.find((s) => s.key === key)!

const pWords = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3))
const interval = (lo: number, hi: number) => `${liftPts(lo)} to ${liftPts(hi)}`

/* ==========================================================================
   The ladder — every model's lift over the baseline, with its uncertainty
   Dots and whiskers encode position, not length, so the axis needn't start at 0.
   ========================================================================== */

export function LadderChart({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const steps = report.steps
  const report1 = step('report1')

  return (
    <Figure
      number={number}
      title="Every input, measured against the baseline"
      subtitle={`Lift in accuracy over “the higher-ranked player wins”, with 95% intervals from a paired bootstrap on the same ${num(report.split.test)} held-out matches. A filled dot means the interval clears zero.`}
      source={`All eight models are logistic regressions. Grey is Report 1's four static inputs; blue rows add Report 2's rating features. The dashed line marks Report 1's lift of ${liftPts(report1.lift)} points.`}
      legend={
        <ul className="legend">
          <li>
            <svg className="legend__mark" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" fill="var(--series-1)" />
            </svg>
            Interval clears zero
          </li>
          <li>
            <svg className="legend__mark" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="4" fill="var(--surface-1)" stroke="var(--series-1)" strokeWidth="2" />
            </svg>
            Interval includes zero
          </li>
          <li>
            <svg className="legend__mark" viewBox="0 0 12 12" aria-hidden="true">
              <line x1="6" y1="0" x2="6" y2="12" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            Report 1's lift
          </li>
        </ul>
      }
      table={{
        columns: ['Model', 'Accuracy', 'Lift (pts)', '95% interval', 'McNemar p'],
        rows: steps.map((s) => [
          s.label,
          pct(s.accuracy, 2),
          liftPts(s.lift),
          interval(s.ciLow, s.ciHigh),
          pWords(s.pValue),
        ]),
      }}
    >
      {(width) => {
        const compact = width < 600
        const rowH = compact ? 54 : 42
        const ML = compact ? 0 : 190
        const MR = compact ? 4 : 176
        const top = 22
        const H = top + steps.length * rowH + 50
        const plotW = width - ML - MR
        const scale = linear(-0.5, 2.25, 0, plotW)
        const x = (points: number) => ML + scale(points)
        const gridBottom = H - 44

        return (
          <div className="chart">
            <svg
              ref={ref}
              width={width}
              height={H}
              role="img"
              aria-label="Accuracy lift over the baseline for each model, with 95% intervals"
            >
              {[-0.5, 0, 0.5, 1, 1.5, 2].map((t) => (
                <g key={t}>
                  <line
                    x1={x(t)}
                    y1={top - 10}
                    x2={x(t)}
                    y2={gridBottom}
                    stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
                    strokeWidth={t === 0 ? 1.5 : 1}
                  />
                  <text x={x(t)} y={gridBottom + 16} className="ax" textAnchor="middle">
                    {t > 0 ? `+${t}` : t}
                  </text>
                </g>
              ))}
              <text x={ML + plotW / 2} y={H - 4} className="ax ax--axis-title" textAnchor="middle">
                percentage points above the baseline
              </text>

              <line
                x1={x(report1.lift * 100)}
                y1={top - 10}
                x2={x(report1.lift * 100)}
                y2={gridBottom}
                stroke="var(--ink-3)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />

              {steps.map((s, i) => {
                const isReport1 = s.key === 'report1'
                const isFinal = s.key === 'final'
                const color = isReport1 ? 'var(--ink-3)' : 'var(--series-1)'
                const clears = s.ciLow > 0
                const rowTop = top + i * rowH
                const cy = compact ? rowTop + 36 : rowTop + rowH / 2
                const labelY = compact ? rowTop + 16 : cy + 4

                return (
                  <g
                    key={s.key}
                    onMouseEnter={() =>
                      setTip({
                        x: Math.min(x(s.ciHigh * 100) + 12, width - 24),
                        y: cy,
                        title: s.label,
                        lines: [
                          { label: 'Accuracy', value: pct(s.accuracy, 2) },
                          { label: 'Lift', value: `${liftPts(s.lift)} pts` },
                          { label: '95% interval', value: interval(s.ciLow, s.ciHigh) },
                          { label: 'McNemar p', value: pWords(s.pValue) },
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={0} y={rowTop} width={width} height={rowH} fill="transparent" />
                    <text
                      x={compact ? 0 : ML - 16}
                      y={labelY}
                      className={`ax ax--name ${isFinal ? 'ax--strong' : ''}`}
                      textAnchor={compact ? 'start' : 'end'}
                    >
                      {s.label}
                    </text>
                    <line
                      className="ladder-whisker"
                      x1={x(s.ciLow * 100)}
                      x2={x(s.ciHigh * 100)}
                      y1={cy}
                      y2={cy}
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity={shown ? 1 : 0}
                    />
                    <circle
                      className="ladder-dot"
                      cx={shown ? x(s.lift * 100) : x(0)}
                      cy={cy}
                      r={isFinal ? 7.5 : 5.5}
                      fill={clears ? color : 'var(--surface-1)'}
                      stroke={clears ? 'var(--surface-1)' : color}
                      strokeWidth="2"
                    />
                    <text
                      x={compact ? width : width - MR + 18}
                      y={labelY}
                      className={`ax ax--value ${isFinal ? 'ax--strong' : ''}`}
                      textAnchor={compact ? 'end' : 'start'}
                    >
                      {liftPts(s.lift)}
                      {!compact && (
                        <tspan dx="8" className="ax--delta">
                          {interval(s.ciLow, s.ciHigh)}
                        </tspan>
                      )}
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
   The leaderboards — a sanity check that the ratings mean something
   ========================================================================== */

const SURFACES: RatedSurface[] = ['Hard', 'Clay', 'Grass']

export function EloTables({ number }: { number: number }) {
  const { peak, surfaces } = report.leaders

  return (
    <Figure
      number={number}
      title="The ratings pass the eye test"
      subtitle="The highest Elo each player reached in the archive, and the best rating on each surface as of a player's last match there."
      source="Peaks need at least 100 matches; surface lists need at least 50 on that surface. A rating stops moving when a player stops playing, so retired players appear as they finished — Roger Federer's last grass match came at 39."
      table={{
        columns: ['List', 'Rank', 'Player', 'Elo', 'Detail'],
        rows: [
          ...peak.map((p, i) => ['All-time peak', i + 1, p.name, p.rating, monthYear(p.date)]),
          ...SURFACES.flatMap((s) =>
            surfaces[s].map((p, i) => [`${s}, latest`, i + 1, p.name, p.rating, `${num(p.games)} matches`]),
          ),
        ],
      }}
    >
      {() => (
        <div className="elo-boards">
          <Board
            title="All-time peak"
            className="elo-board--peak"
            rows={peak.slice(0, 8).map((p) => ({ name: p.name, rating: p.rating, meta: monthYear(p.date) }))}
          />
          {SURFACES.map((s) => (
            <Board
              key={s}
              title={s}
              swatch={SURFACE_COLOR[s]}
              rows={surfaces[s].slice(0, 4).map((p) => ({
                name: p.name,
                rating: p.rating,
                meta: `${num(p.games)} on ${s.toLowerCase()}`,
              }))}
            />
          ))}
        </div>
      )}
    </Figure>
  )
}

function Board({
  title,
  rows,
  swatch,
  className = '',
}: {
  title: string
  rows: { name: string; rating: number; meta: string }[]
  swatch?: string
  className?: string
}) {
  return (
    <div className={`elo-board ${className}`}>
      <p className="elo-board__title">
        {swatch && <span className="swatch" style={{ background: swatch }} aria-hidden="true" />}
        {title}
      </p>
      <ol>
        {rows.map((row, i) => (
          <li key={row.name}>
            <span className="elo-board__rank num">{i + 1}</span>
            <span className="elo-board__name">
              {row.name}
              <em>{row.meta}</em>
            </span>
            <b className="num">{Math.round(row.rating)}</b>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ==========================================================================
   Rating histories — five careers on one scale
   ========================================================================== */

// Fixed slot order, validated for adjacent-pair separation in both themes.
const TRAJECTORY_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)']
const GAP_MONTHS = 4

interface Point {
  m: number
  r: number
}

const monthIndex = (t: string) => {
  const [year, month] = t.split('-').map(Number)
  return (year - 2000) * 12 + (month - 1)
}

const monthLabel = (m: number) =>
  new Date(Date.UTC(2000, m, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

/** Break a line wherever a player went more than GAP_MONTHS without a match. */
function segments(points: Point[]): Point[][] {
  const out: Point[][] = []
  points.forEach((p, i) => {
    if (i === 0 || p.m - points[i - 1].m > GAP_MONTHS) out.push([])
    out[out.length - 1].push(p)
  })
  return out
}

function ratingAt(points: Point[], m: number): Point | null {
  let found: Point | null = null
  for (const p of points) {
    if (p.m > m) break
    found = p
  }
  return found && m - found.m <= GAP_MONTHS ? found : null
}

export function Trajectories({ number }: { number: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()

  const series = useMemo(
    () =>
      report.trajectories.map((t, i) => ({
        name: t.name,
        short: t.name.split(' ').slice(1).join(' '),
        color: TRAJECTORY_COLORS[i],
        peak: { m: monthIndex(t.peak.t), r: t.peak.r },
        points: t.points.map((p) => ({ m: monthIndex(p.t), r: p.r })),
      })),
    [],
  )
  const lastMonth = Math.max(...series.flatMap((s) => s.points.map((p) => p.m)))

  return (
    <Figure
      number={number}
      title="Five careers on one rating scale"
      subtitle="Each player's Elo after their last match of every month. A break in a line is a spell of more than four months without a match."
      source="Because the step size shrinks with every match played, newcomers climb steeply while established players move only when a run of results insists."
      legend={
        <Legend
          items={series.map((s) => ({ label: `${s.name} · peak ${Math.round(s.peak.r)}`, color: s.color }))}
        />
      }
      table={{
        columns: ['Player', 'First rated', 'Peak', 'Peak month', 'Latest'],
        rows: report.trajectories.map((t) => {
          const last = t.points[t.points.length - 1]
          return [
            t.name,
            monthLabel(monthIndex(t.points[0].t)),
            Math.round(t.peak.r),
            monthLabel(monthIndex(t.peak.t)),
            `${Math.round(last.r)} (${monthLabel(monthIndex(last.t))})`,
          ]
        }),
      }}
    >
      {(width) => {
        const compact = width < 560
        const H = compact ? 300 : 360
        const ML = 44
        const MR = compact ? 10 : 82
        const MT = 14
        const MB = 28
        const plotW = width - ML - MR
        const plotH = H - MT - MB
        const x = (m: number) => ML + (m / lastMonth) * plotW
        const y = linear(1450, 2475, MT + plotH, MT)
        const path = (seg: Point[]) =>
          seg.map((p, i) => `${i ? 'L' : 'M'} ${x(p.m).toFixed(1)} ${y(p.r).toFixed(1)}`).join(' ')

        // Direct labels at each line's end, nudged apart where neighbours would collide.
        const labels = series
          .map((s) => {
            const last = s.points[s.points.length - 1]
            return { key: s.name, text: s.short, x: x(last.m) + 8, y: y(last.r) + 4 }
          })
          .sort((p, q) => p.y - q.y)
        const placed: typeof labels = []
        for (const label of labels) {
          const lowest = placed
            .filter((p) => Math.abs(p.x - label.x) < 60)
            .reduce((acc, p) => Math.max(acc, p.y), -Infinity)
          if (label.y - lowest < 14) label.y = lowest + 14
          placed.push(label)
        }

        const active =
          hover === null
            ? []
            : series.flatMap((s) => {
                const p = ratingAt(s.points, hover)
                return p ? [{ s, p }] : []
              })

        const tip: TipState | null =
          hover === null || active.length === 0
            ? null
            : {
                x: x(hover) + 12,
                y: MT + 70,
                title: monthLabel(hover),
                lines: [...active]
                  .sort((p, q) => q.p.r - p.p.r)
                  .map(({ s, p }) => ({ label: s.name, value: String(Math.round(p.r)), color: s.color })),
              }

        const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const m = Math.round(((e.clientX - rect.left - ML) / plotW) * lastMonth)
          setHover(m < 0 || m > lastMonth ? null : m)
        }

        return (
          <div className="chart">
            <svg
              ref={ref}
              width={width}
              height={H}
              role="img"
              aria-label="Elo rating histories for five players"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            >
              {[1500, 1750, 2000, 2250].map((t) => (
                <g key={t}>
                  <line x1={ML} x2={ML + plotW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
                  <text x={ML - 8} y={y(t) + 4} className="ax" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}
              {[2000, 2004, 2008, 2012, 2016, 2020, 2024].map((year) => (
                <text key={year} x={x((year - 2000) * 12)} y={H - 8} className="ax" textAnchor="middle">
                  {year}
                </text>
              ))}

              {hover !== null && (
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={MT}
                  y2={MT + plotH}
                  stroke="var(--axis)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {series.map((s) =>
                segments(s.points).map((seg, j) => (
                  <path
                    key={`${s.name}-${j}`}
                    d={path(seg)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    pathLength={1}
                    className="traj-line"
                    style={{ strokeDasharray: 1, strokeDashoffset: shown ? 0 : 1 }}
                  />
                )),
              )}

              {series.map((s) => (
                <circle
                  key={`${s.name}-peak`}
                  cx={x(s.peak.m)}
                  cy={y(s.peak.r)}
                  r="4.5"
                  fill={s.color}
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                  opacity={shown ? 1 : 0}
                  className="ladder-whisker"
                />
              ))}

              {active.map(({ s, p }) => (
                <circle
                  key={`${s.name}-hover`}
                  cx={x(p.m)}
                  cy={y(p.r)}
                  r="4.5"
                  fill={s.color}
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                />
              ))}

              {!compact &&
                labels.map((label) => (
                  <text key={label.key} x={label.x} y={label.y} className="traj-label">
                    {label.text}
                  </text>
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
   Where the gain lives — lift over baseline by ranking gap
   ========================================================================== */

export function BandLift({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const bands = report.rankBands
  const widest = bands[bands.length - 1]

  return (
    <Figure
      number={number}
      title="The gain lives in the close matches"
      subtitle="Accuracy lift over the baseline, by how many ranking places separate the two players. Where rankings are nearly level, ratings built from results have the most to add."
      source={`Held-out matches only; bars start at zero. In the widest mismatches (${widest.label} places), where rankings alone already call ${pct(widest.baseline, 0)} of matches, the final model trails the baseline by ${Math.abs(widest.finalLift * 100).toFixed(2)} points.`}
      legend={
        <Legend
          items={[
            { label: 'Report 1 model', color: 'var(--ink-3)' },
            { label: 'Report 2 final model', color: 'var(--series-1)' },
          ]}
        />
      }
      table={{
        columns: ['Ranking gap', 'Matches', 'Baseline', 'Report 1 lift', 'Report 2 lift'],
        rows: bands.map((b) => [
          b.label,
          num(b.matches),
          pct(b.baseline, 1),
          liftPts(b.report1Lift),
          liftPts(b.finalLift),
        ]),
      }}
    >
      {(width) => {
        const H = 320
        const MT = 14
        const MB = 60
        const ML = 34
        const plotH = H - MT - MB
        const plotW = width - ML
        const band = plotW / bands.length
        // Under ~56px per band the labels collide, so shrink them and drop the counts.
        const narrow = band < 56
        const y = linear(-3, 5, MT + plotH, MT)
        const bw = Math.max(6, Math.min((band - 20) / 2, 34))

        const bar = (value: number, left: number, color: string, delay: number) => {
          const v = shown ? value * 100 : 0
          const top = y(Math.max(0, v))
          const bottom = y(Math.min(0, v))
          return (
            <rect
              x={left}
              y={top}
              width={bw}
              height={Math.max(bottom - top, 1)}
              rx="3"
              fill={color}
              className="bar bar--v"
              style={{ transitionDelay: `${delay}ms` }}
            />
          )
        }

        return (
          <div className="chart">
            <svg
              ref={ref}
              width={width}
              height={H}
              role="img"
              aria-label="Accuracy lift over the baseline by ranking gap, Report 1 against Report 2"
            >
              {[-2, 0, 2, 4].map((t) => (
                <g key={t}>
                  <line
                    x1={ML}
                    x2={width}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'}
                    strokeWidth={t === 0 ? 1.5 : 1}
                  />
                  <text x={ML - 6} y={y(t) + 4} className="ax" textAnchor="end">
                    {t > 0 ? `+${t}` : t}
                  </text>
                </g>
              ))}

              {bands.map((b, i) => {
                const cx = ML + i * band + band / 2
                return (
                  <g
                    key={b.label}
                    onMouseEnter={() =>
                      setTip({
                        x: cx,
                        y: y(Math.max(b.report1Lift, b.finalLift, 0) * 100),
                        title: `${b.label} places apart`,
                        lines: [
                          { label: 'Report 1', value: `${liftPts(b.report1Lift)} pts`, color: 'var(--ink-3)' },
                          { label: 'Report 2', value: `${liftPts(b.finalLift)} pts`, color: 'var(--series-1)' },
                          { label: 'Baseline', value: pct(b.baseline, 1) },
                          { label: 'Matches', value: num(b.matches) },
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  >
                    <rect x={ML + i * band} y={MT} width={band} height={plotH} fill="transparent" />
                    {bar(b.report1Lift, cx - bw - 1, 'var(--ink-3)', 0)}
                    {bar(b.finalLift, cx + 1, 'var(--series-1)', 90)}
                    <text
                      x={cx}
                      y={H - 40}
                      className={`ax ax--name ${narrow ? 'ax--tiny' : ''}`}
                      textAnchor="middle"
                    >
                      {b.label}
                    </text>
                    {!narrow && (
                      <text x={cx} y={H - 24} className="ax" textAnchor="middle">
                        {num(b.matches)}
                      </text>
                    )}
                  </g>
                )
              })}

              <text x={ML + plotW / 2} y={H - 4} className="ax ax--axis-title" textAnchor="middle">
                {width < 560
                  ? 'ranking places apart · lift in points'
                  : 'ranking places between the players · lift in percentage points'}
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
   What each input is worth — permutation importance, one hue
   ========================================================================== */

export function InputWorth({ number }: { number: number }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  const rows = report.importance
  const max = Math.max(...rows.map((r) => r.drop))
  const lastStep = (step('final').accuracy - step('surface').accuracy) * 100
  const direction = (coef: number) => (coef > 0 ? 'higher helps' : 'higher hurts')

  return (
    <Figure
      number={number}
      title="Two ratings do the heavy lifting"
      subtitle="How much accuracy the final model loses when each input is shuffled across matches, averaged over ten shuffles."
      source={`Head-to-head, rest and experience are each worth a fraction of a point alone; together they add the last ${lastStep.toFixed(2)} points on the ladder.`}
      table={{
        columns: ['Input', 'Accuracy lost (pts)', 'Coefficient', 'Direction'],
        rows: rows.map((r) => [r.label, (r.drop * 100).toFixed(2), r.coef.toPrecision(3), direction(r.coef)]),
      }}
    >
      {() => (
        <div className="hbars worth" ref={ref}>
          {rows.map((r) => (
            <div className="hbars__row" key={r.feature}>
              <span className="hbars__label">{r.label}</span>
              <span className="hbars__track">
                <span
                  className="hbars__fill"
                  style={{ width: shown ? `${(Math.max(r.drop, 0) / max) * 100}%` : '0%' }}
                />
              </span>
              <span className="hbars__val num">{(r.drop * 100).toFixed(2)}</span>
              <span className="worth__dir">{direction(r.coef)}</span>
            </div>
          ))}
        </div>
      )}
    </Figure>
  )
}

/* ==========================================================================
   Calibration of the final model
   ========================================================================== */

export function Calibration2({ number }: { number: number }) {
  const [tip, setTip] = useState<TipState | null>(null)
  const [ref, shown] = useReveal<SVGSVGElement>()
  const rows = report.calibration
  const maxCount = Math.max(...rows.map((r) => r.count))
  const worst = rows.reduce((w, r) => Math.max(w, Math.abs(r.predicted - r.actual)), 0)

  return (
    <Figure
      number={number}
      title="Are its probabilities honest?"
      subtitle="The final model's predicted win probability against what actually happened, in 5-point bins. Points on the diagonal mean a stated 70% really does win about 70% of the time."
      source={`Marker size scales with matches per bin. Across all ${rows.length} bins, the largest gap between stated and observed win rate is ${(worst * 100).toFixed(1)} points.`}
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
            <svg ref={ref} width={size} height={size} role="img" aria-label="Calibration of the final model">
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
