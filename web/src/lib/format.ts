export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
export const pts = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}`
export const num = (v: number) => v.toLocaleString('en-US')
export const signed = (v: number, digits = 1) =>
  `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`

export const SURFACE_COLOR: Record<string, string> = {
  Hard: 'var(--series-1)',
  Clay: 'var(--series-2)',
  Grass: 'var(--series-3)',
  Carpet: 'var(--series-4)',
}

const ROUNDS: Record<string, string> = {
  F: 'Final', SF: 'Semi-final', QF: 'Quarter-final', R16: 'Round of 16',
  R32: 'Round of 32', R64: 'Round of 64', R128: 'Round of 128', RR: 'Round robin',
  BR: 'Bronze match',
}

export const roundName = (r: string) => ROUNDS[r] ?? r

/** Surname only — used where the full name would wrap or crowd. */
export const surname = (name: string) => {
  const parts = name.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : name
}
