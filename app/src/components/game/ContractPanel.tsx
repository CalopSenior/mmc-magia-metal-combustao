import { ChevronDown, ChevronUp, Target } from 'lucide-react'
import { useState } from 'react'
import { useCompactLandscape } from '@/hooks/use-compact-landscape'
import { resourceName } from '@/game/content/resources'
import { ResourceIcon } from './ResourceIcon'
import { formatNumber, formatScientific } from '@/game/math/number'
import type { ContractProgress } from '@/game/types'

export function ContractPanel({ progress }: { progress: ContractProgress }) {
  const compact = useCompactLandscape()
  const [choice,setChoice] = useState<boolean|null>(null)
  const expanded=choice ?? !compact
  const stability = progress.stability
  const tone = stability > 66 ? '#7ccf6e' : stability > 33 ? '#e5b347' : '#e0523f'
  return <section className="forge-panel contract-panel" data-expanded={expanded} aria-label={`Painel do contrato: ${progress.title}`}>
    <button type="button" className="contract-toggle" aria-expanded={expanded} aria-controls="contract-goals" onClick={() => setChoice(!expanded)}>
      <Target className="h-4 w-4" aria-hidden="true" /><span>{progress.title}</span>{expanded?<ChevronUp className="h-4 w-4" />:<ChevronDown className="h-4 w-4" />}
    </button>
    <div id="contract-goals" hidden={!expanded} className="contract-details"><ul className="space-y-1.5">
      {progress.goals.map((goal) => {
        const done = Math.min(goal.done, goal.amount)
        const label = goal.resource === 'perfect-cycles' ? 'Ciclos perfeitos (resto 0)' : resourceName(goal.resource)
        return <li key={goal.resource}>
          <div className="flex items-center justify-between gap-2 text-sm text-[#f0e1bf]">
            <span className="inline-flex min-w-0 items-center gap-1">{goal.resource !== 'perfect-cycles' && <ResourceIcon resource={goal.resource} />}{label}</span>
            <strong className={goal.done >= goal.amount ? 'text-[#b9ec91]' : ''}>{formatNumber(done)} / {formatNumber(goal.amount)}</strong>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal.amount} aria-valuenow={done} aria-label={`${label}: ${formatNumber(done)} de ${formatNumber(goal.amount)}`}>
            <i style={{ width: `${Math.min(100, (done / goal.amount) * 100)}%`, background: goal.done >= goal.amount ? '#7ccf6e' : undefined }} />
          </div>
          {goal.amount >= 1000 && <p className="text-xs text-[#b0a18a]">Meta: {formatScientific(goal.amount)}</p>}
        </li>
      })}
    </ul>
    <div>
      <div className="flex items-baseline justify-between text-xs text-[#c5b69c]"><span>Estabilidade da fábrica</span><strong style={{ color: tone }}>{stability}%</strong></div>
      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stability} aria-label={`Estabilidade da fábrica ${stability}%`}><i style={{ width: `${stability}%`, background: tone }} /></div>
    </div>
    </div></section>
}
