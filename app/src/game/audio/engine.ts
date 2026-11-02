import type { MusicScene } from './composition'
import type { SoundCue } from './cues'
import { MusicPlayer } from './music'
import {
  DEFAULT_AUDIO_PREFERENCES, normalizeAudioPreferences, perceptual, readAudioPreferences, writeAudioPreferences,
  type AudioPreferences,
} from './preferences'
import { muffleCutoff, type Listener, type Placement } from './spatial'
import { AMBIENT_VOICES, ONE_SHOTS, UI_SOUNDS, buildAmbient, type AmbientKind, type AmbientLoop, type UiSound, type VoiceGraph } from './voices'

/** Synthesised voices are written quiet on purpose (no clipping); this brings the buses to a comfortable level before the compressor. */
const MASTER_TRIM = 3.4
/** Music sits under the effects, whatever the sliders say. */
const MUSIC_LEVEL = 0.8
const DUCKED = 0.45
/** With a crowded workshop the music steps back: this much quieter and this far below its normal brightness. */
const CROWD_GAIN = 0.7
const CROWD_BRIGHT_HZ = 16000
const CROWD_DULL_HZ = 1900
const MAX_ONE_SHOTS = 18
/** Silent for this long: the loop is stopped and freed. */
const IDLE_RELEASE_MS = 4000
/** Per-cue minimum gap, so a busy factory is a texture and not a machine gun. */
const COOLDOWN_MS: Record<SoundCue, number> = {
  build: 45, demolish: 80, dig: 140, smelt: 120, fuse: 250, cycle: 200, hunger: 300, clog: 300, break: 400,
  repair: 250, deliver: 110, shot: 120, ricochet: 150, spawn: 500, slain: 250, portal: 300,
  collect: 200, transmute: 350, energize: 400,
}
const AMBIENT_LEVEL: Record<AmbientKind, number> = { golem: 0.9, fire: 0.9, smelter: 0.8, tower: 1, portal: 1, belts: 0.8, gnomepost: 0.8, alchemy: 0.9, energizer: 0.8 }

interface AmbientVoice {
  readonly loop: AmbientLoop
  readonly gain: GainNode
  readonly pan: StereoPannerNode
  readonly filter: BiquadFilterNode
  quietSince: number
}

function noiseTable(ctx: BaseAudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1
    if (brown) { last = (last + 0.02 * white) / 1.02; data[index] = last * 3.5 } else data[index] = white
  }
  return buffer
}

function impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    let smooth = 0
    for (let index = 0; index < length; index += 1) {
      smooth += (Math.random() * 2 - 1 - smooth) * 0.55
      data[index] = smooth * Math.pow(1 - index / length, 3.2)
    }
  }
  return buffer
}

/**
 * Everything audible, synthesised with Web Audio: no sample files. The context is created on the
 * first click or key press, because browsers do not allow sound before then.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private musicFilter!: BiquadFilterNode
  private effectsBus!: GainNode
  private musicWet!: GainNode
  private effectsWet!: GainNode
  private analyser: AnalyserNode | null = null
  private noise!: AudioBuffer
  private brown!: AudioBuffer
  private music: MusicPlayer | null = null
  private wantedScene: MusicScene | null = null
  private wantedIntensity = 0.3
  private ducked = false
  /** 0–1: how many machines are audible around the camera. */
  private crowd = 0
  private listener: Listener = { x: 0, y: 0, zoom: 0.9 }
  private preferences: AudioPreferences = DEFAULT_AUDIO_PREFERENCES
  private readonly subscribers = new Set<() => void>()
  private readonly lastPlayed = new Map<string, number>()
  private readonly ambient = new Map<AmbientKind, (AmbientVoice | null)[]>()
  private activeOneShots = 0
  private unlocked = false

  constructor() {
    if (typeof window === 'undefined') return
    this.preferences = readAudioPreferences()
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      window.removeEventListener('touchend', unlock, true)
      this.unlocked = true
      this.create()
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    window.addEventListener('touchend', unlock, true)
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) void this.ctx.suspend()
      else void this.ctx.resume()
    })
  }

  // Setup ----------------------------------------------------------------------

  private create(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    this.noise = noiseTable(ctx, 2.5, false)
    this.brown = noiseTable(ctx, 2.5, true)
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16
    compressor.knee.value = 14
    compressor.ratio.value = 4
    compressor.attack.value = 0.005
    compressor.release.value = 0.22
    this.master = ctx.createGain()
    this.musicBus = ctx.createGain()
    this.effectsBus = ctx.createGain()
    compressor.connect(this.master)
    this.master.connect(ctx.destination)
    this.musicFilter = ctx.createBiquadFilter()
    this.musicFilter.type = 'lowpass'
    this.musicFilter.frequency.value = CROWD_BRIGHT_HZ
    this.musicFilter.Q.value = 0.5
    this.musicBus.connect(this.musicFilter)
    this.musicFilter.connect(compressor)
    this.effectsBus.connect(compressor)
    if (import.meta.env.DEV) {
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.master.connect(this.analyser)
    }
    const response = impulse(ctx, 2.2)
    const reverb = (target: AudioNode, level: number): GainNode => {
      const input = ctx.createGain(), convolver = ctx.createConvolver(), output = ctx.createGain()
      convolver.buffer = response
      output.gain.value = level
      input.connect(convolver)
      convolver.connect(output)
      output.connect(target)
      return input
    }
    this.musicWet = reverb(this.musicBus, 0.7)
    this.effectsWet = reverb(this.effectsBus, 0.6)
    this.applyLevels(true)
    this.music = new MusicPlayer(ctx, this.musicBus, this.musicWet, this.noise, this.brown)
    this.music.setIntensity(this.wantedIntensity)
    this.music.setScene(this.wantedScene)
    void ctx.resume()
  }

  private applyLevels(immediate = false): void {
    if (!this.ctx) return
    const now = this.ctx.currentTime, glide = immediate ? 0.001 : 0.05
    const { master, music, effects, muted } = this.preferences
    this.master.gain.setTargetAtTime(muted ? 0 : perceptual(master), now, glide)
    const crowded = 1 - (1 - CROWD_GAIN) * this.crowd
    this.musicBus.gain.setTargetAtTime(perceptual(music) * MUSIC_LEVEL * MASTER_TRIM * (this.ducked ? DUCKED : 1) * crowded, now, immediate ? 0.001 : 0.45)
    this.musicFilter.frequency.setTargetAtTime(CROWD_BRIGHT_HZ * Math.pow(CROWD_DULL_HZ / CROWD_BRIGHT_HZ, this.crowd), now, immediate ? 0.001 : 0.6)
    this.effectsBus.gain.setTargetAtTime(perceptual(effects) * MASTER_TRIM, now, glide)
  }

  // Preferences ----------------------------------------------------------------

  getPreferences = (): AudioPreferences => this.preferences

  setPreferences(patch: Partial<AudioPreferences>): void {
    this.preferences = normalizeAudioPreferences({ ...this.preferences, ...patch })
    writeAudioPreferences(this.preferences)
    this.applyLevels()
    for (const notify of this.subscribers) notify()
  }

  subscribe = (notify: () => void): (() => void) => {
    this.subscribers.add(notify)
    return () => { this.subscribers.delete(notify) }
  }

  // Music ----------------------------------------------------------------------

  setScene(scene: MusicScene | null): void {
    this.wantedScene = scene
    this.music?.setScene(scene)
  }

  /** Diagnostics: jump to the next theme of the current scene. */
  skipTheme(): void {
    this.music?.skipTheme()
  }

  setIntensity(value: number): void {
    this.wantedIntensity = value
    this.music?.setIntensity(value)
  }

  /** Menus and dialogs lower the music a little so the interface is heard. */
  setDucked(value: boolean): void {
    if (this.ducked === value) return
    this.ducked = value
    this.applyLevels()
  }

  /** How crowded the workshop sounds (0–1): the music dims and dulls a little to leave room for the machines. */
  setCrowd(value: number): void {
    const next = Math.min(1, Math.max(0, value))
    if (Math.abs(next - this.crowd) < 0.02) return
    this.crowd = next
    this.applyLevels()
  }

  // Effects --------------------------------------------------------------------

  setListener(listener: Listener): void {
    this.listener = listener
  }

  get currentListener(): Listener {
    return this.listener
  }

  private throttled(key: string, gap: number): boolean {
    const now = performance.now()
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < gap) return true
    this.lastPlayed.set(key, now)
    return false
  }

  private voiceGraph(out: AudioNode): VoiceGraph {
    return { ctx: this.ctx!, out, noise: this.noise, brown: this.brown }
  }

  /** A machine sound at a position: quieter, duller and off-centre the farther it is from the view. */
  playAt(cue: SoundCue, placement: Placement): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || placement.gain < 0.012 || this.activeOneShots >= MAX_ONE_SHOTS) return
    if (this.throttled(cue, COOLDOWN_MS[cue])) return
    const input = ctx.createGain(), lowpass = ctx.createBiquadFilter(), pan = ctx.createStereoPanner(), send = ctx.createGain()
    input.gain.value = placement.gain
    lowpass.type = 'lowpass'
    lowpass.frequency.value = muffleCutoff(placement.muffle)
    pan.pan.value = placement.pan
    send.gain.value = 0.35
    input.connect(lowpass)
    lowpass.connect(pan)
    pan.connect(this.effectsBus)
    pan.connect(send)
    send.connect(this.effectsWet)
    this.activeOneShots += 1
    ONE_SHOTS[cue](this.voiceGraph(input), ctx.currentTime + 0.005)
    setTimeout(() => {
      this.activeOneShots -= 1
      for (const node of [input, lowpass, pan, send]) node.disconnect()
    }, 2200)
  }

  /** Interface sounds sit at the centre, at full level. */
  ui(sound: UiSound): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || this.throttled(`ui:${sound}`, sound === 'click' ? 35 : 120)) return
    const input = ctx.createGain()
    input.gain.value = 0.9
    input.connect(this.effectsBus)
    UI_SOUNDS[sound](this.voiceGraph(input), ctx.currentTime + 0.005)
    setTimeout(() => input.disconnect(), 2500)
  }

  /**
   * Continuous machine sound. `slots` are the audible emitters of one kind, loudest first;
   * a kind keeps a few voices, and missing slots fade to silence.
   */
  setAmbient(kind: AmbientKind, slots: readonly Placement[]): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const voices = this.ambient.get(kind) ?? Array.from({ length: AMBIENT_VOICES[kind] }, () => null)
    this.ambient.set(kind, voices)
    const now = ctx.currentTime, wall = performance.now()
    voices.forEach((voice, index) => {
      const slot = slots[index]
      if (!voice && slot && slot.gain >= 0.01) voice = voices[index] = this.createAmbient(kind)
      if (!voice) return
      const gain = slot ? slot.gain * AMBIENT_LEVEL[kind] : 0
      voice.gain.gain.setTargetAtTime(gain, now, 0.12)
      if (slot) {
        voice.pan.pan.setTargetAtTime(slot.pan, now, 0.12)
        voice.filter.frequency.setTargetAtTime(muffleCutoff(slot.muffle), now, 0.12)
      }
      if (gain > 0.004) voice.quietSince = wall
      else if (wall - voice.quietSince > IDLE_RELEASE_MS) {
        voice.loop.stop()
        voice.filter.disconnect(); voice.pan.disconnect(); voice.gain.disconnect()
        voices[index] = null
      }
    })
  }

  silenceAmbient(): void {
    this.setCrowd(0)
    for (const kind of this.ambient.keys()) this.setAmbient(kind, [])
  }

  private createAmbient(kind: AmbientKind): AmbientVoice {
    const ctx = this.ctx!
    const filter = ctx.createBiquadFilter(), pan = ctx.createStereoPanner(), gain = ctx.createGain()
    filter.type = 'lowpass'
    filter.frequency.value = 16000
    gain.gain.value = 0
    filter.connect(pan)
    pan.connect(gain)
    gain.connect(this.effectsBus)
    return { loop: buildAmbient(kind, this.voiceGraph(filter)), gain, pan, filter, quietSince: performance.now() }
  }

  // Diagnostics (development only) -----------------------------------------------

  debug() {
    const levels = new Float32Array(this.analyser?.fftSize ?? 0)
    this.analyser?.getFloatTimeDomainData(levels)
    let peak = 0, sum = 0
    for (const sample of levels) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample }
    return {
      state: this.ctx?.state ?? 'not-created',
      unlocked: this.unlocked,
      scene: this.music?.scene ?? null,
      theme: this.music?.theme ?? null,
      crowd: Number(this.crowd.toFixed(2)),
      intensity: this.music?.currentIntensity ?? 0,
      oneShots: this.activeOneShots,
      ambient: Object.fromEntries([...this.ambient].map(([kind, voices]) => [kind, voices.map((voice) => voice ? Number(voice.gain.gain.value.toFixed(3)) : null)])),
      peak: Number(peak.toFixed(3)),
      rms: Number(Math.sqrt(sum / Math.max(1, levels.length)).toFixed(4)),
      preferences: this.preferences,
    }
  }
}

export const audio = new AudioEngine()
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__MMC_AUDIO__ = audio
