import { ArrowLeft } from 'lucide-react'
import { AccessibilitySettings } from '@/components/game/AccessibilitySettings'
import { AudioSettings } from '@/components/game/AudioSettings'
import { PerformanceSettings } from '@/components/game/PerformanceSettings'
import type { VisualPreferences } from '@/game/visualPreferences'

export function SettingsScreen({ preferences, onPreferences, onBack }: {
  preferences: VisualPreferences; onPreferences: (patch: Partial<VisualPreferences>) => void; onBack: () => void
}) {
  return <main className="menu-shell" aria-labelledby="settings-title">
    <div className="menu-inner" style={{ justifyContent: 'flex-start' }}>
      <header className="menu-title">
        <h1 id="settings-title" style={{ fontSize: 'clamp(26px,5vw,44px)' }}>Configurações</h1>
        <p>Som, acessibilidade, leitura e ritmo do jogo</p>
      </header>
      <div className="forge-panel w-full max-w-xl p-5 sm:p-7">
        <AudioSettings />
        <div className="my-5 border-t border-[#584a35]" />
        <AccessibilitySettings preferences={preferences} onChange={onPreferences} />
        <div className="my-5 border-t border-[#584a35]" />
        <PerformanceSettings preferences={preferences} onChange={onPreferences} />
        <p className="mt-5 border-t border-[#584a35] pt-4 text-sm leading-relaxed text-[#c5b69c]">
          Dentro de cada save você também encontra os ajustes da fábrica: velocidade do relógio, seed da Oficina livre,
          exportação e importação do save em JSON.
        </p>
      </div>
      <div className="menu-stack">
        <button type="button" className="menu-button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Voltar</button>
      </div>
    </div>
  </main>
}
