import { num } from '../../lib/format'
import type { Player, RatedSurface } from '../../lib/types'
import { BallIcon, CountryChip } from '../Icons'

interface Props {
  player: Player
  side: 'a' | 'b'
  surface: RatedSurface
  probability: number | null
  isWinner: boolean
  onPick: () => void
}

export default function PlayerPlate({ player, side, surface, probability, isWinner, onPick }: Props) {
  const { rating } = player
  const onSurface = rating.surfaces[surface]

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
        {rating.rated ? (
          <>
            <span>
              <b className="num">{Math.round(rating.elo)}</b> Elo
            </span>
            <span
              title={
                onSurface.games
                  ? `${onSurface.games} ${surface.toLowerCase()} matches`
                  : `No ${surface.toLowerCase()} matches — starts at 1,500`
              }
            >
              <b className="num">{Math.round(onSurface.rating)}</b> on {surface.toLowerCase()}
              {!onSurface.games && '*'}
            </span>
            <span>
              <b className="num">{num(rating.games)}</b> matches
            </span>
          </>
        ) : (
          <span className="plate__unrated">Unrated — no matches in the archive</span>
        )}
      </span>

      {probability !== null && (
        <span className="plate__prob num">{(probability * 100).toFixed(1)}%</span>
      )}

      <span className="plate__swap">Change ⇄</span>
    </button>
  )
}
