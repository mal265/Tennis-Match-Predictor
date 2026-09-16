import { SURFACES, type Conditions } from '../../lib/elo-model'
import { SURFACE_COLOR, surname } from '../../lib/format'
import type { Player } from '../../lib/types'

interface Props {
  a: Player
  b: Player
  value: Conditions
  onChange: (next: Conditions) => void
  disabled?: boolean
}

const REST_MAX = 60

/**
 * The two things the archive can't know about a match that hasn't happened:
 * where it's played, and how long each player has been off court.
 */
export default function ConditionsBar({ a, b, value, onChange, disabled }: Props) {
  const set = (patch: Partial<Conditions>) => onChange({ ...value, ...patch })

  return (
    <div className="conditions">
      <div className="conditions__group">
        <span className="conditions__label" id="surface-label">
          Surface
        </span>
        <div className="seg" role="radiogroup" aria-labelledby="surface-label">
          {SURFACES.map((surface) => (
            <label key={surface} className="seg__option">
              <input
                type="radio"
                name="surface"
                value={surface}
                className="sr-only"
                checked={value.surface === surface}
                disabled={disabled}
                onChange={() => set({ surface })}
              />
              <span
                className="seg__dot"
                style={{ background: SURFACE_COLOR[surface] }}
                aria-hidden="true"
              />
              {surface}
            </label>
          ))}
        </div>
      </div>

      <div className="conditions__group conditions__group--rest">
        <span className="conditions__label">Days since last match</span>
        <RestSlider
          side="a"
          name={surname(a.name)}
          value={value.restA}
          disabled={disabled}
          onChange={(restA) => set({ restA })}
        />
        <RestSlider
          side="b"
          name={surname(b.name)}
          value={value.restB}
          disabled={disabled}
          onChange={(restB) => set({ restB })}
        />
      </div>
    </div>
  )
}

function RestSlider({
  side,
  name,
  value,
  disabled,
  onChange,
}: {
  side: 'a' | 'b'
  name: string
  value: number
  disabled?: boolean
  onChange: (days: number) => void
}) {
  const id = `rest-${side}`
  return (
    <label className={`rest rest--${side}`} htmlFor={id}>
      <span className="rest__name">{name}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={REST_MAX}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="rest__value num">{value}d</span>
    </label>
  )
}
