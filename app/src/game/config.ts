import type { CameraSnapshot, GameSettings } from './types'

/** The single-save id used before save slots existed; it is imported into slot 1 on first launch. */
export const LEGACY_SAVE_ID = 'architecture-sandbox'
export const SAVE_ID = LEGACY_SAVE_ID
export const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const
export const DEMO_SLOT_ID = 'slot-4' as const
export type PlayableSlotId = (typeof SLOT_IDS)[number]
export type SlotId = PlayableSlotId | typeof DEMO_SLOT_ID
export const SAVE_SCHEMA_VERSION = 7
export const DEFAULT_SEED = 'DRAGON-DORSAL-01'
export const HEX_SIZE = 38
export const CHUNK_SIZE = 8
export const DEFAULT_CHUNK_DISTANCE = 2
export const MIN_CHUNK_DISTANCE = 1
export const MAX_CHUNK_DISTANCE = 4
export const SIMULATION_STEP_MS = 50
export const MAX_FRAME_DELTA_MS = 250
export const AUTOSAVE_INTERVAL_MS = 5000
export const SNAPSHOT_INTERVAL_MS = 200

export const DEFAULT_CAMERA: CameraSnapshot = { x: 0, y: 0, zoom: 0.9 }
export const DEFAULT_SETTINGS: GameSettings = {
  speed: 1,
  showCoordinates: false,
  chunkDistance: DEFAULT_CHUNK_DISTANCE,
}
