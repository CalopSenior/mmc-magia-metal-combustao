import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ReserveIcon, ResourceIcon } from './ResourceIcon'
import { useCompactLandscape } from '@/hooks/use-compact-landscape'
import { ALLOY_LIST } from '@/game/content/resources'
import { ORE_LIST } from '@/game/content/ores'
import type { ResourceInventory } from '@/game/types'

export function ResourceBar({ inventory }: { inventory: ResourceInventory }) {
  const compact = useCompactLandscape()
  const [choice,setChoice] = useState<boolean|null>(() => {
    try { const stored=localStorage.getItem('mmc-reserve-expanded'); return stored===null ? null : stored==='true' } catch { return null }
  })
  const expanded = choice ?? !compact
  const resources = [...ORE_LIST, ...ALLOY_LIST].filter((resource) => (inventory[resource.id] ?? 0) > 0)
  return <div className="resource-dock forge-panel" data-expanded={expanded}>
    <button type="button" className="resource-dock-title" aria-expanded={expanded} aria-controls="resource-list" aria-label={expanded?'Recolher reserva':'Expandir reserva'} onClick={() => {
      setChoice(!expanded); try { localStorage.setItem('mmc-reserve-expanded',String(!expanded)) } catch { /* Session preference still works. */ }
    }}><ReserveIcon /><span>Reserva</span>{expanded?<ChevronUp aria-hidden="true" />:<ChevronDown aria-hidden="true" />}</button>
    <div id="resource-list" className="resource-scroll" hidden={!expanded} role="region" tabIndex={0} aria-label="Inventário de recursos. Use as setas para rolar a lista.">
      {resources.map((resource) => {
        return <span key={resource.id} className="resource-token" title={resource.name}>
          <ResourceIcon resource={resource.id} />
          <span>{resource.shortName}</span><strong>{inventory[resource.id]?.toLocaleString('pt-BR')}</strong>
        </span>
      })}
      {resources.length === 0 && <span className="resource-empty">Reserva vazia</span>}
    </div>
  </div>
}
