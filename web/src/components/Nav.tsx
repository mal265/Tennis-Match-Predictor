import type { View } from '../App'
import type { Theme } from '../lib/hooks'
import { MoonIcon, SunIcon } from './Icons'

interface Props {
  view: View
  onNavigate: (view: View) => void
  theme: Theme
  onToggleTheme: () => void
}

export default function Nav({ view, onNavigate, theme, onToggleTheme }: Props) {
  return (
    <header className="nav">
      <div className="page nav__inner">
        <button className="nav__brand" onClick={() => onNavigate('predictor')}>
          <BallMark />
          <span>
            Court<em>Vision</em>
          </span>
        </button>

        <nav className="nav__tabs" aria-label="Sections">
          <span
            className="nav__thumb"
            style={{ transform: `translateX(${view === 'predictor' ? 0 : 100}%)` }}
            aria-hidden="true"
          />
          <button
            className="nav__tab"
            aria-current={view === 'predictor'}
            onClick={() => onNavigate('predictor')}
          >
            Predictor
          </button>
          <button
            className="nav__tab"
            aria-current={view === 'research'}
            onClick={() => onNavigate('research')}
          >
            Research
          </button>
        </nav>

        <button
          className="nav__theme"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'day' : 'night'} session`}
          title={`Switch to ${theme === 'dark' ? 'day' : 'night'} session`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span className="nav__theme-label">{theme === 'dark' ? 'Day' : 'Night'}</span>
        </button>
      </div>
    </header>
  )
}

function BallMark() {
  return (
    <svg viewBox="0 0 100 100" className="ball-mark" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="var(--ball)" />
      <path
        d="M14 22a52 52 0 0 1 0 56M86 22a52 52 0 0 0 0 56"
        fill="none"
        stroke="var(--on-ball)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}
