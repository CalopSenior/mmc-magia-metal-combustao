import type { Camera } from '../core/camera'
import { isBroken } from '../core/machineRules'
import type { Simulation } from '../core/simulation'
import { structureSize } from '../core/structureGeometry'
import { CELL_SIZE } from '../math/grid'
import type { Structure } from '../types'
import { audio } from './engine'
import { AUDIBLE_RADIUS_CELLS, placeSound, type Listener, type Placement } from './spatial'
import { AMBIENT_VOICES, type AmbientKind } from './voices'

/** Machines are re-evaluated this often: sounds fade in 120 ms, so faster would be wasted work. */
const AMBIENT_INTERVAL_MS = 90
/** About this many working machines make the factory sound "full". */
const FULL_FACTORY_MACHINES = 14
/** Summed loudness of the audible machines at which the music is dimmed all the way. */
const CROWDED_LOUDNESS = 3.5

/** Which loop a machine makes right now, or null when it is idle. */
export function ambientKindOf(structure: Structure, monsters: number): AmbientKind | null {
  if (isBroken(structure)) return null
  switch (structure.type) {
    case 'golem': return structure.migrationPath.length === 0 && structure.sourceResource && structure.progress > 0 ? 'golem' : null
    case 'furnace': case 'chamber': case 'grandaltar': return structure.recipe ? 'fire' : null
    case 'alchemy': return structure.sourceResource ? 'alchemy' : null
    case 'energizer': return (structure.charge ?? 0) > 0 ? 'energizer' : null
    case 'smelter': return structure.output ? 'smelter' : null
    case 'tower': return monsters > 0 ? 'tower' : null
    case 'portal': return Object.values(structure.inputs).some((amount) => (amount ?? 0) > 0) || Object.keys(structure.bursts ?? {}).length > 0 ? 'portal' : null
    case 'conveyor': return structure.output ? 'belts' : null
    case 'gnomepost': return structure.worker ? 'gnomepost' : null
    default: return null
  }
}

const KINDS = Object.keys(AMBIENT_VOICES) as AmbientKind[]

/**
 * Turns a running factory into sound: the cues it emits play where they happened, and every working
 * machine near the camera hums. Moving or zooming the camera changes what is heard, exactly like
 * walking through the workshop.
 */
export class FactoryAudio {
  private elapsed = AMBIENT_INTERVAL_MS
  private readonly pools = new Map<AmbientKind, Placement[]>(KINDS.map((kind) => [kind, []]))

  update(simulation: Simulation, camera: Camera, active: boolean, deltaMs: number): void {
    const listener: Listener = { x: camera.viewX / CELL_SIZE, y: camera.viewY / CELL_SIZE, zoom: camera.currentZoom }
    audio.setListener(listener)
    const cues = simulation.drainCues()
    if (!active) { this.elapsed = AMBIENT_INTERVAL_MS; audio.silenceAmbient(); return }
    for (const cue of cues) audio.playAt(cue.cue, placeSound(listener, cue.x, cue.y))
    this.elapsed += deltaMs
    if (this.elapsed < AMBIENT_INTERVAL_MS) return
    this.elapsed = 0
    this.mix(simulation, listener)
  }

  private mix(simulation: Simulation, listener: Listener): void {
    for (const pool of this.pools.values()) pool.length = 0
    const monsters = simulation.monsterCount
    let working = 0, loudness = 0
    for (const structure of simulation.structures) {
      const kind = ambientKindOf(structure, monsters)
      if (!kind) continue
      if (kind !== 'belts') working += 1
      const offset = (structureSize(structure) - 1) / 2
      const x = structure.q + offset, y = structure.r + offset
      if (Math.abs(x - listener.x) > AUDIBLE_RADIUS_CELLS || Math.abs(y - listener.y) > AUDIBLE_RADIUS_CELLS) continue
      const placement = placeSound(listener, x, y)
      if (placement.gain > 0.01) {
        this.pools.get(kind)!.push(placement)
        loudness += placement.gain * (kind === 'belts' ? 0.15 : 1)
      }
    }
    for (const kind of KINDS) {
      const pool = this.pools.get(kind)!
      pool.sort((a, b) => b.gain - a.gain)
      if (kind === 'belts' && pool.length > 1) {
        // Belts are many and quiet: they add up into one soft texture centred on the loudest.
        const total = pool.reduce((sum, placement) => sum + placement.gain, 0)
        audio.setAmbient(kind, [{ ...pool[0], gain: Math.min(1, total * 0.3) }])
      } else audio.setAmbient(kind, pool.slice(0, AMBIENT_VOICES[kind]))
    }
    audio.setCrowd(loudness / CROWDED_LOUDNESS)
    audio.setIntensity(Math.min(1, 0.12 + 0.88 * (working / FULL_FACTORY_MACHINES) + (monsters > 0 ? 0.2 : 0)))
  }

  dispose(): void {
    audio.silenceAmbient()
  }
}
