import { num, surname } from '../../lib/format'
import type { Player } from '../../lib/types'

interface Row {
  label: string
  a: number
  b: number
  format: (v: number) => string
  /** Which direction wins, if either. Ranking counts down; points count up. */
  better: 'lower' | 'higher' | null
  note: string
}

export default function TaleOfTape({ a, b }: { a: Player; b: Player }) {
  const rows: Row[] = [
    {
      label: 'ATP ranking',
      a: a.rank,
      b: b.rank,
      format: (v) => `#${v}`,
      better: 'lower',
      note: 'The single strongest input in the model.',
    },
    {
      label: 'Ranking points',
      a: a.points,
      b: b.points,
      format: num,
      better: 'higher',
      note: 'Carries almost the same information as the ranking.',
    },
    {
      label: 'Age',
      a: a.age,
      b: b.age,
      format: (v) => `${v}`,
      better: null,
      note: 'Neither young nor old wins on its own.',
    },
    {
      label: 'Height',
      a: a.height,
      b: b.height,
      format: (v) => `${v} cm`,
      better: null,
      note: 'Barely moves the prediction at all.',
    },
  ]

  return (
    <section className="panel panel--tape">
      <h3 className="panel__title">Tale of the tape</h3>
      <p className="panel__lede">
        The four numbers the network actually sees. Everything else about these players — form,
        surface, fatigue, the rivalry — is invisible to it.
      </p>

      <div className="tape">
        {rows.map((row) => {
          // Rank counts down, so invert it before turning the pair into shares.
          const wa = row.better === 'lower' ? 1 / row.a : row.a
          const wb = row.better === 'lower' ? 1 / row.b : row.b
          const shareA = (wa / (wa + wb)) * 100
          const edge =
            row.better === null || row.a === row.b ? null : shareA > 50 ? 'a' : 'b'

          return (
            <div className="tape__row" key={row.label}>
              <span className={`tape__val tape__val--a ${edge === 'a' ? 'is-edge' : ''}`}>
                <span className="num">{row.format(row.a)}</span>
              </span>

              <span className="tape__center">
                <span className="tape__label">{row.label}</span>
                <span className="tape__track">
                  <span
                    className="tape__fill tape__fill--a"
                    style={{ width: `${shareA / 2}%` }}
                  />
                  <span
                    className="tape__fill tape__fill--b"
                    style={{ width: `${(100 - shareA) / 2}%` }}
                  />
                </span>
                <span className="tape__note">{row.note}</span>
              </span>

              <span className={`tape__val tape__val--b ${edge === 'b' ? 'is-edge' : ''}`}>
                <span className="num">{row.format(row.b)}</span>
              </span>
            </div>
          )
        })}
      </div>

      <p className="tape__legend">
        <span className="swatch swatch--a" aria-hidden="true" /> {surname(a.name)}
        <span className="swatch swatch--b" aria-hidden="true" /> {surname(b.name)}
      </p>
    </section>
  )
}
