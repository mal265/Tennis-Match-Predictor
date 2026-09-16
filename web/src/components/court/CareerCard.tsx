import { SURFACE_COLOR, monthYear, num, pct } from '../../lib/format'
import type { Player, RatedSurface } from '../../lib/types'
import { CountryChip } from '../Icons'

const SURFACES: RatedSurface[] = ['Hard', 'Clay', 'Grass']

export default function CareerCard({
  player,
  side,
  surface,
}: {
  player: Player
  side: 'a' | 'b'
  surface: RatedSurface
}) {
  const { career, rating } = player

  return (
    <article className={`career career--${side}`}>
      <header className="career__head">
        <span className="career__flag">
          <CountryChip code={player.country} size="lg" />
        </span>
        <div>
          <h3 className="career__name">{player.name}</h3>
          <p className="career__sub num">
            World #{player.rank} · {rating.rated ? `Elo ${Math.round(rating.elo)}` : 'unrated'}
          </p>
        </div>
      </header>

      {!career ? (
        <p className="career__empty">
          No matches for {player.name} in the 2000–2024 archive, so there is no record and no rating
          history. The model treats an unknown player as a newcomer: a starting Elo of 1,500 on
          every surface and no experience.
        </p>
      ) : (
        <>
          <div className="career__grid">
            <Stat label="Record" value={`${career.wins}–${career.losses}`} />
            <Stat label="Win rate" value={pct(career.winRate, 0)} />
            <Stat label="Titles" value={String(career.titles)} />
            <Stat
              label="Peak Elo"
              value={rating.peak ? String(Math.round(rating.peak.rating)) : '—'}
              hint={rating.peak ? rating.peak.date.slice(0, 4) : undefined}
            />
            <Stat label="vs top 10" value={`${career.vsTop10.wins}–${career.vsTop10.losses}`} />
            <Stat label="Career high" value={`#${career.bestRank}`} />
          </div>

          <div className="career__surfaces">
            <div className="career__surface career__surface--head" aria-hidden="true">
              <span className="kicker">Surface</span>
              <span />
              <span>Win %</span>
              <span>Elo</span>
            </div>
            {SURFACES.map((s) => {
              const record = career.surfaces[s]
              const rated = rating.surfaces[s]
              return (
                <div className={`career__surface ${s === surface ? 'is-active' : ''}`} key={s}>
                  <span className="career__surface-name">
                    <span
                      className="swatch"
                      style={{ background: SURFACE_COLOR[s] }}
                      aria-hidden="true"
                    />
                    {s}
                  </span>
                  <span className="career__surface-track">
                    <span
                      className="career__surface-fill"
                      style={{
                        width: record ? `${record.winRate * 100}%` : '0%',
                        background: SURFACE_COLOR[s],
                      }}
                    />
                  </span>
                  <span className="career__surface-val num">
                    {record ? pct(record.winRate, 0) : '—'}
                    <em>{record ? `${record.wins}–${record.losses}` : 'no matches'}</em>
                  </span>
                  <span className="career__surface-elo num">
                    {rated.games ? Math.round(rated.rating) : '—'}
                    <em>{rated.games ? `${rated.games} played` : 'unrated'}</em>
                  </span>
                </div>
              )
            })}
          </div>

          <p className="career__foot num">
            {career.firstYear}–{career.lastYear} · {num(career.matches)} matches
            {rating.lastMatch && <> · ratings as of {monthYear(rating.lastMatch.date)}</>}
          </p>
        </>
      )}
    </article>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="career__stat">
      <span className="career__stat-val num">{value}</span>
      <span className="career__stat-label">
        {label}
        {hint && <em className="career__stat-hint"> · {hint}</em>}
      </span>
    </div>
  )
}
