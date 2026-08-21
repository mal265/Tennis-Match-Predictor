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
