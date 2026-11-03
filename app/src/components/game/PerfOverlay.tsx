import { useEffect, useRef, useState } from 'react'
import { perf, type PerfStats } from '@/game/perf'

const WIDTH = 252, HEIGHT = 64, SCALE_MS = 50

function colorFor(ms: number): string { return ms <= 17.5 ? '#6fe08a' : ms <= 33.5 ? '#f0d35a' : '#ff6b5a' }

/** A live frame-time panel: FPS, 1 % low, 0.1 % low, where the time goes and a frame-time graph. Reads the monitor on its own timer. */
export function PerfOverlay() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [stats, setStats] = useState<PerfStats>(() => perf.stats())
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStats(perf.stats())
      const context = canvas.current?.getContext('2d')
      if (!context) return
      context.clearRect(0, 0, WIDTH, HEIGHT)
      context.fillStyle = '#0b100dcc'; context.fillRect(0, 0, WIDTH, HEIGHT)
      for (const ms of [16.7, 33.3]) {
        const y = HEIGHT - ms / SCALE_MS * HEIGHT
        context.fillStyle = '#ffffff30'; context.fillRect(0, Math.round(y), WIDTH, 1)
      }
      const recent = perf.recent(WIDTH)
      recent.forEach((ms, index) => {
        const bar = Math.max(1, Math.min(HEIGHT, ms / SCALE_MS * HEIGHT))
        context.fillStyle = colorFor(ms)
        context.fillRect(WIDTH - recent.length + index, HEIGHT - bar, 1, bar)
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [])
  const fmt = (value: number, digits = 0) => value.toFixed(digits)
  return <aside className="perf-overlay" aria-label="Medidor de desempenho" role="status">
    <div className="perf-head"><b className="perf-fps" style={{ color: colorFor(stats.fps ? 1000 / stats.fps : 99) }}>{fmt(stats.fps)}</b><span>FPS</span><span>{fmt(stats.frameMs, 1)} ms</span></div>
    <div className="perf-row"><span>1% low</span><b style={{ color: colorFor(stats.low1 ? 1000 / stats.low1 : 99) }}>{fmt(stats.low1)}</b><span>0,1% low</span><b style={{ color: colorFor(stats.low01 ? 1000 / stats.low01 : 99) }}>{fmt(stats.low01)}</b></div>
    <div className="perf-row"><span>mín.</span><b>{fmt(stats.minFps)}</b><span>pior</span><b>{fmt(stats.worstMs, 1)} ms</b></div>
    <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-hidden="true" />
    <div className="perf-row"><span>simulação</span><b>{fmt(stats.simulation, 1)} ms</b><span>pico</span><b>{fmt(stats.simulationWorst, 1)}</b></div>
    <div className="perf-row"><span>desenho</span><b>{fmt(stats.render, 1)} ms</b><span>pico</span><b>{fmt(stats.renderWorst, 1)}</b></div>
    <div className="perf-row"><span>áudio</span><b>{fmt(stats.audio, 1)} ms</b><span>ticks/quadro</span><b>{fmt(stats.ticks, 1)}</b></div>
  </aside>
}
