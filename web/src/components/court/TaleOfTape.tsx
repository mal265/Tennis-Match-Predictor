import type { Conditions } from '../../lib/elo-model'
import { num, surname } from '../../lib/format'
import type { Player } from '../../lib/types'

interface Row {
  label: string
  a: number
  b: number
  show: (value: number, side: 'a' | 'b') => string
  /** The direction the model rewards, read off the sign of its coefficient. */
  edge: 'higher' | 'lower'
  /** Ratings sit far from zero, so shares are measured above this floor. */
  floor?: number
  note: string
}

function shareA(row: Row): number {
  const above = (v: number) => Math.max(0, v - (row.floor ?? 0))
  let wa = above(row.a)
  let wb = above(row.b)
  if (row.edge === 'lower') [wa, wb] = [wb, wa]
  return wa + wb === 0 ? 50 : (wa / (wa + wb)) * 100
}

function edgeOf(row: Row): 'a' | 'b' | null {
  if (row.a === row.b) return null
  return (row.edge === 'higher') === row.a > row.b ? 'a' : 'b'
}

export default function TaleOfTape({
  a,
  b,
  conditions,
}: {
  a: Player
  b: Player
  conditions: Conditions
}) {
  const { surface } = conditions
  const sa = a.rating.surfaces[surface]
  const sb = b.rating.surfaces[surface]
  const winsA = a.h2h[b.id]?.wins ?? 0
  const winsB = a.h2h[b.id]?.losses ?? 0
  const meetings = winsA + winsB
  const court = surface.toLowerCase()

  const rows: Row[] = [
    {
      label: 'Elo rating',
      a: a.rating.elo,
      b: b.rating.elo,
      show: (v, side) => `${Math.round(v)}${(side === 'a' ? a : b).rating.rated ? '' : '*'}`,
      edge: 'higher',
      floor: 1200,
      note:
        a.rating.rated && b.rating.rated
          ? 'The strongest input: one number, updated after every match.'
          : 'The strongest input. * No archive matches, so it starts at 1,500.',
    },
    {
      label: `${surface} Elo`,
      a: sa.rating,
      b: sb.rating,
      show: (v, side) => `${Math.round(v)}${(side === 'a' ? sa : sb).games ? '' : '*'}`,
      edge: 'higher',
      floor: 1200,
      note:
        sa.games && sb.games
          ? `Built from ${court}-court matches only.`
          : `Built from ${court}-court matches only. * None yet — starts at 1,500.`,
    },
    {
      label: 'Head-to-head wins',
      a: winsA,
      b: winsB,
      show: (v) => String(v),
      edge: 'higher',
      note: meetings
        ? `${meetings} previous ${meetings === 1 ? 'meeting' : 'meetings'} in the archive.`
        : 'Never met, which the model reads as level.',
    },
    {
      label: 'Days of rest',
      a: conditions.restA,
      b: conditions.restB,
      show: (v) => `${v}d`,
      edge: 'lower',
      note: 'Long layoffs often follow an injury, so extra rest counts slightly against.',
    },
    {
      label: 'Career matches',
      a: a.rating.games,
      b: b.rating.games,
      show: (v) => num(v),
      edge: 'lower',
      note: 'Once ratings are known, extra mileage tends to mean an older player.',
    },
  ]

  return (
    <section className="panel panel--tape">
      <h3 className="panel__title">Tale of the tape</h3>
      <p className="panel__lede">
        The five numbers the model actually reads. Form, injuries and the crowd stay invisible to
        it.
      </p>

      <div className="tape">
        {rows.map((row) => {
          const share = shareA(row)
          const edge = edgeOf(row)
          return (
            <div className="tape__row" key={row.label}>
              <span className={`tape__val tape__val--a ${edge === 'a' ? 'is-edge' : ''}`}>
                <span className="num">{row.show(row.a, 'a')}</span>
              </span>

              <span className="tape__center">
                <span className="tape__label">{row.label}</span>
                <span className="tape__track">
                  <span className="tape__fill tape__fill--a" style={{ width: `${share / 2}%` }} />
                  <span
                    className="tape__fill tape__fill--b"
                    style={{ width: `${(100 - share) / 2}%` }}
                  />
                </span>
                <span className="tape__note">{row.note}</span>
              </span>

              <span className={`tape__val tape__val--b ${edge === 'b' ? 'is-edge' : ''}`}>
                <span className="num">{row.show(row.b, 'b')}</span>
              </span>
            </div>
          )
        })}
      </div>

      <p className="tape__legend">
        <span className="swatch swatch--a" aria-hidden="true" /> {surname(a.name)}
        <span className="swatch swatch--b" aria-hidden="true" /> {surname(b.name)}
        <span className="tape__legend-edge">▲ the model's edge</span>
      </p>
    </section>
  )
}
