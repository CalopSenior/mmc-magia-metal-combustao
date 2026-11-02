import {
  CROSSFADE_BARS, STEPS_PER_BAR, composeBar, drawPhraseBars, drawTheme, secondsPerStep, themeOf,
  type MusicNote, type MusicScene,
} from './composition'
import { playNote, type MusicVoiceGraph } from './voices'

const LOOKAHEAD_SECONDS = 0.7
const TICK_MS = 90
const FADE_IN_SECONDS = 1.2
const FADE_OUT_SECONDS = 1.4

interface Track {
  readonly scene: MusicScene
  readonly theme: number
  readonly variation: number
  readonly level: number
  readonly gain: GainNode
  /** Bars this performance lasts; the successor starts `CROSSFADE_BARS` before the end. */
  readonly phraseBars: number
  step: number
  nextTime: number
  bar: number
  notes: MusicNote[]
  live: boolean
  handedOver: boolean
  /** Past its last bar: nothing more is scheduled, only the tails ring out. */
  finished: boolean
}

/**
 * Schedules the score a little ahead of the audio clock. Scenes cross-fade instead of cutting, and inside a
 * scene the themes take turns at random: near the end of a phrase the next one (possibly the same one again,
 * with new variations) is drawn and fades in under the last two bars of the old one.
 */
export class MusicPlayer {
  private tracks: Track[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private intensity = 0.3
  private targetIntensity = 0.3
  private variations = 0
  private readonly ctx: AudioContext
  private readonly destination: AudioNode
  private readonly graph: Omit<MusicVoiceGraph, 'out'>

  constructor(ctx: AudioContext, destination: AudioNode, wet: AudioNode, noise: AudioBuffer, brown: AudioBuffer) {
    this.ctx = ctx
    this.destination = destination
    this.graph = { ctx, noise, brown, wet }
  }

  private get playing(): Track | undefined {
    return this.tracks.find((track) => track.live)
  }

  get scene(): MusicScene | null {
    return this.playing?.scene ?? null
  }

  /** Diagnostics: which theme is playing and how far into its phrase. */
  get theme(): { name: string; index: number; bar: number; phraseBars: number } | null {
    const track = this.playing
    return track ? { name: themeOf(track.scene, track.theme).name, index: track.theme, bar: Math.max(0, track.bar), phraseBars: track.phraseBars } : null
  }

  /** Plays the next theme now (diagnostics and tests). */
  skipTheme(): void {
    const track = this.playing
    if (track) this.handOver(track, this.ctx.currentTime + 0.1)
  }

  setScene(scene: MusicScene | null): void {
    if (this.scene === scene) return
    const now = this.ctx.currentTime
    for (const track of this.tracks) {
      if (!track.live) continue
      this.fadeOut(track, now, FADE_OUT_SECONDS)
    }
    if (!scene) return
    this.begin(scene, drawTheme(scene, Math.random()), now + 0.2, now + 0.15, FADE_IN_SECONDS)
  }

  private fadeOut(track: Track, from: number, seconds: number): void {
    track.live = false
    track.gain.gain.cancelScheduledValues(from)
    track.gain.gain.setValueAtTime(track.gain.gain.value, from)
    track.gain.gain.linearRampToValueAtTime(0, from + seconds)
    setTimeout(() => { track.gain.disconnect(); this.tracks = this.tracks.filter((candidate) => candidate !== track) }, (seconds + 7) * 1000)
  }

  private begin(scene: MusicScene, theme: number, startTime: number, fadeFrom: number, fadeSeconds: number): void {
    const level = themeOf(scene, theme).level
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, fadeFrom)
    gain.gain.linearRampToValueAtTime(level, fadeFrom + fadeSeconds)
    gain.connect(this.destination)
    this.variations += 1
    this.tracks.push({
      scene, theme, variation: this.variations, level, gain, phraseBars: drawPhraseBars(scene, Math.random()),
      step: 0, nextTime: startTime, bar: -1, notes: [], live: true, handedOver: false, finished: false,
    })
    this.start()
  }

  /** Draws the next theme of the same scene (any, the current one included) and lets it fade in over the old one. */
  private handOver(track: Track, at: number): void {
    track.handedOver = true
    const seconds = secondsPerStep(track.scene, track.theme) * STEPS_PER_BAR * CROSSFADE_BARS
    this.fadeOut(track, at, seconds)
    this.begin(track.scene, drawTheme(track.scene, Math.random()), at, at, seconds)
  }

  /** 0–1: how busy the factory is. The music follows with a lag, so it never jumps. */
  setIntensity(value: number): void {
    this.targetIntensity = Math.min(1, Math.max(0, value))
  }

  get currentIntensity(): number {
    return this.intensity
  }

  private start(): void {
    if (this.timer !== null) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
    this.tick()
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    for (const track of this.tracks) track.gain.disconnect()
    this.tracks = []
  }

  private tick(): void {
    if (this.ctx.state !== 'running') return
    this.intensity += (this.targetIntensity - this.intensity) * 0.12
    const horizon = this.ctx.currentTime + LOOKAHEAD_SECONDS
    // The list can grow while it is walked (a hand-over adds a track): iterate over a copy.
    for (const track of [...this.tracks]) {
      if (track.finished) continue
      const seconds = secondsPerStep(track.scene, track.theme)
      // After a long pause the clock is far ahead of the schedule: restart on the next beat instead of rushing.
      if (track.nextTime < this.ctx.currentTime - 0.5) track.nextTime = this.ctx.currentTime + 0.1
      while (track.nextTime < horizon) {
        const bar = Math.floor(track.step / STEPS_PER_BAR), step = track.step % STEPS_PER_BAR
        if (bar >= track.phraseBars) { track.finished = true; break }
        if (bar !== track.bar) {
          track.bar = bar
          track.notes = composeBar(track.scene, bar, this.intensity, track.theme, track.variation)
          if (track.live && !track.handedOver && bar >= track.phraseBars - CROSSFADE_BARS) this.handOver(track, track.nextTime)
        }
        const graph: MusicVoiceGraph = { ...this.graph, out: track.gain }
        for (const note of track.notes) if (note.step === step) playNote(graph, note, track.nextTime, seconds)
        track.nextTime += seconds
        track.step += 1
      }
    }
  }
}
