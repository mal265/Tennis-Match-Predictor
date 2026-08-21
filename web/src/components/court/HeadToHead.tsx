import { roundName, surname } from '../../lib/format'
import type { Player } from '../../lib/types'

export default function HeadToHead({ a, b }: { a: Player; b: Player }) {
  const record = a.h2h[b.id]

  if (!record) {
    return (
      <section className="panel panel--h2h">
        <h3 className="panel__title">Head to head</h3>
        <p className="panel__empty">
          <strong>{surname(a.name)}</strong> and <strong>{surname(b.name)}</strong> never met in the
          2000–2024 archive. The model has no rivalry to draw on — and never did: head-to-head is
          not one of its four inputs.
        </p>
      </section>
    )
  }

  const { wins, losses, lastMeeting } = record
  const total = wins + losses
  const share = (wins / total) * 100
  const leader = wins === losses ? null : wins > losses ? a : b

  return (
    <section className="panel panel--h2h">
      <h3 className="panel__title">Head to head</h3>

      <div className="h2h__score">
        <span className="h2h__num num h2h__num--a">{wins}</span>
        <span className="h2h__dash">–</span>
        <span className="h2h__num num h2h__num--b">{losses}</span>
      </div>

      <p className="h2h__caption">
        {leader ? (
          <>
            <strong>{surname(leader.name)}</strong> leads over {total}{' '}
            {total === 1 ? 'meeting' : 'meetings'}
          </>
        ) : (
          <>Dead level after {total} meetings</>
        )}
      </p>

      <div className="h2h__bar" role="img" aria-label={`${a.name} ${wins}, ${b.name} ${losses}`}>
        <span className="h2h__seg h2h__seg--a" style={{ width: `${share}%` }} />
        <span className="h2h__seg h2h__seg--b" style={{ width: `${100 - share}%` }} />
      </div>

      <div className="h2h__last">
        <p className="kicker">Last meeting</p>
        <p className="h2h__last-line">
          <strong>{lastMeeting.tournament}</strong> {lastMeeting.year} ·{' '}
          {roundName(lastMeeting.round)}
        </p>
        <p className="h2h__last-score">
          <span className="pill" style={{ borderColor: 'var(--line-strong)' }}>
            {lastMeeting.surface}
          </span>
          <span className="num">{lastMeeting.score}</span>
        </p>
        <p className="h2h__last-won">
          {surname(lastMeeting.won ? a.name : b.name)} took it.
        </p>
      </div>
    </section>
  )
}
