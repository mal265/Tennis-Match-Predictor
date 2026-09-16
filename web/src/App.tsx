import { useState } from 'react'
import Nav from './components/Nav'
import Predictor from './components/court/Predictor'
import Research from './components/research/Research'
import Report2 from './components/research/Report2'
import { useTheme } from './lib/hooks'

export type View = 'predictor' | 'report1' | 'report2'

export default function App() {
  const [view, setView] = useState<View>('predictor')
  const [theme, toggleTheme] = useTheme()

  const go = (next: View) => {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  const openReport = (report: 1 | 2) => go(report === 1 ? 'report1' : 'report2')

  return (
    <>
      <div className="floodlights" aria-hidden="true">
        <span className="floodlight floodlight--a" />
        <span className="floodlight floodlight--b" />
        <span className="floodlight floodlight--c" />
      </div>

      <Nav view={view} onNavigate={go} theme={theme} onToggleTheme={toggleTheme} />

      <main id="top">
        {view === 'predictor' && <Predictor onOpenReport={openReport} />}
        {view === 'report1' && <Research onOpenReport={openReport} />}
        {view === 'report2' && (
          <Report2 onOpenReport={openReport} onOpenPredictor={() => go('predictor')} />
        )}
      </main>

      <footer className="site-footer">
        <div className="page site-footer__inner">
          <div>
            <p className="site-footer__brand">CourtVision</p>
            <p className="site-footer__note">
              Research and models by <strong>Roman Belchikov</strong>. Match data: Jeff Sackmann's
              ATP archive, 2000–2024.
            </p>
          </div>
          <p className="site-footer__note">
            Every figure on this site is computed from the dataset or a trained model — nothing is
            illustrative.
          </p>
        </div>
      </footer>
    </>
  )
}
