import modelJson from '../data/model_v2.json'
import type { LogisticModel, Player, RatedSurface } from './types'

/**
 * Report 2's final model: a logistic regression over five pre-match gaps. The
 * coefficients are exported straight from scikit-learn, so this is the same
 * arithmetic the report evaluates, not an approximation of it.
 */
const model = modelJson as LogisticModel

export const SURFACES: RatedSurface[] = ['Hard', 'Clay', 'Grass']

/** What the archive cannot know about a match that hasn't been scheduled. */
export interface Conditions {
  surface: RatedSurface
  restA: number
  restB: number
}

export const DEFAULT_CONDITIONS: Conditions = { surface: 'Hard', restA: 7, restB: 7 }

const logistic = (z: number) => 1 / (1 + Math.exp(-z))

/** Prior wins minus prior losses against this opponent — 0 if they never met. */
export function h2hEdge(a: Player, b: Player): number {
  const record = a.h2h[b.id]
  return record ? record.wins - record.losses : 0
}

/** The five inputs, always player A minus player B, in the model's order. */
export function featuresFor(a: Player, b: Player, c: Conditions): number[] {
  return [
    a.rating.elo - b.rating.elo,
    a.rating.surfaces[c.surface].rating - b.rating.surfaces[c.surface].rating,
    h2hEdge(a, b),
    c.restA - c.restB,
    a.rating.games - b.rating.games,
  ]
}

export function probabilityFrom(features: number[]): number {
  return logistic(features.reduce((z, x, i) => z + x * model.coef[i], model.intercept))
}

export function predict(a: Player, b: Player, c: Conditions): number {
  return probabilityFrom(featuresFor(a, b, c))
}

export interface Influence {
  feature: string
  label: string
  value: number
  /** Probability points this input adds to (or takes from) player A. */
  effect: number
}

/**
 * Leave-one-out: zero each gap in turn and measure how far the prediction moves.
 * For a logistic model this is exact rather than estimated.
 */
export function influences(a: Player, b: Player, c: Conditions): Influence[] {
  const features = featuresFor(a, b, c)
  const full = probabilityFrom(features)

  return model.features.map((feature, i) => {
    const neutral = features.slice()
    neutral[i] = 0
    return {
      feature,
      label: model.labels[feature] ?? feature,
      value: features[i],
      effect: full - probabilityFrom(neutral),
    }
  })
}

const signed = (v: number, digits = 0) =>
  `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(digits)}`

export function describeInfluence(f: Influence, surface: RatedSurface): string {
  switch (f.feature) {
    case 'elo_diff':
      return `${signed(f.value)} Elo`
    case 'surface_elo_diff':
      return `${signed(f.value)} on ${surface.toLowerCase()}`
    case 'h2h_diff':
      return `${signed(f.value)} in meetings`
    case 'rest_diff':
      return `${signed(f.value)} days' rest`
    case 'exp_diff':
      return `${signed(f.value)} matches`
    default:
      return signed(f.value, 2)
  }
}

export const modelInfo = {
  asOf: model.asOf,
  trainedOn: model.trainedOn,
  testAccuracy: model.testAccuracy,
  startRating: model.startRating,
}
