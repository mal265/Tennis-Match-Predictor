import { useState } from 'react'
import Nav from './components/Nav'
import Predictor from './components/court/Predictor'
import Research from './components/research/Research'
import { useTheme } from './lib/hooks'

export type View = 'predictor' | 'research'

export default function App() {
  const [view, setView] = useState<View>('predictor')
  const [theme, toggleTheme] = useTheme()

  const go = (next: View) => {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  return (
    <>
      <div className="floodlights" aria-hidden="true">
        <span className="floodlight floodlight--a" />
        <span className="floodlight floodlight--b" />
        <span className="floodlight floodlight--c" />
      </div>

      <Nav view={view} onNavigate={go} theme={theme} onToggleTheme={toggleTheme} />

      <main id="top">
        {view === 'predictor' ? <Predictor onReadResearch={() => go('research')} /> : <Research />}
      </main>

      <footer className="site-footer">
        <div className="page site-footer__inner">
          <div>
            <p className="site-footer__brand">CourtVision</p>
            <p className="site-footer__note">
              Research and model by <strong>Roman Belchikov</strong>. Match data: Jeff Sackmann's
              ATP archive, 2000–2024.
            </p>
          </div>
          <p className="site-footer__note">
            Every figure on this site is computed from the dataset or the trained network — nothing
            is illustrative.
          </p>
        </div>
      </footer>
    </>
  )
}
