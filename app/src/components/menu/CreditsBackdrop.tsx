import { useEffect, useRef } from 'react'
import { CELL_SIZE } from '@/game/math/grid'
import { Camera } from '@/game/core/camera'
import { Renderer } from '@/game/core/renderer'
import { CreditsRun, creditsWorld } from '@/game/credits/scene'
import { SIMULATION_STEP_MS } from '@/game/config'
import { FactoryAudio } from '@/game/audio/director'

const SCENE_SECONDS = 150
const VISIBLE_CELLS = 30

/** The real engine playing a finished factory behind the credits: it builds itself, runs, and starts over. */
export function CreditsBackdrop({ still }: { still: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: Renderer
    try { renderer = new Renderer(canvas) } catch { return }
    const world = creditsWorld(), run = new CreditsRun(world), camera = new Camera(), sound = new FactoryAudio()
    let frame = 0, last: number | null = null, accumulator = 0, elapsed = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const { clientWidth: width, clientHeight: height } = canvas
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      camera.resize(width, height)
      camera.restore({ x: camera.viewX, y: camera.viewY, zoom: Math.min(1.1, Math.max(0.3, width / (VISIBLE_CELLS * CELL_SIZE))) })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const loop = (timestamp: number) => {
      frame = requestAnimationFrame(loop)
      const delta = last === null ? 0 : Math.min(250, timestamp - last)
      last = timestamp
      if (!document.hidden) {
        accumulator += delta * (still ? 1 : 1.5)
        while (accumulator >= SIMULATION_STEP_MS) { run.step(); accumulator -= SIMULATION_STEP_MS }
        elapsed += delta / 1000
        if (elapsed > SCENE_SECONDS) { run.restart(); renderer.invalidate(); elapsed = 0 }
      }
      const sway = still ? 0 : elapsed
      camera.restore({ x: Math.sin(sway / 9) * 4.5 * CELL_SIZE - 2 * CELL_SIZE, y: Math.cos(sway / 13) * 1.6 * CELL_SIZE - 1.5 * CELL_SIZE, zoom: camera.currentZoom })
      renderer.render(world, camera, run.simulation, null, dpr)
      sound.update(run.simulation, camera, !document.hidden, delta)
    }
    frame = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); sound.dispose() }
  }, [still])
  return <canvas ref={canvasRef} className="credits-backdrop" aria-hidden="true" />
}
