import { num } from '../../lib/format'
import { BallIcon, CountryChip } from '../Icons'
import type { Player } from '../../lib/types'

interface Props {
  player: Player
  side: 'a' | 'b'
  probability: number | null
  isWinner: boolean
  onPick: () => void
}

export default function PlayerPlate({ player, side, probability, isWinner, onPick }: Props) {
  return (
    <button
      className={`plate plate--${side} ${isWinner ? 'plate--winner' : ''}`}
      onClick={onPick}
      aria-label={`Change player ${side.toUpperCase()}. Currently ${player.name}.`}
    >
      <span className="plate__top">
        <span className="plate__rank num">#{player.rank}</span>
        <span className="plate__side">Player {side.toUpperCase()}</span>
        {isWinner && (
          <span className="plate__crown">
            <BallIcon />
            <span className="sr-only">Predicted winner</span>
          </span>
        )}
      </span>

      <span className="plate__name">
        <CountryChip code={player.country} />
        {player.name}
      </span>

      <span className="plate__stats">
        <span>
          <b className="num">{num(player.points)}</b> pts
        </span>
        <span>
          <b className="num">{player.age}</b> yrs
        </span>
        <span>
          <b className="num">{player.height}</b> cm
        </span>
        {player.career && (
          <span>
            <b className="num">
              {player.career.wins}–{player.career.losses}
            </b>{' '}
            career
          </span>
        )}
      </span>

      {probability !== null && (
        <span className="plate__prob num">{(probability * 100).toFixed(1)}%</span>
      )}

      <span className="plate__swap">Change ⇄</span>
    </button>
  )
}
