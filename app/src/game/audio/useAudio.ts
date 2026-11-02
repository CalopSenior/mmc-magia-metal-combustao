import { useEffect, useSyncExternalStore } from 'react'
import type { MusicScene } from './composition'
import { audio } from './engine'
import type { AudioPreferences } from './preferences'

export function useAudioPreferences(): [AudioPreferences, (patch: Partial<AudioPreferences>) => void] {
  const preferences = useSyncExternalStore(audio.subscribe, audio.getPreferences, audio.getPreferences)
  return [preferences, (patch) => audio.setPreferences(patch)]
}

/** The music that belongs to the screen being shown. */
export function useMusicScene(scene: MusicScene): void {
  useEffect(() => { audio.setScene(scene) }, [scene])
}

/** Menus, hubs and dialogs lower the music while they are open. */
export function useMusicDucked(ducked: boolean): void {
  useEffect(() => {
    audio.setDucked(ducked)
    return () => audio.setDucked(false)
  }, [ducked])
}

/** A soft click on every button, without wiring each one by hand. */
export function useInterfaceSounds(): void {
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const control = target.closest('button, [role=button], [role=switch], [role=tab], [role=menuitem], a[href]')
      if (control && !control.hasAttribute('disabled') && control.getAttribute('aria-disabled') !== 'true') audio.ui('click')
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])
}
