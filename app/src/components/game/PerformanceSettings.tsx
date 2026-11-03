import { Gauge } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { VisualPreferences } from '@/game/visualPreferences'

export function PerformanceSettings({ preferences, onChange }: {
  preferences: VisualPreferences; onChange: (patch: Partial<VisualPreferences>) => void
}) {
  return <section className="space-y-3" aria-labelledby="performance-title">
    <h2 id="performance-title" className="flex items-center gap-2 font-display text-lg text-[#e9b969]">
      <Gauge className="h-5 w-5" aria-hidden="true" /> Desempenho
    </h2>
    <div className="preference-switch">
      <label htmlFor="pref-perfOverlay"><span>Medidor de desempenho</span><small>Mostra FPS médio, 1% low, 0,1% low, gráfico de tempo de quadro e quanto custam a simulação, o desenho e o áudio.</small></label>
      <Switch id="pref-perfOverlay" checked={preferences.perfOverlay} onCheckedChange={(checked) => onChange({ perfOverlay: checked })} />
    </div>
  </section>
}
