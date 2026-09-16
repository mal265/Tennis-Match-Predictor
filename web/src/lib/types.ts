export type Surface = 'Hard' | 'Clay' | 'Grass' | 'Carpet'

export interface SurfaceRecord {
  wins: number
  losses: number
  winRate: number
}

export interface LastMeeting {
  year: number
  tournament: string
  surface: string
  round: string
  score: string
  won: boolean
}

export interface Head2Head {
  wins: number
  losses: number
  lastMeeting: LastMeeting
}

export interface Career {
  matches: number
  wins: number
  losses: number
  winRate: number
  titles: number
  finals: number
  bestRank: number
  firstYear: number
  lastYear: number
  surfaces: Partial<Record<Surface, SurfaceRecord>>
  bestSurface: Surface | null
  vsTop10: { wins: number; losses: number }
  avgAces: number | null
  grandSlamWins: number
}

export interface Player {
  id: string
  name: string
  rank: number
  points: number
  age: number
  height: number
  country: string
  career: Career | null
  h2h: Record<string, Head2Head>
  /** Elo ratings as of the archive's last match — the inputs Report 2's model reads. */
  rating: Rating
}

export interface ModelResult {
  key: string
  name: string
  family: string
  accuracy: number
  lift: number
  auc: number | null
  logLoss: number | null
}

export interface Analytics {
  dataset: {
    matches: number
    trainMatches: number
    testMatches: number
    firstYear: number
    lastYear: number
    players: number
    tournaments: number
    upsetRate: number
    favoriteWinRate: number
  }
  models: ModelResult[]
  neuralNetwork: {
    accuracy: number
    auc: number
    logLoss: number
    confusion: { tn: number; fp: number; fn: number; tp: number }
    calibration: { predicted: number; actual: number; count: number }[]
    roc: { fpr: number; tpr: number }[]
  }
  rankGap: { label: string; matches: number; baseline: number; model: number }[]
  bySurface: {
    surface: string
    matches: number
    favoriteWinRate: number
    avgMinutes: number
    avgAces: number
  }[]
  byYear: { year: number; matches: number; favoriteWinRate: number }[]
  byLevel: { level: string; matches: number; favoriteWinRate: number }[]
  importance: {
    feature: string
    label: string
    logregCoef: number
    treeImportance: number
    permutation: number
  }[]
}

export interface Network {
  features: string[]
  scaler: { mean: number[]; scale: number[] }
  layers: { weights: number[][]; bias: number[]; activation: string }[]
  architecture: { hidden: number[]; iterations: number; classes: number[] }
}

/* --- Report 2 ------------------------------------------------------------ */

export type RatedSurface = 'Hard' | 'Clay' | 'Grass'

export interface Rating {
  rated: boolean
  elo: number
  games: number
  peak: { rating: number; date: string } | null
  lastMatch: { date: string; event: string } | null
  surfaces: Record<RatedSurface, { rating: number; games: number }>
}

export interface LogisticModel {
  features: string[]
  labels: Record<string, string>
  coef: number[]
  intercept: number
  startRating: number
  asOf: string
  trainedOn: number
  testAccuracy: number
}

/** A paired comparison on the same held-out matches. */
export interface PairedTest {
  lift: number
  ciLow: number
  ciHigh: number
  pValue: number
  onlyModelRight: number
  onlyReferenceRight: number
}

/** Per-match loss on the same matches; improvement > 0 means the model is better. */
export interface LossComparison {
  reference: number
  model: number
  improvement: number
  ciLow: number
  ciHigh: number
  pValue: number
}

export interface Report2Step extends PairedTest {
  key: string
  label: string
  detail: string
  features: string[]
  accuracy: number
  auc: number
  logLoss: number
}

export interface Report2 {
  asOf: string
  split: { train: number; test: number }
  baseline: number
  report1: {
    logisticAccuracy: number
    networkAccuracy: number
    networkAuc: number
    networkLogLoss: number
  }
  final: { accuracy: number; auc: number; logLoss: number; correct: number }
  steps: Report2Step[]
  finalVsReport1: PairedTest
  finalVsReport1Probabilities: { logLoss: LossComparison; brier: LossComparison }
  singles: { rankOnly: number; experienceOnly: number; eloRule: number }
  restVariants: { raw: number; capped: number }
  context: { rematchShare: number; sameRestShare: number }
  importance: {
    feature: string
    label: string
    drop: number
    coef: number
    standardised: number
  }[]
  calibration: { predicted: number; actual: number; count: number }[]
  eloBands: {
    label: string
    lo: number
    hi: number | null
    matches: number
    baseline: number
    model: number
  }[]
  rankBands: {
    label: string
    matches: number
    baseline: number
    report1Lift: number
    finalLift: number
  }[]
  leaders: {
    current: { name: string; rating: number; games: number }[]
    peak: { name: string; rating: number; date: string }[]
    surfaces: Record<RatedSurface, { name: string; rating: number; games: number }[]>
  }
  trajectories: {
    name: string
    points: { t: string; r: number }[]
    peak: { t: string; r: number }
  }[]
  rivalry: { a: string; b: string; aWins: number; bWins: number }
  reproduction: { checked: number; matched: number }
}
