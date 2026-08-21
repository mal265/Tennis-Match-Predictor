import { SURFACE_COLOR, num, pct } from '../../lib/format'
import { CountryChip } from '../Icons'
import type { Player } from '../../lib/types'

export default function CareerCard({ player, side }: { player: Player; side: 'a' | 'b' }) {
  const career = player.career

  return (
    <article className={`career career--${side}`}>
      <header className="career__head">
        <span className="career__flag">
          <CountryChip code={player.country} size="lg" />
        </span>
        <div>
          <h3 className="career__name">{player.name}</h3>
          <p className="career__sub num">
            World #{player.rank} · {num(player.points)} pts
          </p>
        </div>
      </header>

      {!career ? (
        <p className="career__empty">
          No matches for {player.name} in the 2000–2024 archive, so there is no career record to
          show. The prediction is unaffected — the model only reads ranking, points, age and
          height.
        </p>
      ) : (
        <>
          <div className="career__grid">
            <Stat label="Record" value={`${career.wins}–${career.losses}`} />
            <Stat label="Win rate" value={pct(career.winRate, 0)} />
            <Stat label="Titles" value={String(career.titles)} />
            <Stat label="Career high" value={`#${career.bestRank}`} />
            <Stat
              label="vs top 10"
              value={`${career.vsTop10.wins}–${career.vsTop10.losses}`}
            />
            <Stat label="Slam wins" value={String(career.grandSlamWins)} />
          </div>

          <div className="career__surfaces">
            <p className="kicker">By surface</p>
            {(['Hard', 'Clay', 'Grass'] as const).map((surface) => {
              const record = career.surfaces[surface]
              if (!record) return null
              return (
                <div className="career__surface" key={surface}>
                  <span className="career__surface-name">
                    <span
                      className="swatch"
                      style={{ background: SURFACE_COLOR[surface] }}
                      aria-hidden="true"
                    />
                    {surface}
                  </span>
                  <span className="career__surface-track">
                    <span
                      className="career__surface-fill"
                      style={{
                        width: `${record.winRate * 100}%`,
                        background: SURFACE_COLOR[surface],
                      }}
                    />
                  </span>
                  <span className="career__surface-val num">
                    {pct(record.winRate, 0)}
                    <em>
                      {record.wins}–{record.losses}
                    </em>
                  </span>
                </div>
              )
            })}
          </div>

          <p className="career__foot num">
            {career.firstYear}–{career.lastYear} · {num(career.matches)} matches in the archive
          </p>
        </>
      )}
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="career__stat">
      <span className="career__stat-val num">{value}</span>
      <span className="career__stat-label">{label}</span>
    </div>
  )
}
