export type RenderLOD = 'matrix' | 'radar'
export const RADAR_ENTER_ZOOM = 0.38
export const RADAR_EXIT_ZOOM = 0.46

/** Hysteresis prevents oscillating representations during trackpad/pinch input. */
export function resolveLOD(zoom: number, previous: RenderLOD): RenderLOD {
  if (previous === 'matrix' && zoom <= RADAR_ENTER_ZOOM) return 'radar'
  if (previous === 'radar' && zoom >= RADAR_EXIT_ZOOM) return 'matrix'
  return previous
}
