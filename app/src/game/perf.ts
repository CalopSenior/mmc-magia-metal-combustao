/** Frame-time statistics in the style of MSI Afterburner / RivaTuner: average FPS, 1 % low, 0.1 % low and a frame-time graph. */

export interface PhaseTimes {
  /** Time spent stepping the simulation this frame, and how many ticks it ran. */
  readonly simulation: number
  readonly ticks: number
  readonly audio: number
  readonly render: number
}

export interface PerfStats {
  readonly fps: number
  readonly low1: number
  readonly low01: number
  readonly minFps: number
  readonly frameMs: number
  readonly worstMs: number
  readonly frames: number
  readonly simulation: number
  readonly simulationWorst: number
  readonly ticks: number
  readonly audio: number
  readonly render: number
  readonly renderWorst: number
}

const WINDOW_FRAMES = 3600
const GRAPH_FRAMES = 240

/** The average FPS of the slowest `share` of the frames (that is how Afterburner defines its 1 % and 0.1 % lows). */
export function lowFps(frameTimes: readonly number[], share: number): number {
  if (!frameTimes.length) return 0
  const sorted = [...frameTimes].sort((a, b) => b - a)
  const count = Math.max(1, Math.ceil(sorted.length * share))
  let sum = 0
  for (let index = 0; index < count; index += 1) sum += sorted[index]
  return 1000 / (sum / count)
}

export class PerfMonitor {
  private frames: number[] = []
  private phases: PhaseTimes[] = []

  reset(): void { this.frames = []; this.phases = [] }

  record(frameMs: number, phases: PhaseTimes): void {
    if (!(frameMs > 0) || frameMs > 2000) return
    this.frames.push(frameMs); this.phases.push(phases)
    if (this.frames.length > WINDOW_FRAMES) { this.frames.shift(); this.phases.shift() }
  }

  /** Frame times of the most recent frames, oldest first, for the graph. */
  recent(count = GRAPH_FRAMES): readonly number[] { return this.frames.slice(-count) }

  stats(): PerfStats {
    const count = this.frames.length
    if (!count) return { fps: 0, low1: 0, low01: 0, minFps: 0, frameMs: 0, worstMs: 0, frames: 0, simulation: 0, simulationWorst: 0, ticks: 0, audio: 0, render: 0, renderWorst: 0 }
    const total = this.frames.reduce((sum, value) => sum + value, 0)
    const worst = Math.max(...this.frames)
    const recent = this.phases.slice(-120)
    const mean = (pick: (phase: PhaseTimes) => number) => recent.reduce((sum, phase) => sum + pick(phase), 0) / recent.length
    return {
      fps: 1000 / (total / count), low1: lowFps(this.frames, 0.01), low01: lowFps(this.frames, 0.001), minFps: 1000 / worst,
      frameMs: total / count, worstMs: worst, frames: count,
      simulation: mean((phase) => phase.simulation), simulationWorst: Math.max(...recent.map((phase) => phase.simulation)), ticks: mean((phase) => phase.ticks),
      audio: mean((phase) => phase.audio), render: mean((phase) => phase.render), renderWorst: Math.max(...recent.map((phase) => phase.render)),
    }
  }
}

export const perf = new PerfMonitor()
