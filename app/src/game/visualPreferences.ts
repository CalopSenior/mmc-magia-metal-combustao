/** Accessibility belongs to the player/device, independently of world imports. */
export interface VisualPreferences {
  font: 'pixel' | 'readable'
  largeText: boolean
  grid: 'off' | 'subtle' | 'strong'
  highContrast: boolean
  reducedMotion: boolean
  /** Extra geometric shapes on every resource, so colour is never the only cue (GDD 9.1). */
  colorblind: boolean
  /** Slows the whole factory clock, for readers who want more time to think. */
  calmPace: boolean
  /** Frame-time meter (FPS, 1 % low, graph) over the game. */
  perfOverlay: boolean
}

export const VISUAL_PREFERENCES_KEY = 'mmc-visual-preferences-v1'
export const DEFAULT_VISUAL_PREFERENCES: VisualPreferences = {
  font: 'pixel', largeText: false, grid: 'subtle', highContrast: false, reducedMotion: false, colorblind: false, calmPace: false, perfOverlay: false,
}

export function normalizeVisualPreferences(value: unknown, defaults = DEFAULT_VISUAL_PREFERENCES): VisualPreferences {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    font: data.font === 'readable' || data.font === 'pixel' ? data.font : defaults.font,
    grid: data.grid === 'off' || data.grid === 'subtle' || data.grid === 'strong' ? data.grid : defaults.grid,
    largeText: typeof data.largeText === 'boolean' ? data.largeText : defaults.largeText,
    highContrast: typeof data.highContrast === 'boolean' ? data.highContrast : defaults.highContrast,
    reducedMotion: typeof data.reducedMotion === 'boolean' ? data.reducedMotion : defaults.reducedMotion,
    colorblind: typeof data.colorblind === 'boolean' ? data.colorblind : defaults.colorblind,
    calmPace: typeof data.calmPace === 'boolean' ? data.calmPace : defaults.calmPace,
    perfOverlay: typeof data.perfOverlay === 'boolean' ? data.perfOverlay : defaults.perfOverlay,
  }
}

export function readVisualPreferences(): VisualPreferences {
  const defaults = { ...DEFAULT_VISUAL_PREFERENCES,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: more)').matches,
  }
  try { return normalizeVisualPreferences(JSON.parse(localStorage.getItem(VISUAL_PREFERENCES_KEY) ?? 'null'), defaults) }
  catch { return defaults }
}

export function applyVisualPreferences(preferences: VisualPreferences): void {
  const data = document.documentElement.dataset
  data.font = preferences.font
  data.largeText = String(preferences.largeText)
  data.highContrast = String(preferences.highContrast)
  data.reducedMotion = String(preferences.reducedMotion)
  data.colorblind = String(preferences.colorblind)
  try { localStorage.setItem(VISUAL_PREFERENCES_KEY, JSON.stringify(preferences)) } catch { /* The current session still works when storage is unavailable. */ }
}

export function nextGrid(grid: VisualPreferences['grid']): VisualPreferences['grid'] {
  return grid === 'off' ? 'subtle' : grid === 'subtle' ? 'strong' : 'off'
}
