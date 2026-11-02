import type { Axial, BiomeId, CameraSnapshot, ChunkDistance, HexCell, ResourceInventory, SimulationSpeed, Structure } from '../game/types'

declare global {
  interface Window {
    __GAME_READY__?: boolean
    __MMC_PROBE__?: () => {
      tick: number
      seed: string
      cells: number
      chunks: number
      chunkDistance: ChunkDistance
      selected: Axial | null
      center: Axial
      centerBiome: BiomeId
      focused: HexCell
      fps: number
      dpr: number
      renderCache: {
        entries: number
        pixels: number
        drawnChunks: number
      }
      structures: Structure[]
      inventory: ResourceInventory
      cellAt: (q: number, r: number) => HexCell
      camera: CameraSnapshot
      paused: boolean
      speed: SimulationSpeed
    }
  }
}

export {}
