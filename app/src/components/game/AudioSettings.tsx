import { Volume2, VolumeX } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { audio } from '@/game/audio/engine'
import { useAudioPreferences } from '@/game/audio/useAudio'

const CHANNELS = [
  ['master', 'Volume geral', 'Controla tudo o que o jogo toca.'],
  ['music', 'Música', 'A trilha do menu, da oficina e dos créditos.'],
  ['effects', 'Efeitos das máquinas', 'Golens, fornalhas, torres e alertas. Ficam mais altos quando a câmera se aproxima e somem à distância.'],
] as const

export function AudioSettings() {
  const [preferences, update] = useAudioPreferences()
  return <section className="audio-settings space-y-4" aria-labelledby="audio-title">
    <h2 id="audio-title" className="flex items-center gap-2 font-display text-lg text-[#e9b969]">
      {preferences.muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />} Som e música
    </h2>
    <p className="text-sm text-[#d0c3aa]">Tudo é sintetizado na hora, sem arquivos de áudio. Preferências deste navegador, iguais em todos os saves.</p>
    <div className="preference-switch">
      <label htmlFor="pref-muted"><span>Silenciar tudo</span><small>Mantém os volumes escolhidos para quando você voltar.</small></label>
      <Switch id="pref-muted" checked={preferences.muted} onCheckedChange={(muted) => update({ muted })} />
    </div>
    {CHANNELS.map(([key, label, description]) => <div key={key} className="audio-slider">
      <div className="flex items-baseline justify-between gap-3">
        <label id={`audio-${key}-label`} className="text-[#f0d7aa]">{label}</label>
        <output className="font-mono text-sm text-[#e9b969]" aria-hidden="true">{Math.round(preferences[key] * 100)}%</output>
      </div>
      <Slider
        aria-labelledby={`audio-${key}-label`} min={0} max={100} step={5} disabled={preferences.muted}
        value={[Math.round(preferences[key] * 100)]}
        onValueChange={([value]) => update({ [key]: value / 100 })}
        onValueCommit={() => { if (key === 'effects') audio.ui('confirm') }}
        className="audio-slider-control"
      />
      <small className="text-[#c4b397]">{description}</small>
    </div>)}
  </section>
}
