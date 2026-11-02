import { frequencyOf, type MusicNote } from './composition'
import type { SoundCue } from './cues'

/** Everything a voice needs to make sound: a context, the shared noise tables, and where to send it. */
export interface VoiceGraph {
  readonly ctx: BaseAudioContext
  /** Where the voice plays. */
  readonly out: AudioNode
  readonly noise: AudioBuffer
  readonly brown: AudioBuffer
}

interface ToneOptions {
  type?: OscillatorType
  freq: number
  glideTo?: number
  t: number
  dur: number
  peak: number
  attack?: number
  detune?: number
  filter?: { type: BiquadFilterType; freq: number; to?: number; q?: number }
}

interface NoiseOptions {
  t: number
  dur: number
  peak: number
  type: BiquadFilterType
  freq: number
  to?: number
  q?: number
  attack?: number
  brown?: boolean
}

const FLOOR = 0.0001

function envelope(ctx: BaseAudioContext, t: number, dur: number, peak: number, attack: number): GainNode {
  const gain = ctx.createGain()
  const top = t + Math.min(attack, dur * 0.5)
  gain.gain.setValueAtTime(FLOOR, t)
  gain.gain.linearRampToValueAtTime(Math.max(FLOOR * 2, peak), top)
  gain.gain.exponentialRampToValueAtTime(FLOOR, t + dur)
  return gain
}

function filterFor(ctx: BaseAudioContext, spec: NonNullable<ToneOptions['filter']>, t: number, dur: number): BiquadFilterNode {
  const filter = ctx.createBiquadFilter()
  filter.type = spec.type
  filter.Q.value = spec.q ?? 0.7
  filter.frequency.setValueAtTime(spec.freq, t)
  if (spec.to) filter.frequency.exponentialRampToValueAtTime(spec.to, t + dur)
  return filter
}

export function tone(graph: VoiceGraph, options: ToneOptions): void {
  const { ctx, out } = graph
  const { t, dur } = options
  const osc = ctx.createOscillator()
  osc.type = options.type ?? 'sine'
  osc.frequency.setValueAtTime(options.freq, t)
  if (options.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.glideTo), t + dur)
  if (options.detune) osc.detune.value = options.detune
  const gain = envelope(ctx, t, dur, options.peak, options.attack ?? 0.004)
  let tail: AudioNode = osc
  if (options.filter) {
    const filter = filterFor(ctx, options.filter, t, dur)
    osc.connect(filter)
    tail = filter
  }
  tail.connect(gain)
  gain.connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

export function noiseBurst(graph: VoiceGraph, options: NoiseOptions): void {
  const { ctx, out } = graph
  const source = ctx.createBufferSource()
  source.buffer = options.brown ? graph.brown : graph.noise
  const filter = filterFor(ctx, { type: options.type, freq: options.freq, to: options.to, q: options.q }, options.t, options.dur)
  const gain = envelope(ctx, options.t, options.dur, options.peak, options.attack ?? 0.003)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  source.start(options.t, Math.random() * Math.max(0, source.buffer.duration - options.dur - 0.1))
  source.stop(options.t + options.dur + 0.05)
}

/** An inharmonic bell or struck metal: partial ratios the ear reads as "metal". */
function struck(graph: VoiceGraph, t: number, freq: number, peak: number, decay: number, partials: readonly (readonly [number, number, number])[]): void {
  for (const [ratio, weight, length] of partials) tone(graph, { freq: freq * ratio, t, dur: decay * length, peak: peak * weight })
}

const METAL: readonly (readonly [number, number, number])[] = [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.35], [8.93, 0.12, 0.2]]
const BELL: readonly (readonly [number, number, number])[] = [[1, 1, 1], [2.4, 0.35, 0.55], [3.76, 0.18, 0.35]]
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]

const vary = () => 0.92 + Math.random() * 0.16
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]

// One-shot machine and alert sounds ---------------------------------------------

type OneShot = (graph: VoiceGraph, t: number) => void

export const ONE_SHOTS: Record<SoundCue, OneShot> = {
  dig(graph, t) {
    const v = vary()
    noiseBurst(graph, { t, dur: 0.15, peak: 0.55, type: 'bandpass', freq: 380 * v, to: 140, q: 1.1, brown: true })
    tone(graph, { t, dur: 0.17, peak: 0.6, freq: 125 * v, glideTo: 48 })
    noiseBurst(graph, { t, dur: 0.035, peak: 0.16, type: 'highpass', freq: 3200 })
  },
  smelt(graph, t) { struck(graph, t, pick(PENTATONIC) * vary(), 0.22, 0.38, METAL) },
  fuse(graph, t) {
    struck(graph, t, 659.25, 0.2, 1.2, BELL)
    struck(graph, t + 0.07, 987.77, 0.14, 1.1, BELL)
    struck(graph, t + 0.14, 1318.5, 0.1, 1.0, BELL)
    noiseBurst(graph, { t, dur: 0.55, peak: 0.12, type: 'bandpass', freq: 500, to: 3200, q: 1.5, attack: 0.15 })
  },
  cycle(graph, t) {
    tone(graph, { t, dur: 0.3, peak: 0.17, type: 'triangle', freq: 880 })
    tone(graph, { t: t + 0.09, dur: 0.4, peak: 0.17, type: 'triangle', freq: 1108.7 })
  },
  hunger(graph, t) {
    tone(graph, { t, dur: 0.34, peak: 0.34, type: 'triangle', freq: 262, glideTo: 140, filter: { type: 'lowpass', freq: 900 } })
  },
  clog(graph, t) {
    for (const offset of [0, 0.05, 0.1]) noiseBurst(graph, { t: t + offset, dur: 0.05, peak: 0.28, type: 'bandpass', freq: 2400 + offset * 8000, q: 6 })
    tone(graph, { t, dur: 0.22, peak: 0.1, type: 'square', freq: 233, filter: { type: 'lowpass', freq: 1400 } })
    tone(graph, { t, dur: 0.22, peak: 0.08, type: 'square', freq: 330, filter: { type: 'lowpass', freq: 1400 } })
  },
  break(graph, t) {
    noiseBurst(graph, { t, dur: 0.65, peak: 0.6, type: 'lowpass', freq: 2200, to: 180, q: 0.8, brown: true })
    tone(graph, { t, dur: 0.6, peak: 0.28, type: 'sawtooth', freq: 190, glideTo: 38, filter: { type: 'lowpass', freq: 700 } })
    noiseBurst(graph, { t, dur: 0.05, peak: 0.3, type: 'highpass', freq: 2500 })
  },
  repair(graph, t) {
    ;[660, 880, 1174.7].forEach((freq, index) => tone(graph, { t: t + index * 0.085, dur: 0.22, peak: 0.2, type: 'triangle', freq }))
  },
  deliver(graph, t) {
    tone(graph, { t, dur: 0.16, peak: 0.14, freq: 1318.5 })
    tone(graph, { t: t + 0.07, dur: 0.24, peak: 0.14, freq: 1760 })
  },
  build(graph, t) {
    noiseBurst(graph, { t, dur: 0.1, peak: 0.5, type: 'lowpass', freq: 800 })
    tone(graph, { t, dur: 0.14, peak: 0.5, freq: 210, glideTo: 105 })
  },
  demolish(graph, t) {
    noiseBurst(graph, { t, dur: 0.45, peak: 0.5, type: 'lowpass', freq: 1900, to: 240, q: 0.8, brown: true })
    tone(graph, { t, dur: 0.32, peak: 0.4, freq: 92, glideTo: 40 })
  },
  shot(graph, t) {
    tone(graph, { t, dur: 0.17, peak: 0.2, type: 'sawtooth', freq: 1400 * vary(), glideTo: 260, filter: { type: 'lowpass', freq: 3500 } })
    noiseBurst(graph, { t, dur: 0.07, peak: 0.12, type: 'highpass', freq: 4000 })
  },
  ricochet(graph, t) {
    ONE_SHOTS.shot(graph, t)
    struck(graph, t + 0.06, 2100 * vary(), 0.1, 0.5, [[1, 1, 1], [2.7, 0.4, 0.6]])
  },
  spawn(graph, t) {
    const lfo = graph.ctx.createOscillator(), depth = graph.ctx.createGain()
    const osc = graph.ctx.createOscillator(), filter = graph.ctx.createBiquadFilter(), gain = envelope(graph.ctx, t, 0.65, 0.4, 0.06)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(92, t)
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.65)
    lfo.frequency.value = 11
    depth.gain.value = 7
    lfo.connect(depth)
    depth.connect(osc.frequency)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(420, t)
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.65)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(graph.out)
    for (const source of [osc, lfo]) { source.start(t); source.stop(t + 0.7) }
    noiseBurst(graph, { t, dur: 0.5, peak: 0.25, type: 'bandpass', freq: 200, q: 1.2, brown: true })
  },
  slain(graph, t) {
    noiseBurst(graph, { t, dur: 0.26, peak: 0.34, type: 'bandpass', freq: 1200, to: 300, q: 1 })
    tone(graph, { t, dur: 0.22, peak: 0.25, freq: 620, glideTo: 200 })
    ;[1568, 2093].forEach((freq, index) => tone(graph, { t: t + 0.05 + index * 0.06, dur: 0.3, peak: 0.1, freq }))
  },
  // A golem empties its sack on the collection point: a few heavy stones tumbling.
  collect(graph, t) {
    for (const [offset, freq] of [[0, 210], [0.06, 170], [0.13, 250], [0.19, 140]] as const) {
      noiseBurst(graph, { t: t + offset, dur: 0.09, peak: 0.34, type: 'bandpass', freq: freq * vary(), to: freq * 0.5, q: 1.4, brown: true })
      tone(graph, { t: t + offset, dur: 0.1, peak: 0.22, freq: freq * 0.5, glideTo: freq * 0.28 })
    }
  },
  // Alchemy: a bubbling swell that resolves into a bright arpeggio.
  transmute(graph, t) {
    noiseBurst(graph, { t, dur: 0.7, peak: 0.16, type: 'bandpass', freq: 300, to: 2400, q: 2.5, attack: 0.3 })
    for (let index = 0; index < 5; index += 1) tone(graph, { t: t + index * 0.07, dur: 0.14, peak: 0.12, freq: 380 * (1 + index * 0.31) * vary(), glideTo: 900 + index * 120 })
    ;[523.25, 659.25, 783.99, 1046.5, 1568].forEach((freq, index) => struck(graph, t + 0.5 + index * 0.08, freq, 0.12, 1.0, BELL))
  },
  // The energiser charges: a rising hum with a crackle at the top.
  energize(graph, t) {
    tone(graph, { t, dur: 0.9, peak: 0.2, type: 'sawtooth', freq: 70, glideTo: 420, attack: 0.5, filter: { type: 'lowpass', freq: 900, to: 2600 } })
    tone(graph, { t: t + 0.1, dur: 0.8, peak: 0.1, freq: 440, glideTo: 1760, attack: 0.5 })
    for (const offset of [0.62, 0.69, 0.78]) noiseBurst(graph, { t: t + offset, dur: 0.04, peak: 0.2, type: 'highpass', freq: 3800 })
  },
  portal(graph, t) {
    tone(graph, { t, dur: 0.5, peak: 0.2, freq: 280, glideTo: 1100, attack: 0.08 })
    noiseBurst(graph, { t, dur: 0.5, peak: 0.18, type: 'bandpass', freq: 400, to: 3500, q: 2, attack: 0.1 })
    struck(graph, t + 0.34, 1318.5, 0.12, 0.7, BELL)
  },
}

// Interface sounds (not placed in space) -----------------------------------------

export type UiSound = 'click' | 'confirm' | 'error' | 'notice' | 'open' | 'complete' | 'fail'

export const UI_SOUNDS: Record<UiSound, OneShot> = {
  click(graph, t) { tone(graph, { t, dur: 0.07, peak: 0.16, type: 'triangle', freq: 640, glideTo: 520 }) },
  confirm(graph, t) {
    tone(graph, { t, dur: 0.12, peak: 0.16, type: 'triangle', freq: 587.3 })
    tone(graph, { t: t + 0.07, dur: 0.2, peak: 0.16, type: 'triangle', freq: 880 })
  },
  error(graph, t) {
    tone(graph, { t, dur: 0.11, peak: 0.16, type: 'square', freq: 196, filter: { type: 'lowpass', freq: 900 } })
    tone(graph, { t: t + 0.13, dur: 0.17, peak: 0.16, type: 'square', freq: 156, filter: { type: 'lowpass', freq: 900 } })
  },
  notice(graph, t) { struck(graph, t, 987.8, 0.12, 0.45, BELL) },
  open(graph, t) { noiseBurst(graph, { t, dur: 0.22, peak: 0.12, type: 'bandpass', freq: 500, to: 2200, q: 1.2, attack: 0.08 }) },
  complete(graph, t) {
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, index) => struck(graph, t + index * 0.11, freq, 0.2, 1.1, BELL))
    tone(graph, { t, dur: 1.2, peak: 0.1, type: 'triangle', freq: 130.8, filter: { type: 'lowpass', freq: 700 } })
  },
  fail(graph, t) {
    ;[392, 349.2, 293.7, 196].forEach((freq, index) => tone(graph, { t: t + index * 0.18, dur: 0.5, peak: 0.16, type: 'triangle', freq, filter: { type: 'lowpass', freq: 1100 } }))
  },
}

// Music instruments ---------------------------------------------------------------

export interface MusicVoiceGraph extends VoiceGraph {
  /** Reverb send for this track. */
  readonly wet: AudioNode
}

function withReverb(graph: MusicVoiceGraph, amount: number): VoiceGraph {
  if (amount <= 0) return graph
  const split = graph.ctx.createGain()
  const send = graph.ctx.createGain()
  send.gain.value = amount
  split.connect(graph.out)
  split.connect(send)
  send.connect(graph.wet)
  return { ctx: graph.ctx, out: split, noise: graph.noise, brown: graph.brown }
}

export function playNote(graph: MusicVoiceGraph, note: MusicNote, t: number, stepSeconds: number): void {
  const length = note.length * stepSeconds
  const freq = frequencyOf(note.midi)
  const v = note.velocity
  switch (note.voice) {
    case 'pad': {
      const voice = withReverb(graph, 0.5)
      const dur = length + 1.2
      for (const detune of [-8, 8]) tone(voice, { t, dur, peak: 0.032 * v, type: 'sawtooth', freq, detune, attack: 0.9, filter: { type: 'lowpass', freq: 1100, q: 0.5 } })
      tone(voice, { t, dur, peak: 0.04 * v, type: 'triangle', freq, attack: 0.9 })
      break
    }
    case 'bass': {
      tone(graph, { t, dur: length * 0.95, peak: 0.2 * v, type: 'triangle', freq, attack: 0.012, filter: { type: 'lowpass', freq: 520 } })
      tone(graph, { t, dur: length * 0.95, peak: 0.12 * v, freq: freq / 2, attack: 0.012 })
      break
    }
    case 'pluck': {
      const voice = withReverb(graph, 0.45)
      tone(voice, { t, dur: 0.9, peak: 0.13 * v, type: 'triangle', freq, filter: { type: 'lowpass', freq: 3200, to: 500, q: 1 } })
      break
    }
    case 'mallet': {
      const voice = withReverb(graph, 0.2)
      tone(voice, { t, dur: 0.45, peak: 0.14 * v, freq })
      tone(voice, { t, dur: 0.12, peak: 0.07 * v, freq: freq * 4 })
      break
    }
    case 'bell': {
      const voice = withReverb(graph, 0.55)
      struck(voice, t, freq, 0.11 * v, 1.5, BELL)
      break
    }
    case 'kick': {
      tone(graph, { t, dur: 0.22, peak: 0.5 * v, freq: 125, glideTo: 42 })
      break
    }
    case 'hat': {
      noiseBurst(graph, { t, dur: 0.05, peak: 0.07 * v, type: 'highpass', freq: 7000 })
      break
    }
    case 'clang': {
      const voice = withReverb(graph, 0.5)
      struck(voice, t, 196 * (v < 0.4 ? 1 : 2), 0.12 * v, 0.7, METAL)
      noiseBurst(voice, { t, dur: 0.04, peak: 0.1 * v, type: 'highpass', freq: 3000 })
      break
    }
  }
}

// Machine ambience ---------------------------------------------------------------

export type AmbientKind = 'golem' | 'fire' | 'smelter' | 'tower' | 'portal' | 'belts' | 'gnomepost' | 'alchemy' | 'energizer'

/** How many voices of each kind may sound at once: nearest machines win. */
export const AMBIENT_VOICES: Record<AmbientKind, number> = { golem: 2, fire: 2, smelter: 1, tower: 1, portal: 1, belts: 1, gnomepost: 1, alchemy: 1, energizer: 1 }

export interface AmbientLoop { stop(): void }

function loopSource(graph: VoiceGraph, brown = false): AudioBufferSourceNode {
  const source = graph.ctx.createBufferSource()
  source.buffer = brown ? graph.brown : graph.noise
  source.loop = true
  source.start(0, Math.random() * source.buffer.duration)
  return source
}

/** Oscillator that moves one parameter, the building block of every machine's rhythm. */
function lfo(graph: VoiceGraph, rate: number, depth: number, target: AudioParam, type: OscillatorType = 'sine', stops: AudioScheduledSourceNode[] = []): void {
  const osc = graph.ctx.createOscillator(), amount = graph.ctx.createGain()
  osc.type = type
  osc.frequency.value = rate
  amount.gain.value = depth
  osc.connect(amount)
  amount.connect(target)
  osc.start()
  stops.push(osc)
}

function layer(graph: VoiceGraph, source: AudioNode, spec: { type: BiquadFilterType; freq: number; q?: number }, level: number): GainNode {
  const filter = graph.ctx.createBiquadFilter(), gain = graph.ctx.createGain()
  filter.type = spec.type
  filter.frequency.value = spec.freq
  filter.Q.value = spec.q ?? 0.7
  gain.gain.value = level
  source.connect(filter)
  filter.connect(gain)
  gain.connect(graph.out)
  return gain
}

export function buildAmbient(kind: AmbientKind, graph: VoiceGraph): AmbientLoop {
  const sources: AudioScheduledSourceNode[] = []
  const osc = (type: OscillatorType, freq: number): OscillatorNode => {
    const node = graph.ctx.createOscillator()
    node.type = type
    node.frequency.value = freq
    node.start()
    sources.push(node)
    return node
  }
  const noise = (brown = false): AudioBufferSourceNode => { const node = loopSource(graph, brown); sources.push(node); return node }
  const wobble = (rate: number, depth: number, target: AudioParam, type: OscillatorType = 'sine') => lfo(graph, rate, depth, target, type, sources)

  switch (kind) {
    case 'golem': {
      // A heavy, steady chop: low rumble pushed by a 2.4 Hz swing, with stone ticks on the beat.
      const rumble = layer(graph, noise(true), { type: 'lowpass', freq: 240 }, 0.35)
      wobble(2.4, 0.22, rumble.gain)
      const ticks = layer(graph, noise(), { type: 'bandpass', freq: 950, q: 2.4 }, 0.06)
      wobble(2.4, 0.06, ticks.gain, 'square')
      break
    }
    case 'fire': {
      layer(graph, noise(true), { type: 'lowpass', freq: 170 }, 0.42)
      // Pulses never go below silence: the base level is the sum of the swings.
      const crackle = layer(graph, noise(), { type: 'highpass', freq: 2600 }, 0.075)
      wobble(7.3, 0.03, crackle.gain, 'square')
      wobble(11.9, 0.025, crackle.gain, 'square')
      wobble(3.1, 0.02, crackle.gain, 'sawtooth')
      break
    }
    case 'smelter': {
      const drone = graph.ctx.createGain()
      drone.gain.value = 0.09
      const filter = graph.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 260
      osc('sawtooth', 55).connect(filter)
      osc('sawtooth', 55.5).connect(filter)
      filter.connect(drone)
      drone.connect(graph.out)
      const hiss = layer(graph, noise(), { type: 'bandpass', freq: 520, q: 1.2 }, 0.05)
      wobble(0.9, 0.03, hiss.gain)
      break
    }
    case 'tower': {
      const hum = graph.ctx.createGain()
      hum.gain.value = 0.06
      osc('sine', 330).connect(hum)
      osc('sine', 332.5).connect(hum)
      hum.connect(graph.out)
      wobble(6, 0.02, hum.gain)
      const air = graph.ctx.createGain()
      air.gain.value = 0.014
      osc('sine', 1320).connect(air)
      air.connect(graph.out)
      break
    }
    case 'portal': {
      for (const [freq, level, rate, depth] of [[440, 0.06, 0.35, 60], [660, 0.04, 0.5, 40], [220, 0.05, 0.22, 20]] as const) {
        const voice = osc('sine', freq), gain = graph.ctx.createGain()
        gain.gain.value = level
        wobble(rate, depth, voice.frequency)
        voice.connect(gain)
        gain.connect(graph.out)
      }
      break
    }
    case 'belts': {
      layer(graph, noise(true), { type: 'lowpass', freq: 130 }, 0.1)
      const clatter = layer(graph, noise(), { type: 'bandpass', freq: 1700, q: 4 }, 0.055)
      wobble(7, 0.035, clatter.gain, 'square')
      wobble(3.1, 0.02, clatter.gain, 'square')
      break
    }
    case 'alchemy': {
      // A cauldron: low simmer with bubbles popping at irregular beats.
      layer(graph, noise(true), { type: 'lowpass', freq: 200 }, 0.2)
      const bubbles = layer(graph, noise(), { type: 'bandpass', freq: 780, q: 5 }, 0.06)
      wobble(4.3, 0.05, bubbles.gain, 'square')
      wobble(6.7, 0.03, bubbles.gain, 'square')
      const shimmer = graph.ctx.createGain()
      shimmer.gain.value = 0.02
      const voice = osc('sine', 1046.5)
      wobble(0.6, 20, voice.frequency)
      voice.connect(shimmer)
      shimmer.connect(graph.out)
      break
    }
    case 'energizer': {
      // A mains-like hum with a slow breathing swell.
      const hum = graph.ctx.createGain()
      hum.gain.value = 0.07
      osc('sine', 110).connect(hum)
      osc('triangle', 220.8).connect(hum)
      osc('sine', 330.4).connect(hum)
      hum.connect(graph.out)
      wobble(0.45, 0.03, hum.gain)
      const sizzle = layer(graph, noise(), { type: 'highpass', freq: 4200 }, 0.012)
      wobble(9, 0.01, sizzle.gain, 'square')
      break
    }
    case 'gnomepost': {
      const tick = layer(graph, noise(), { type: 'bandpass', freq: 2200, q: 8 }, 0.07)
      wobble(3, 0.07, tick.gain, 'square')
      break
    }
  }
  return {
    stop() {
      for (const source of sources) { try { source.stop() } catch { /* already stopped */ } }
    },
  }
}
