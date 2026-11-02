import { useEffect, useRef } from 'react'
import { startGame, stopGame, type GameEngine } from '@/game/boot'
import { DEMO_SLOT_ID, type SlotId } from '@/game/config'
import type { InputMode } from '@/game/core/input'
import type { CodexTarget, EngineSnapshot, SaveStatus, EngineCallbacks } from '@/game/types'

interface GameCanvasProps {
  onBuildSelection: NonNullable<EngineCallbacks['onBuildSelection']>
  slot: SlotId
  onEngine: (engine: GameEngine | null) => void
  onSnapshot: (snapshot: EngineSnapshot) => void
  onSaveStatus: (status: SaveStatus) => void
  onError: (message: string) => void
  onNotice: (message: string) => void
  onOpenGuide: (target: CodexTarget) => void
  onLesson: (message: string) => void
  inputMode: InputMode
}

export function GameCanvas({ slot, onEngine, onSnapshot, onSaveStatus, onError, onNotice, onOpenGuide, onLesson, onBuildSelection, inputMode }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = startGame(canvas, { onSnapshot, onSaveStatus, onError, onNotice, onOpenGuide, onLesson, onBuildSelection }, slot)
    onEngine(engine)
    canvas.focus({ preventScroll: true })
    return () => {
      onEngine(null)
      stopGame(engine)
    }
  }, [slot, onEngine, onError, onNotice, onOpenGuide, onLesson, onSaveStatus, onSnapshot, onBuildSelection])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#111a18]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#20312b_0%,#111a18_70%)]" />
      <canvas
        id="world-canvas"
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f2c876] ${['build','demolish','rotate','copy'].includes(inputMode) ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        tabIndex={0}
        role="application"
        aria-label={slot===DEMO_SLOT_ID?'Exposição protegida do M.M.C. Arraste para explorar e toque nas estruturas para inspecionar. O roteiro visita os distritos. Ctrl mais clique abre o Códice.':'Mundo ortogonal do M.M.C. Mover seleciona estruturas no toque e desloca no arrasto. Na Oficina, arraste para conectar esteiras e use R para girar. Ação escolhe girar, copiar ou recolher ao toque. Ctrl mais clique abre o Códice.'}
        aria-describedby="game-controls map-focus-summary"
      />
      <div className="map-aim" aria-hidden="true"><span /></div>
    </div>
  )
}
