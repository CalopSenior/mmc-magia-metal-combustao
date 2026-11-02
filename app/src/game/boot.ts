import { GameEngine } from './core/engine'
import type { SlotId } from './config'
import type { EngineCallbacks } from './types'

export function startGame(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, slot: SlotId): GameEngine {
  const engine = new GameEngine(canvas, callbacks, slot)
  void engine.start()
  return engine
}

export function stopGame(engine: GameEngine): void {
  engine.stop()
}

export type { GameEngine }
