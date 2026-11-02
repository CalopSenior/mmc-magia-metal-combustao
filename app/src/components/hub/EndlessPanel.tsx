import { useState } from 'react'
import { CalendarDays, Lock, Shuffle, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GameEngine } from '@/game/boot'
import { BIOMES } from '@/game/content/biomes'
import { dailySeed, makeEndlessSpec } from '@/game/content/endless'
import { resourceName } from '@/game/content/resources'
import { formatNumber } from '@/game/math/number'
import type { EngineSnapshot } from '@/game/types'

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/** Contratos Infinitos: daily and free seeds with a local efficiency leaderboard (fewest machines). */
export function EndlessPanel({ snapshot, onStart, onOpenGrimoire }: { snapshot: EngineSnapshot; engine: GameEngine | null; onStart: (seed: string, daily: boolean) => void; onOpenGrimoire: () => void }) {
  const unlocked = snapshot.profile.tech.includes('rune-100')
  const [seed, setSeed] = useState(randomSeed)
  const today = dailySeed()
  const chamber = snapshot.profile.tech.includes('metallurgy-2')
  const difficulty = snapshot.profile.difficulty
  const preview = (value: string) => makeEndlessSpec({ seed: value, daily: false, difficulty, chamberUnlocked: chamber })
  const daily = makeEndlessSpec({ seed: today, daily: true, difficulty, chamberUnlocked: chamber })
  const custom = preview(seed || 'X')
  const board = Object.entries(snapshot.profile.endless).sort((a, b) => a[1].machines - b[1].machines || a[1].ticks - b[1].ticks).slice(0, 8)

  if (!unlocked) return <div className="mx-auto max-w-xl space-y-3 border border-[#4a3c29] bg-[#1b1815] p-6 text-center">
    <Lock className="mx-auto h-8 w-8 text-[#e0a46b]" aria-hidden="true" />
    <h3 className="text-xl text-[#f4d9a0]">Contratos Infinitos bloqueados</h3>
    <p className="text-sm text-[#c5b69c]">O modo procedural é liberado pelas Runas de Centena e Milhar (Ramo 1 do Grande Grimório, nível 4), que permitem escalar a produção sem travar o navegador com milhares de caixas.</p>
    <Button type="button" onClick={onOpenGrimoire} className="h-11 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]">Abrir o Grimório</Button>
  </div>

  const card = (title: string, spec: ReturnType<typeof preview>, onPlay: () => void, Icon: typeof Shuffle) => <section className="forge-panel space-y-2 p-4" aria-label={title}>
    <h3 className="flex items-center gap-2 text-lg text-[#e9b969]"><Icon className="h-4 w-4" aria-hidden="true" /> {title}</h3>
    <p className="text-sm text-[#dfd2b9]">{BIOMES[spec.biome].name} · mapa {spec.radius * 2 + 1}×{spec.radius * 2 + 1}</p>
    <ul className="list-disc pl-5 text-sm text-[#dfd2b9]">
      {spec.goals.map((goal) => <li key={goal.resource}>{goal.resource === 'perfect-cycles' ? `${goal.amount} ciclos perfeitos` : `${formatNumber(goal.amount)} × ${resourceName(goal.resource)}`}</li>)}
    </ul>
    <Button type="button" onClick={onPlay} className="h-11 w-full bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]">Jogar</Button>
  </section>

  return <div className="grid gap-4 lg:grid-cols-[1fr_1fr_minmax(0,18rem)]">
    {card(`Desafio diário · ${today}`, daily, () => onStart(today, true), CalendarDays)}
    <div className="space-y-2">
      {card(`Semente livre`, custom, () => onStart(seed || randomSeed(), false), Shuffle)}
      <div className="flex gap-2">
        <Input value={seed} onChange={(event) => setSeed(event.target.value.slice(0, 24))} aria-label="Semente do contrato" className="h-11 border-[#766348] bg-[#1b1815] text-[#f4ead4]" />
        <Button type="button" variant="outline" onClick={() => setSeed(randomSeed())} className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]" aria-label="Sortear outra semente"><Shuffle className="h-4 w-4" /></Button>
      </div>
    </div>
    <section aria-label="Placar de eficiência" className="border border-[#4a3c29] bg-[#1b1815] p-3">
      <h3 className="flex items-center gap-2 text-lg text-[#e9b969]"><Trophy className="h-4 w-4" aria-hidden="true" /> Placar de eficiência</h3>
      <p className="mb-2 text-xs text-[#b0a18a]">Vence quem cumpre a meta com o menor número de máquinas. Placar guardado neste save.</p>
      {board.length === 0 ? <p className="text-sm text-[#c5b69c]">Nenhum contrato infinito concluído ainda.</p> : <ol className="space-y-1 text-sm">
        {board.map(([key, record], index) => <li key={key} className="flex justify-between gap-2 text-[#dfd2b9]"><span>{index + 1}. {key.split(':').slice(0, 2).join(' ')}</span><strong>{record.machines} máq.</strong></li>)}
      </ol>}
    </section>
  </div>
}
