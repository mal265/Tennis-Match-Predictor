import networkJson from '../data/model.json'
import type { Network } from './types'

/**
 * Report 1's neural network. The predictor now runs Report 2's model
 * (lib/elo-model.ts); this one is kept so Report 1's figures are drawn from the
 * network they describe.
 */
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

/**
 * The network's response to the ranking gap alone, every other input held level.
 * This is the curve the network actually learned, sampled live.
 */
export function responseCurve(points = 121, span = 300): { gap: number; prob: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const gap = -span + (2 * span * i) / (points - 1)
    return { gap, prob: forward([gap, 0, 0, 0]) }
  })
}

export const architecture = net.architecture
