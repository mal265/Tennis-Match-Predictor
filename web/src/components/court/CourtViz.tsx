/**
 * The court is the chart. A regulation ATP court drawn to scale, top-down, with
 * the dividing line sitting where the model puts the match: the share of court
 * each player holds *is* their win probability.
 */

// Regulation dimensions in centimetres, so the geometry is real, not eyeballed.
const M_X = 220
const M_Y = 190
const LEN = 2377
const WID = 1097
const SINGLES_INSET = (WID - 823) / 2
const SERVICE_FROM_NET = 640

const X0 = M_X
const X1 = M_X + LEN
const Y0 = M_Y
const Y1 = M_Y + WID
const YS0 = Y0 + SINGLES_INSET
const YS1 = Y1 - SINGLES_INSET
const NET_X = M_X + LEN / 2
const MID_Y = M_Y + WID / 2
const SERVICE_L = NET_X - SERVICE_FROM_NET
const SERVICE_R = NET_X + SERVICE_FROM_NET

const VB_W = LEN + M_X * 2
const VB_H = WID + M_Y * 2

export type Phase = 'idle' | 'serving' | 'result'

interface Props {
  /** Player A's win probability, 0–1. */
  probability: number
  phase: Phase
  labelA: string
  labelB: string
}

export default function CourtViz({ probability, phase, labelA, labelB }: Props) {
  const settled = phase === 'result'
  const split = settled ? probability : 0.5
  const divider = X0 + LEN * split
  const aLeads = probability >= 0.5

  // The rally: serve, return, approach, then the ball settles on the split line.
  const rally = `M ${X0 + 90} ${MID_Y} Q ${NET_X} 40 ${SERVICE_R} ${YS0 + 120}
                 Q ${NET_X} ${VB_H} ${SERVICE_L} ${YS1 - 140}
                 Q ${NET_X - 100} 260 ${divider} ${MID_Y}`

  return (
    <div className={`courtviz courtviz--${phase}`} data-leads={aLeads ? 'a' : 'b'}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="courtviz__svg"
        role="img"
        aria-label={
          settled
            ? `Court split: ${labelA} holds ${(probability * 100).toFixed(1)} percent, ${labelB} holds ${((1 - probability) * 100).toFixed(1)} percent.`
            : `An empty court awaiting a prediction between ${labelA} and ${labelB}.`
        }
      >
        <defs>
          <linearGradient id="territoryA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.34" />
            <stop offset="50%" stopColor="var(--series-1)" stopOpacity="0.62" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.34" />
          </linearGradient>
          <linearGradient id="territoryB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-2)" stopOpacity="0.34" />
            <stop offset="50%" stopColor="var(--series-2)" stopOpacity="0.62" />
            <stop offset="100%" stopColor="var(--series-2)" stopOpacity="0.34" />
          </linearGradient>
          <filter id="ballGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="26" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="apron">
            <rect x="6" y="6" width={VB_W - 12} height={VB_H - 12} rx="52" />
          </clipPath>
        </defs>

        <g clipPath="url(#apron)">
          {/* run-off area and the playing surface */}
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="var(--court-apron)" />
          <rect x={X0} y={Y0} width={LEN} height={WID} fill="var(--court-floor)" />

          {/* territory — the data layer */}
          <rect
            className="courtviz__territory"
            x="0"
            y="0"
            width={divider}
            height={VB_H}
            fill={settled ? 'url(#territoryA)' : 'transparent'}
          />
          <rect
            className="courtviz__territory"
            x={divider}
            y="0"
            width={VB_W - divider}
            height={VB_H}
            fill={settled ? 'url(#territoryB)' : 'transparent'}
          />
        </g>

        {/* court markings, always in their true positions */}
        <g
          className="courtviz__lines"
          fill="none"
          stroke="var(--court-line)"
          strokeWidth="9"
          strokeLinecap="square"
        >
          <rect x={X0} y={Y0} width={LEN} height={WID} />
          <line x1={X0} y1={YS0} x2={X1} y2={YS0} />
          <line x1={X0} y1={YS1} x2={X1} y2={YS1} />
          <line x1={SERVICE_L} y1={YS0} x2={SERVICE_L} y2={YS1} />
          <line x1={SERVICE_R} y1={YS0} x2={SERVICE_R} y2={YS1} />
          <line x1={SERVICE_L} y1={MID_Y} x2={SERVICE_R} y2={MID_Y} />
          <line x1={X0} y1={MID_Y} x2={X0 + 60} y2={MID_Y} />
          <line x1={X1 - 60} y1={MID_Y} x2={X1} y2={MID_Y} />
        </g>

        {/* the net, fixed at the centre — the reference the split is read against */}
        <g className="courtviz__net">
          <line
            x1={NET_X}
            y1={Y0 - 90}
            x2={NET_X}
            y2={Y1 + 90}
            stroke="var(--ink-1)"
            strokeOpacity="0.34"
            strokeWidth="10"
            strokeDasharray="26 20"
          />
          <circle cx={NET_X} cy={Y0 - 90} r="20" fill="var(--ink-1)" fillOpacity="0.34" />
          <circle cx={NET_X} cy={Y1 + 90} r="20" fill="var(--ink-1)" fillOpacity="0.34" />
        </g>

        {/* the split line: where the model draws the match */}
        <g
          className="courtviz__split"
          style={{ transform: `translateX(${divider}px)` }}
          opacity={settled ? 1 : 0}
        >
          <line
            x1="0"
            y1={Y0 - 130}
            x2="0"
            y2={Y1 + 130}
            stroke="var(--ball)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle cx="0" cy={Y0 - 130} r="26" fill="var(--ball)" filter="url(#ballGlow)" />
          <circle cx="0" cy={Y1 + 130} r="26" fill="var(--ball)" filter="url(#ballGlow)" />
        </g>

        {/* in-court share readout */}
        {settled && (
          <g className="courtviz__readout">
            <text x={X0 + 70} y={Y0 - 60} className="courtviz__share" textAnchor="start">
              {(probability * 100).toFixed(1)}%
            </text>
            <text x={X1 - 70} y={Y0 - 60} className="courtviz__share" textAnchor="end">
              {((1 - probability) * 100).toFixed(1)}%
            </text>
          </g>
        )}

        {/* the rally, played once per prediction */}
        {phase === 'serving' && (
          <g className="courtviz__rally">
            <path d={rally} className="courtviz__trace" />
            <circle r="34" className="courtviz__ball" filter="url(#ballGlow)" style={{ offsetPath: `path("${rally.replace(/\s+/g, ' ')}")` }} />
          </g>
        )}
      </svg>
    </div>
  )
}
