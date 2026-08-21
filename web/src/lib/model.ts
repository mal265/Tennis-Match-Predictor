import networkJson from '../data/model.json'
import type { Network, Player } from './types'

const net = networkJson as Network

/** Standardise, then run the MLP forward pass exactly as scikit-learn would. */
export function forward(features: number[]): number {
  let activations = features.map((x, i) => (x - net.scaler.mean[i]) / net.scaler.scale[i])

  for (const layer of net.layers) {
    const next = layer.bias.slice()
    for (let i = 0; i < activations.length; i++) {
      const row = layer.weights[i]
      const a = activations[i]
      for (let j = 0; j < next.length; j++) next[j] += a * row[j]
    }
    activations = layer.activation === 'relu' ? next.map((v) => Math.max(0, v)) : next
  }

  // Binary head: a single logit through a logistic activation -> P(player A wins).
  return 1 / (1 + Math.exp(-activations[0]))
}

/** The four differences the model was trained on: always A minus B. */
export function featuresFor(a: Player, b: Player): number[] {
  return [a.rank - b.rank, a.points - b.points, a.age - b.age, a.height - b.height]
}

export function predict(a: Player, b: Player): number {
  return forward(featuresFor(a, b))
}

export interface Influence {
  feature: string
  label: string
  value: number
  /** Probability points this input adds to (or takes from) player A. */
  effect: number
}

const LABELS: Record<string, string> = {
  rank_diff: 'Ranking gap',
  points_diff: 'ATP points gap',
  age_diff: 'Age gap',
  height_diff: 'Height gap',
}

const UNITS: Record<string, (v: number) => string> = {
  rank_diff: (v) => `${v > 0 ? '+' : ''}${v} places`,
  points_diff: (v) => `${v > 0 ? '+' : ''}${v.toLocaleString()} pts`,
  age_diff: (v) => `${v > 0 ? '+' : ''}${v} yrs`,
  height_diff: (v) => `${v > 0 ? '+' : ''}${v} cm`,
}

/**
 * Leave-one-out ablation: neutralise each input in turn and measure how far the
 * prediction moves. This is the model's own arithmetic, not a stand-in for it.
 */
export function influences(a: Player, b: Player): Influence[] {
  const features = featuresFor(a, b)
  const full = forward(features)

  return net.features.map((feature, i) => {
    const ablated = features.slice()
    ablated[i] = 0
    return {
      feature,
      label: LABELS[feature] ?? feature,
      value: features[i],
      effect: full - forward(ablated),
    }
  })
}

export function describeInfluence(f: Influence): string {
  return (UNITS[f.feature] ?? ((v: number) => String(v)))(f.value)
}

/**
 * The model's response to the ranking gap alone, every other input held level.
 * This is the curve the network actually learned, sampled live.
 */
export function responseCurve(points = 121, span = 300): { gap: number; prob: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const gap = -span + (2 * span * i) / (points - 1)
    return { gap, prob: forward([gap, 0, 0, 0]) }
  })
}

export const architecture = net.architecture
