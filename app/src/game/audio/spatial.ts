/** Where the player "stands": the centre of the view, in grid cells, plus how close the camera is. */
export interface Listener { readonly x: number; readonly y: number; readonly zoom: number }

export interface Placement {
  /** 0–1, already includes the camera height. */
  readonly gain: number
  /** −1 (left) … 1 (right). */
  readonly pan: number
  /** 0 = clear, 1 = very muffled: drives a low-pass so far sounds are dull as well as quiet. */
  readonly muffle: number
  readonly distance: number
}

/** Beyond this many cells a machine is silent. */
export const AUDIBLE_RADIUS_CELLS = 18
/** Inside this many cells the sound is at full level. */
export const NEAR_FIELD_CELLS = 1.5
const MAX_PAN = 0.9

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** Zooming in is "lowering the camera towards the factory": louder; zooming far out thins everything. */
export function altitudeGain(zoom: number): number {
  return clamp(0.45 + 0.6 * zoom, 0.4, 1.1)
}

/** Smooth fall-off: full volume close by, a curved slope, and exactly zero at the audible radius. */
export function distanceGain(distance: number, radius = AUDIBLE_RADIUS_CELLS, near = NEAR_FIELD_CELLS): number {
  if (distance <= near) return 1
  if (distance >= radius) return 0
  const slope = (distance - near) / (radius - near)
  return (1 - slope) * (1 - slope)
}

export function placeSound(listener: Listener, x: number, y: number, radius = AUDIBLE_RADIUS_CELLS): Placement {
  const dx = x - listener.x, dy = y - listener.y
  const distance = Math.hypot(dx, dy)
  if (distance >= radius) return { gain: 0, pan: 0, muffle: 1, distance }
  const slope = clamp((distance - NEAR_FIELD_CELLS) / (radius - NEAR_FIELD_CELLS), 0, 1)
  return {
    gain: distanceGain(distance, radius) * altitudeGain(listener.zoom),
    // Very close sources stay centred instead of flicking between ears.
    pan: clamp(dx / (radius * 0.45), -1, 1) * MAX_PAN * Math.min(1, distance / 2),
    muffle: slope,
    distance,
  }
}

/** Cut-off for the distance low-pass: 16 kHz up close, about 700 Hz at the edge. */
export function muffleCutoff(muffle: number): number {
  return 700 * Math.pow(16000 / 700, (1 - clamp(muffle, 0, 1)) ** 2)
}
