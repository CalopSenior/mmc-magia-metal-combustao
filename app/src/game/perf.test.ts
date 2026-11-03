import { describe, expect, it } from 'vitest'
import { PerfMonitor, lowFps } from './perf'

const phase = { simulation: 1, ticks: 1, audio: 0, render: 5 }

describe('medidor de desempenho', () => {
  it('o 1% low é a média dos 1% piores quadros, não o piso', () => {
    const times = [...Array(99).fill(10), 100]
    expect(lowFps(times, 0.01)).toBeCloseTo(10, 5)
    const many = [...Array(990).fill(10), ...Array(10).fill(50)]
    expect(lowFps(many, 0.01)).toBeCloseTo(20, 5)
    expect(lowFps(many, 0.001)).toBeCloseTo(20, 5)
  })
  it('calcula FPS médio, mínimo e as fases do quadro', () => {
    const monitor = new PerfMonitor()
    for (let index = 0; index < 100; index += 1) monitor.record(index === 50 ? 100 : 10, phase)
    const stats = monitor.stats()
    expect(stats.fps).toBeCloseTo(1000 / 10.9, 3)
    expect(stats.minFps).toBeCloseTo(10, 5)
    expect(stats.low1).toBeCloseTo(10, 5)
    expect(stats.render).toBe(5)
    expect(monitor.recent(10)).toHaveLength(10)
  })
  it('ignora intervalos absurdos (aba em segundo plano) e janela vazia', () => {
    const monitor = new PerfMonitor()
    expect(monitor.stats().fps).toBe(0)
    monitor.record(5000, phase)
    expect(monitor.stats().frames).toBe(0)
  })
})
