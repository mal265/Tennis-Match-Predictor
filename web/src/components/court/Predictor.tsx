import { useEffect, useMemo, useRef, useState } from 'react'
import playersJson from '../../data/players.json'
import reportJson from '../../data/report2.json'
import { DEFAULT_CONDITIONS, SURFACES, predict, type Conditions } from '../../lib/elo-model'
import { liftPts, monthYear, num, pct, surname } from '../../lib/format'
import { useCountUp, useMediaQuery } from '../../lib/hooks'
import type { Player, Report2 } from '../../lib/types'
import { ArrowIcon, BallIcon, ReplayIcon, ShuffleIcon, SwapIcon } from '../Icons'
import CareerCard from './CareerCard'
import ConditionsBar from './Conditions'
import CourtViz, { type Phase } from './CourtViz'
import HeadToHead from './HeadToHead'
import Influence from './Influence'
import PlayerPicker from './PlayerPicker'
import PlayerPlate from './PlayerPlate'
import TaleOfTape from './TaleOfTape'
import UpsetRadar from './UpsetRadar'

const players = playersJson as Player[]
const report = reportJson as Report2
const byId = (id: string) => players.find((p) => p.id === id)!

const report1Step = report.steps.find((s) => s.key === 'report1')!
const finalStep = report.steps.find((s) => s.key === 'final')!
/** From the raw count, so the headline can't inherit a rounding artefact. */
const finalAccuracy = report.final.correct / report.split.test

/** What the model's stated confidence was actually worth on held-out matches. */
function observedRate(probability: number): number {
  return report.calibration.reduce((best, bin) =>
    Math.abs(bin.predicted - probability) < Math.abs(best.predicted - probability) ? bin : best,
  ).actual
}

function confidenceWord(confidence: number): string {
  if (confidence >= 0.8) return 'Heavy favourite'
  if (confidence >= 0.68) return 'Clear edge'
  if (confidence >= 0.57) return 'Slight edge'
  return 'Too close to call'
}

export default function Predictor({ onOpenReport }: { onOpenReport: (report: 1 | 2) => void }) {
  const [aId, setAId] = useState('janniksinner')
  const [bId, setBId] = useState('novakdjokovic')
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<number | null>(null)
  const [picking, setPicking] = useState<'a' | 'b' | null>(null)
  const pending = useRef<number | undefined>(undefined)

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const a = byId(aId)
  const b = byId(bId)

  // Any change to the matchup invalidates the last prediction — including one still mid-rally.
  useEffect(() => {
    window.clearTimeout(pending.current)
    setPhase('idle')
    setResult(null)
  }, [aId, bId, conditions])

  useEffect(() => () => window.clearTimeout(pending.current), [])

  const serve = () => {
    const probability = predict(a, b, conditions)
    if (reducedMotion) {
      setResult(probability)
      setPhase('result')
      return
    }
    setPhase('serving')
    pending.current = window.setTimeout(() => {
      setResult(probability)
      setPhase('result')
    }, 1450)
  }

  const shuffle = () => {
    const pick = () => players[Math.floor(Math.random() * players.length)]
    const x = pick()
    let y = pick()
    while (y.id === x.id) y = pick()
    setAId(x.id)
    setBId(y.id)
    setConditions((c) => ({ ...c, surface: SURFACES[Math.floor(Math.random() * SURFACES.length)] }))
  }

  // Rest belongs to the player, so it swaps sides with them.
  const swap = () => {
    setAId(bId)
    setBId(aId)
    setConditions((c) => ({ ...c, restA: c.restB, restB: c.restA }))
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
  const court = conditions.surface.toLowerCase()

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
          <p className="hero__kicker kicker">
            Report 2 model · Elo ratings · {num(report.split.train + report.split.test)} ATP matches
            to {monthYear(report.asOf)}
          </p>

          <h1 className="hero__title">
            <span className="display">Who wins</span>
            <span className="hero__title-2 display">before a ball is struck?</span>
          </h1>

          <p className="hero__lede">
            Pick two players and a surface. The model reads five things — overall Elo, Elo on that
            surface, head-to-head, rest and experience — and splits the court between them. Then it
            tells you exactly how little that certainty is worth.
          </p>

          <div className="hero__stats">
            <HeroStat value={pct(report.baseline, 2)} label="Favourite-wins baseline" />
            <HeroStat value={pct(report1Step.accuracy, 2)} label="Report 1 best model" />
            <HeroStat value={pct(finalAccuracy, 2)} label="Report 2 · runs this predictor" accent />
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
                surface={conditions.surface}
                probability={settled ? probability : null}
                isWinner={settled && aWins}
                onPick={() => setPicking('a')}
              />

              <div className="arena__vs">
                <button className="arena__swap" onClick={swap} title="Swap sides" aria-label="Swap sides">
                  <SwapIcon />
                </button>
                <span className="arena__vs-text">vs</span>
                <button
                  className="arena__shuffle"
                  onClick={shuffle}
                  title="Random matchup"
                  aria-label="Random matchup"
                >
                  <ShuffleIcon />
                </button>
              </div>

              <PlayerPlate
                player={b}
                side="b"
                surface={conditions.surface}
                probability={settled ? 1 - probability : null}
                isWinner={settled && !aWins}
                onPick={() => setPicking('b')}
              />
            </div>

            <ConditionsBar
              a={a}
              b={b}
              value={conditions}
              onChange={setConditions}
              disabled={phase === 'serving'}
            />

            <CourtViz
              probability={probability}
              phase={phase}
              surface={conditions.surface}
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
                  <p className="verdict__tag pill pill--ball">
                    {confidenceWord(confidence)} · on {court}
                  </p>
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
              {surname(a.name)} vs {surname(b.name)}, on {court}
            </h2>
            <p className="analysis__lede">
              Everything below is either the match archive or the model's own arithmetic. The model
              reads exactly five numbers about this match; the rest is context it never sees.
            </p>
          </div>

          <div className="analysis__grid">
            <HeadToHead a={a} b={b} />
            <TaleOfTape a={a} b={b} conditions={conditions} />
            {settled ? (
              <Influence a={a} b={b} conditions={conditions} />
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
            <CareerCard player={a} side="a" surface={conditions.surface} />
            <CareerCard player={b} side="b" surface={conditions.surface} />
          </div>

          <aside className="handoff">
            <div>
              <p className="kicker">Two reports, one question</p>
              <p className="handoff__text">
                Report 1 found a ceiling: its best model beat “just pick the higher-ranked player” by{' '}
                <strong className="num">{liftPts(report1Step.lift)}</strong> points. Report 2 kept the
                model simple and changed what it could see:{' '}
                <strong className="num">{liftPts(finalStep.lift)}</strong> points, from the model
                running this page.
              </p>
            </div>
            <div className="handoff__actions">
              <button className="btn-ball" onClick={() => onOpenReport(2)}>
                Read Report 2 <ArrowIcon />
              </button>
              <button className="btn-ghost" onClick={() => onOpenReport(1)}>
                Start with Report 1
              </button>
            </div>
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

function HeroStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`hero__stat ${accent ? 'hero__stat--accent' : ''}`}>
      <span className="hero__stat-val num">{value}</span>
      <span className="hero__stat-label">{label}</span>
    </div>
  )
}
