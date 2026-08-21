import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Charts render at true pixel width, so labels never scale with the viewBox. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

export interface TableSpec {
  columns: string[]
  rows: (string | number)[][]
}

interface FigureProps {
  number?: number
  title: string
  subtitle?: string
  source?: string
  table: TableSpec
  children: (width: number) => ReactNode
  /** Rendered under the chart, above the source line. */
  legend?: ReactNode
  wide?: boolean
}

/**
 * The frame every chart sits in: caption, the chart itself, a legend slot, and
 * a table view — which is also the relief channel for the light-mode series
 * colours that sit below 3:1 against the surface.
 */
export function Figure({
  number,
  title,
  subtitle,
  source,
  table,
  children,
  legend,
  wide,
}: FigureProps) {
  const [showTable, setShowTable] = useState(false)
  const { ref, width } = useMeasure<HTMLDivElement>()

  return (
    <figure className={`figure ${wide ? 'figure--wide' : ''}`}>
      <figcaption className="figure__head">
        <div>
          {number !== undefined && <span className="figure__number num">Fig. {number}</span>}
          <h3 className="figure__title">{title}</h3>
          {subtitle && <p className="figure__subtitle">{subtitle}</p>}
        </div>
        <button
          className="figure__toggle"
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? 'Chart' : 'Table'}
        </button>
      </figcaption>

      <div className="figure__body" ref={ref}>
        {showTable ? (
          <DataTable {...table} />
        ) : (
          width > 0 && children(width)
        )}
      </div>

      {legend && !showTable && <div className="figure__legend">{legend}</div>}
      {source && <p className="figure__source">{source}</p>}
    </figure>
  )
}

export function DataTable({ columns, rows }: TableSpec) {
  return (
    <div className="dtable__scroll">
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={j === 0 ? '' : 'num'}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className="swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export interface TipState {
  x: number
  y: number
  title: string
  lines: { label: string; value: string; color?: string }[]
}

export function Tooltip({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null
  // Flip the card before it runs off the right edge.
  const flip = tip.x > width - 190
  return (
    <div
      className="tip"
      style={{ left: tip.x, top: tip.y, transform: `translate(${flip ? '-100%' : '0'}, -50%)` }}
      role="status"
    >
      <p className="tip__title">{tip.title}</p>
      {tip.lines.map((line) => (
        <p className="tip__line" key={line.label}>
          {line.color && (
            <span className="swatch" style={{ background: line.color }} aria-hidden="true" />
          )}
          <span>{line.label}</span>
          <b className="num">{line.value}</b>
        </p>
      ))}
    </div>
  )
}

/**
 * Reveals a chart when it first scrolls into view, so bars grow on arrival.
 * This has to be a callback ref: the chart mounts one commit after its Figure
 * measures itself, so an effect that ran on mount would find no element to
 * observe and the bars would sit at zero forever.
 */
export function useReveal<T extends Element>() {
  const [shown, setShown] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect()
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.current?.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
    )
    observer.current.observe(node)
  }, [])

  return [ref, shown] as const
}

/* --- small scale helpers -------------------------------------------------- */

export const linear =
  (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
    r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

export function ticks(min: number, max: number, count = 5): number[] {
  const span = max - min
  const raw = span / count
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10
  const out: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(+t.toFixed(10))
  return out
}
