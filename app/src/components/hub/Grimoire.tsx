import { Check, Lock, Sparkles, Stamp } from 'lucide-react'
import { TECH, TECH_BRANCHES, previousTech, techStatus, type TechNode } from '@/game/content/tech'
import type { EngineSnapshot } from '@/game/types'

const STATE_LABELS = { owned: 'Adquirida', available: 'Disponível', locked: 'Bloqueada', poor: 'Faltam recursos' } as const

/** Grande Grimório da Engenharia: four branches, four tiers, bought with Pontos de Éter and Selos de Perfeição. */
export function Grimoire({ snapshot, onBuy }: { snapshot: EngineSnapshot; onBuy: (id: string) => void }) {
  const { profile } = snapshot
  return <div>
    <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#c5b69c]">
      <span>Pontos de Éter vêm da velocidade e das fusões perfeitas; Selos de Perfeição, só de contratos com zero resto e zero dano.</span>
      <strong className="flex items-center gap-1 text-[#f4d9a0]"><Sparkles className="h-4 w-4" aria-hidden="true" /> {profile.ether} Éter</strong>
      <strong className="flex items-center gap-1 text-[#f4d9a0]"><Stamp className="h-4 w-4" aria-hidden="true" /> {profile.seals} Selos</strong>
    </p>
    <div className="grid gap-4 lg:grid-cols-4">
      {TECH_BRANCHES.map((branch) => <section key={branch.id} aria-label={`Ramo ${branch.id}: ${branch.name}`} className="space-y-2">
        <h3 className="text-base text-[#e9b969]">Ramo {branch.id} · {branch.name}</h3>
        <p className="-mt-1 text-xs text-[#b0a18a]">{branch.subtitle}</p>
        {TECH.filter((node) => node.branch === branch.id).map((node) => <TechCard key={node.id} node={node} snapshot={snapshot} onBuy={onBuy} />)}
      </section>)}
    </div>
  </div>
}

function TechCard({ node, snapshot, onBuy }: { node: TechNode; snapshot: EngineSnapshot; onBuy: (id: string) => void }) {
  const status = techStatus(node, snapshot.profile)
  const before = previousTech(node)
  return <article className="tech-node border-2 border-[#63543d] bg-[#1b1815] p-2.5" data-state={status} data-testid={`tech-${node.id}`}>
    <div className="flex items-start justify-between gap-2">
      <h4 className="text-sm text-[#f4d9a0]">[Nível {node.tier}] {node.name}</h4>
      {status === 'owned' ? <Check className="h-4 w-4 shrink-0 text-[#8fcf8c]" aria-label="Adquirida" /> : status === 'locked' ? <Lock className="h-4 w-4 shrink-0 text-[#b0a18a]" aria-label="Bloqueada" /> : null}
    </div>
    <p className="mt-1 text-xs leading-relaxed text-[#d0c3aa]">{node.description}</p>
    <p className="mt-1 text-[11px] italic text-[#9fe8ff]">Matemática: {node.teaches}</p>
    {status !== 'owned' && <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-xs text-[#dfd2b9]">{node.ether} Éter{node.seals ? ` + ${node.seals} Selo${node.seals > 1 ? 's' : ''}` : ''}</span>
      <button type="button" disabled={status !== 'available'} onClick={() => onBuy(node.id)}
        className="min-h-9 border border-[#b58d4f] px-3 text-xs text-[#f4d9a0] enabled:hover:bg-[#4a3c29] disabled:opacity-50"
        aria-label={`Comprar ${node.name}`} title={status === 'locked' && before ? `Compre antes: ${before.name}` : STATE_LABELS[status]}>
        Comprar
      </button>
    </div>}
  </article>
}
