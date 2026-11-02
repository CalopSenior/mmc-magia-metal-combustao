import { useState } from 'react'
import { CheckCircle2, Lock, Play, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BIOME_LIST } from '@/game/content/biomes'
import { CONTRACTS, contractsForBiome, resolveGoals, unlockedOrder, type ContractDefinition } from '@/game/content/contracts'
import { DIFFICULTIES, TOPIC_LABELS } from '@/game/content/difficulty'
import { LESSON_BY_ID } from '@/game/content/lessons'
import { resourceName } from '@/game/content/resources'
import { TECH_BY_ID } from '@/game/content/tech'
import { formatNumber, formatScientific } from '@/game/math/number'
import type { CodexTarget, EngineSnapshot } from '@/game/types'

function lockReason(contract: ContractDefinition, snapshot: EngineSnapshot): string | null {
  const { profile } = snapshot
  if (contract.order > unlockedOrder(profile.campaign)) return `Conclua o contrato ${contract.order - 1} para liberar este.`
  if (contract.requiresTech && !profile.tech.includes(contract.requiresTech)) return `Compre "${TECH_BY_ID[contract.requiresTech]?.name}" no Grande Grimório.`
  return null
}

function formatTicks(ticks: number): string {
  const seconds = Math.round(ticks / 20)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function CampaignMap({ snapshot, onStart, onOpenCodex }: { snapshot: EngineSnapshot; onStart: (id: string) => void; onOpenCodex: (target?: CodexTarget) => void }) {
  const [selected, setSelected] = useState<ContractDefinition | null>(null)
  const { profile } = snapshot
  const level = DIFFICULTIES[profile.difficulty]
  const done = CONTRACTS.filter((contract) => profile.campaign[contract.id]?.completed).length

  return <div>
    <p className="mb-3 text-sm text-[#c5b69c]">{done} de {CONTRACTS.length} contratos concluídos. Cada contrato libera uma nova peça e ensina um conceito: tabuada, resto, MMC, MDC, primos, fatoração e potências de 10.</p>
    <div className="grid gap-4 lg:grid-cols-4">
      {BIOME_LIST.map((biome) => <section key={biome.id} aria-label={biome.name} className="border-2 bg-[#1b1815] p-3" style={{ borderColor: `${biome.edge}aa` }}>
        <h3 className="text-lg" style={{ color: biome.accent }}>{biome.name}</h3>
        <p className="mb-2 text-xs text-[#b0a18a]">{biome.epithet}</p>
        <ul className="space-y-2">
          {contractsForBiome(biome.id).map((contract) => {
            const record = profile.campaign[contract.id]
            const reason = lockReason(contract, snapshot)
            return <li key={contract.id}>
              <button type="button" data-testid={`contract-${contract.id}`} onClick={() => setSelected(contract)} aria-label={`Contrato ${contract.order}: ${contract.name}${reason ? ' (bloqueado)' : record?.completed ? ' (concluído)' : ''}`}
                className={`w-full border px-2 py-2 text-left ${reason ? 'border-[#4a3c29] opacity-70' : record?.completed ? 'border-[#8fcf8c] bg-[#1f2d1f]' : 'border-[#d3a958] bg-[#2a2216]'} hover:bg-[#3b3124]`}>
                <span className="flex items-center justify-between gap-2 text-xs text-[#b0a18a]">
                  <span>Contrato {contract.order}</span>
                  <span className="flex items-center gap-1">
                    {record?.sealed && <Stamp className="h-3.5 w-3.5 text-[#f2c876]" aria-label="Selo de Perfeição" />}
                    {record?.completed ? <CheckCircle2 className="h-4 w-4 text-[#8fcf8c]" aria-hidden="true" /> : reason ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4 text-[#e9b969]" aria-hidden="true" />}
                  </span>
                </span>
                <span className="block text-sm text-[#f4d9a0]">{contract.name}</span>
                <span className="block text-xs text-[#c5b69c]">{contract.tagline}</span>
                {record?.completed && <span className="mt-1 block text-[11px] text-[#9fe8ff]">Melhor tempo {formatTicks(record.bestTicks)}</span>}
              </button>
            </li>
          })}
        </ul>
      </section>)}
    </div>

    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null) }}>
      {selected && <DialogContent className="forge-panel max-h-[92dvh] max-w-2xl overflow-y-auto overflow-x-hidden border-[#806b4a] bg-[#25211c] text-[#f4ead4]">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#f4d9a0]">Contrato {selected.order}: {selected.name}</DialogTitle>
          <DialogDescription className="text-[#c5b69c]">{selected.tagline}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-[#dfd2b9]">
          {selected.briefing.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#e9b969]">Metas ({level.name})</h4>
            <ul className="list-disc pl-5">
              {resolveGoals(selected.goals, profile.difficulty).map((goal) => <li key={goal.resource}>
                {goal.resource === 'perfect-cycles' ? `${goal.amount} ciclos perfeitos (resto zero)` : `Entregar ${formatNumber(goal.amount)} × ${resourceName(goal.resource)}${goal.amount >= 1000 ? ` (${formatScientific(goal.amount)})` : ''}`}
              </li>)}
            </ul>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.topics.map((topic) => <span key={topic} className="pill text-xs text-[#9fe8ff]">{TOPIC_LABELS[topic]}</span>)}
            <span className="pill text-xs text-[#d9b8ff]">Mapa {selected.radius * 2 + 1}×{selected.radius * 2 + 1}</span>
          </div>
          {LESSON_BY_ID[selected.lesson] && <button type="button" className="border border-[#806b4a] px-3 py-2 text-left text-[#f4d9a0] hover:bg-[#3b3124]" onClick={() => onOpenCodex({ category: 'lessons', id: selected.lesson })}>
            📖 Ler a aula: {LESSON_BY_ID[selected.lesson].title}
          </button>}
          {(level.hints !== 'none') && <details open={level.hints === 'guided'} className="border border-[#4a3c29] p-2">
            <summary className="cursor-pointer text-[#e9b969]">Plano passo a passo</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">{selected.plan.map((step) => <li key={step}>{step}</li>)}</ol>
          </details>}
        </div>
        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
          {lockReason(selected, snapshot) && <p role="alert" className="text-sm text-[#efb5a6]">{lockReason(selected, snapshot)}</p>}
          <Button type="button" disabled={lockReason(selected, snapshot) !== null} className="h-12 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]" onClick={() => { onStart(selected.id); setSelected(null) }}>
            <Play className="h-4 w-4" /> {profile.campaign[selected.id]?.completed ? 'Jogar de novo' : 'Iniciar contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>}
    </Dialog>
  </div>
}
