import { useEffect, useRef } from 'react'
import { modelInfo } from '../../lib/elo-model'
import { monthYear, num, pct } from '../../lib/format'
import { CountryChip } from '../Icons'
import type { Player } from '../../lib/types'

interface Props {
  players: Player[]
  side: 'a' | 'b'
  current: Player
  opponent: Player
  onSelect: (player: Player) => void
  onClose: () => void
}

export default function PlayerPicker({
  players,
  side,
  current,
  opponent,
  onSelect,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLButtonElement>('[data-current="true"]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="picker" onClick={onClose}>
      <div
        className="picker__panel"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose player ${side.toUpperCase()}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="picker__head">
          <div>
            <p className="kicker">Player {side.toUpperCase()}</p>
            <h2 className="picker__title display">Pick your player</h2>
          </div>
          <button className="picker__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="picker__grid">
          {players.map((player) => {
            const taken = player.id === opponent.id
            return (
              <button
                key={player.id}
                className={`pcard pcard--${side}`}
                data-current={player.id === current.id}
                disabled={taken}
                onClick={() => onSelect(player)}
                title={taken ? `${player.name} is already the opponent` : undefined}
              >
                <span className="pcard__rank num">{player.rank}</span>
                <span className="pcard__body">
                  <span className="pcard__name">
                    <CountryChip code={player.country} /> {player.name}
                  </span>
                  <span className="pcard__meta num">
                    {player.rating.rated ? `Elo ${Math.round(player.rating.elo)}` : 'Unrated'} ·{' '}
                    {num(player.points)} pts
                  </span>
                  <span className="pcard__record">
                    {player.career ? (
                      <>
                        <b className="num">{pct(player.career.winRate, 0)}</b> career wins ·{' '}
                        <span className="num">{player.career.titles}</span> titles
                      </>
                    ) : (
                      <em>No matches in the 2000–2024 archive</em>
                    )}
                  </span>
                </span>
                {taken && <span className="pcard__taken">On court</span>}
              </button>
            )
          })}
        </div>

        <p className="picker__foot">
          The model reads Elo ratings, head-to-head, rest and experience. Ratings and career records
          come from {num(71463)} archived matches up to {monthYear(modelInfo.asOf)}.
        </p>
      </div>
    </div>
  )
}
