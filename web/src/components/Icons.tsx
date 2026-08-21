/**
 * Inline icons and country chips. Regional-indicator flag emoji do not render
 * on Windows Chrome — they fall back to bare letters — so nothing here depends
 * on emoji fonts.
 */

const COUNTRY_NAMES: Record<string, string> = {
  ITA: 'Italy', ESP: 'Spain', GER: 'Germany', CAN: 'Canada', SRB: 'Serbia',
  RUS: 'Russia', AUS: 'Australia', USA: 'United States', KAZ: 'Kazakhstan',
  CZE: 'Czechia', NOR: 'Norway', FRA: 'France', GBR: 'Great Britain',
  SUI: 'Switzerland', ARG: 'Argentina', GRE: 'Greece', POL: 'Poland',
  NED: 'Netherlands', BUL: 'Bulgaria', CHI: 'Chile', DEN: 'Denmark',
}

export function CountryChip({ code, size = 'sm' }: { code: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={`ccode ccode--${size}`} title={COUNTRY_NAMES[code] ?? code}>
      {code}
      <span className="sr-only"> ({COUNTRY_NAMES[code] ?? code})</span>
    </span>
  )
}

export function BallIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`icon ${className}`} aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="currentColor" />
      <path
        d="M14 22a52 52 0 0 1 0 56M86 22a52 52 0 0 0 0 56"
        fill="none"
        stroke="var(--ball-seam, rgba(0,0,0,0.55))"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h4l10 12h4" />
      <path d="M3 18h4l3-3.6" />
      <path d="M14 8.6 17 6h4" />
      <path d="m18 3 3 3-3 3" />
      <path d="m18 15 3 3-3 3" />
    </svg>
  )
}

export function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h15l-3.5-3.5" />
      <path d="M20 16H5l3.5 3.5" />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
    </svg>
  )
}

export function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.2 4.6v4.6h4.6" />
    </svg>
  )
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13.5 6.5 20 12l-6.5 5.5" />
    </svg>
  )
}
