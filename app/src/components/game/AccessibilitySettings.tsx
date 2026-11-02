import { Accessibility } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { VisualPreferences } from '@/game/visualPreferences'

export function AccessibilitySettings({ preferences, onChange }: {
  preferences: VisualPreferences; onChange: (patch: Partial<VisualPreferences>) => void
}) {
  return <section className="accessibility-settings space-y-4" aria-labelledby="accessibility-title">
    <h2 id="accessibility-title" className="flex items-center gap-2 font-display text-lg text-[#e9b969]">
      <Accessibility className="h-5 w-5" aria-hidden="true" /> Acessibilidade e leitura
    </h2>
    <p className="text-sm text-[#d0c3aa]">Oficina de Acessibilidade — preferências deste navegador, iguais em todos os saves.</p>
    <fieldset>
      <legend className="mb-2 text-sm text-[#f4d9a0]">Fonte da interface</legend>
      <div className="preference-choices">
        <button type="button" aria-pressed={preferences.font === 'pixel'} onClick={() => onChange({ font: 'pixel' })}>Pixel</button>
        <button type="button" aria-pressed={preferences.font === 'readable'} onClick={() => onChange({ font: 'readable' })} className="font-readable">Legível</button>
      </div>
    </fieldset>
    <fieldset>
      <legend className="mb-2 text-sm text-[#f4d9a0]">Contorno da malha</legend>
      <div className="preference-choices">
        {([['off', 'Oculto'], ['subtle', 'Suave'], ['strong', 'Forte']] as const).map(([grid, label]) =>
          <button key={grid} type="button" aria-pressed={preferences.grid === grid} onClick={() => onChange({ grid })}>{label}</button>)}
      </div>
      <p className="mt-2 text-xs text-[#c5b69c]">Traço claro e escuro sobre qualquer terreno. A oficina sempre mostra a malha; o radar permanece livre.</p>
    </fieldset>
    {([
      ['largeText', 'Texto ampliado', 'Aumenta rótulos, números e descrições.'],
      ['highContrast', 'Alto contraste', 'Texto claro, bordas reforçadas e contorno nas máquinas.'],
      ['reducedMotion', 'Reduzir animações', 'Interrompe pulsações, esteiras e partículas decorativas.'],
      ['colorblind', 'Formas para daltonismo', 'Desenha uma forma geométrica diferente (círculo, quadrado, losango, triângulo, hexágono, cruz) sobre cada minério e liga, além da cor.'],
      ['calmPace', 'Ritmo calmo da fábrica', 'Desacelera o relógio global para 60%, dando mais tempo para pensar na conta.'],
    ] as const).map(([key, label, description]) => <div key={key} className="preference-switch">
      <label htmlFor={`pref-${key}`}><span>{label}</span><small>{description}</small></label>
      <Switch id={`pref-${key}`} checked={preferences[key]} onCheckedChange={(checked) => onChange({ [key]: checked })} />
    </div>)}
  </section>
}
