import { useEffect, useMemo, useState } from 'react'
import analytics from '../../data/analytics.json'
import playersJson from '../../data/players.json'
import { predict } from '../../lib/model'
import { num, pct, surname } from '../../lib/format'
import { useCountUp, useMediaQuery } from '../../lib/hooks'
import type { Analytics, Player } from '../../lib/types'
import { ArrowIcon, BallIcon, ReplayIcon, ShuffleIcon, SwapIcon } from '../Icons'
import CourtViz, { type Phase } from './CourtViz'
import PlayerPlate from './PlayerPlate'
import PlayerPicker from './PlayerPicker'
import HeadToHead from './HeadToHead'
import TaleOfTape from './TaleOfTape'
import Influence from './Influence'
import UpsetRadar from './UpsetRadar'
import CareerCard from './CareerCard'

const players = playersJson as Player[]
const data = analytics as Analytics
const byId = (id: string) => players.find((p) => p.id === id)!

/** What the model's stated confidence was actually worth on held-out matches. */
function observedRate(probability: number): number {
  return data.neuralNetwork.calibration.reduce((best, bin) =>
    Math.abs(bin.predicted - probability) < Math.abs(best.predicted - probability) ? bin : best,
  ).actual
}

function confidenceWord(confidence: number): string {
  if (confidence >= 0.8) return 'Heavy favourite'
  if (confidence >= 0.68) return 'Clear edge'
  if (confidence >= 0.57) return 'Slight edge'
  return 'Too close to call'
}

export default function Predictor({ onReadResearch }: { onReadResearch: () => void }) {
  const [aId, setAId] = useState('janniksinner')
  const [bId, setBId] = useState('novakdjokovic')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<number | null>(null)
  const [picking, setPicking] = useState<'a' | 'b' | null>(null)

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const a = byId(aId)
  const b = byId(bId)

  // A new matchup invalidates the last prediction.
  useEffect(() => {
    setPhase('idle')
    setResult(null)
  }, [aId, bId])

  const serve = () => {
    const probability = predict(a, b)
    if (reducedMotion) {
      setResult(probability)
      setPhase('result')
      return
    }
    setPhase('serving')
    window.setTimeout(() => {
      setResult(probability)
      setPhase('result')
    }, 1450)
  }

  const shuffle = () => {
    const pick = () => players[Math.floor(Math.random() * players.length)]
    let x = pick()
    let y = pick()
    while (y.id === x.id) y = pick()
    setAId(x.id)
    setBId(y.id)
  }

  const swap = () => {
    setAId(bId)
    setBId(aId)
  }

  const choose = (player: Player) => {
    if (picking === 'a') setAId(player.id)
    else setBId(player.id)
    setPicking(null)
  }

  const settled = phase === 'result' && result !== null
  const probability = result ?? 0.5
  const aWins = probability >= 0.5
  const winner = aWins ? a : b
  const confidence = Math.max(probability, 1 - probability)
  const counted = useCountUp(settled ? confidence * 100 : 0, 1000, settled)
  const observed = useMemo(() => observedRate(probability), [probability])

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
          <p className="hero__kicker kicker">
            Neural network · {num(data.dataset.matches)} ATP matches · {data.dataset.firstYear}–
            {data.dataset.lastYear}
          </p>

          <h1 className="hero__title">
            <span className="display">Who wins</span>
            <span className="hero__title-2 display">before a ball is struck?</span>
          </h1>

          <p className="hero__lede">
            Pick two players. The network reads four numbers — ranking, points, age, height — and
            splits the court between them. Then it tells you exactly how little that certainty is
            worth.
          </p>

          <div className="hero__stats">
            <HeroStat value={pct(data.models[0].accuracy, 1)} label="Favourite-wins baseline" />
            <HeroStat value={pct(data.neuralNetwork.accuracy, 1)} label="This network" />
            <HeroStat
              value={pct(data.dataset.upsetRate, 1)}
              label="Matches that end in an upset"
              accent
            />
          </div>
        </div>
      </section>

      <section className="arena">
        <div className="page">
          <div className="arena__frame card">
            <div className="arena__plates">
              <PlayerPlate
                player={a}
                side="a"
                probability={settled ? probability : null}
                isWinner={settled && aWins}
                onPick={() => setPicking('a')}
              />

              <div className="arena__vs">
                <button className="arena__swap" onClick={swap} title="Swap sides" aria-label="Swap sides">
                  <SwapIcon />
                </button>
                <span className="arena__vs-text">vs</span>
                <button className="arena__shuffle" onClick={shuffle} title="Random matchup" aria-label="Random matchup">
                  <ShuffleIcon />
                </button>
              </div>

              <PlayerPlate
                player={b}
                side="b"
                probability={settled ? 1 - probability : null}
                isWinner={settled && !aWins}
                onPick={() => setPicking('b')}
              />
            </div>

            <CourtViz
              probability={probability}
              phase={phase}
              labelA={a.name}
              labelB={b.name}
            />

            <div className="arena__action">
              {!settled ? (
                <button className="btn-ball" onClick={serve} disabled={phase === 'serving'}>
                  {phase === 'serving' ? (
                    <>
                      <span className="btn-ball__spinner" aria-hidden="true" />
                      Playing the point…
                    </>
                  ) : (
                    <>
                      <BallIcon className="icon--ball-btn" /> Serve it up
                    </>
                  )}
                </button>
              ) : (
                <div className="verdict">
                  <p className="verdict__tag pill pill--ball">{confidenceWord(confidence)}</p>
                  <p className="verdict__name display">{winner.name} wins</p>
                  <p className="verdict__confidence num">
                    {counted.toFixed(1)}
                    <span>% confidence</span>
                  </p>
                  <p className="verdict__reality">
                    Of held-out matches the model called at about this confidence, the pick came in{' '}
                    <strong className="num">{pct(aWins ? observed : 1 - observed, 0)}</strong> of the
                    time. Stated certainty and real certainty are not the same thing.
                  </p>
                  <div className="verdict__actions">
                    <button className="btn-ghost" onClick={() => setPhase('idle')}>
                      <ReplayIcon /> Play it again
                    </button>
                    <button className="btn-ghost" onClick={shuffle}>
                      <ShuffleIcon /> New matchup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="analysis">
        <div className="page">
          <div className="analysis__head">
            <h2 className="analysis__title display">
              Reading the matchup: {surname(a.name)} vs {surname(b.name)}
            </h2>
            <p className="analysis__lede">
              The panels below come from the archive and from the network itself. Notice how much
              the model is not allowed to see.
            </p>
          </div>

          <div className="analysis__grid">
            <HeadToHead a={a} b={b} />
            <TaleOfTape a={a} b={b} />
            {settled ? (
              <Influence a={a} b={b} />
            ) : (
              <section className="panel panel--locked">
                <h3 className="panel__title">What moved the needle</h3>
                <p className="panel__empty">
                  Serve the point to break the prediction down input by input.
                </p>
              </section>
            )}
            <UpsetRadar a={a} b={b} />
          </div>

          <div className="analysis__careers">
            <CareerCard player={a} side="a" />
            <CareerCard player={b} side="b" />
          </div>

          <aside className="handoff">
            <div>
              <p className="kicker">The finding</p>
              <p className="handoff__text">
                The network behind this predictor beats “just pick the higher-ranked player” by{' '}
                <strong className="num">
                  {(data.neuralNetwork.accuracy * 100 - data.models[0].accuracy * 100).toFixed(1)}
                </strong>{' '}
                percentage points. That result is the research, and it is more interesting than a
                win would have been.
              </p>
            </div>
            <button className="btn-ball" onClick={onReadResearch}>
              Read the research <ArrowIcon />
            </button>
          </aside>
        </div>
      </section>

      {picking && (
        <PlayerPicker
          players={players}
          side={picking}
          current={picking === 'a' ? a : b}
          opponent={picking === 'a' ? b : a}
          onSelect={choose}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}

function HeroStat({
  value,
  label,
  accent,
}: {
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <div className={`hero__stat ${accent ? 'hero__stat--accent' : ''}`}>
      <span className="hero__stat-val num">{value}</span>
      <span className="hero__stat-label">{label}</span>
    </div>
  )
}
