import { Gem, Hammer, Wrench } from 'lucide-react'
import { fusionBreakdown } from '@/game/content/codex'
import { ALLOYS, getResource, resourceName } from '@/game/content/resources'
import { ALCHEMIST_COST_ETHER, ALCHEMY_BONUS, ALCHEMY_YIELD, COLLECTOR_CAPACITY, COLLECTOR_RADIUS, COLLECTOR_RELEASE, DRAGON_CORE_ORE_COST, ENERGIZER_CYCLE_TICKS, ENERGIZER_MAX_DOSE, ENERGIZER_RADIUS, GRAND_ALTAR_JOBS, GRAND_ALTAR_OUTPUT_FACTOR, MAX_TOWER_POWER, RECIPES, RUNE_COSTS, STRUCTURES, energizerBoost, maxHpFor, recipeLots } from '@/game/content/structures'
import { hpOf, isBroken, isFusionMachine, isLotMachine, recipesFor, repairCost } from '@/game/core/machineRules'
import type { GameEngine } from '@/game/boot'
import { divisors, formatFactorization } from '@/game/math/number'
import type { AlloyId, EngineSnapshot, ResourceId, Structure } from '@/game/types'
import { channelColors } from '@/game/content/channels'
import { ChannelSelector } from './ChannelSelector'

function Choice({ pressed, onClick, children, label, disabled }: { pressed: boolean; onClick: () => void; children: React.ReactNode; label?: string; disabled?: boolean }) {
  return <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={label} disabled={disabled}
    className={`min-h-9 min-w-9 border px-1.5 text-xs ${pressed ? 'border-[#d3a958] bg-[#4a3c29] text-[#e9b969]' : 'border-[#63543d] text-[#d0c3aa]'} ${disabled ? 'opacity-45' : ''}`}>{children}</button>
}

function Row({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return <div className="mt-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[10px] text-[#d0c3aa]">
    <div className="mb-1 flex items-center justify-between gap-2"><span>{title}</span></div>
    <div className="flex flex-wrap gap-1">{children}</div>
    {hint && <p className="mt-1 text-[11px] leading-snug text-[#b0a18a]">{hint}</p>}
  </div>
}

export function MachineControls({ structure, engine, snapshot }: { structure: Structure; engine: GameEngine; snapshot: EngineSnapshot }) {
  const at = { q: structure.q, r: structure.r }
  const free = snapshot.run.mode === 'free'
  const owns = (id: string) => free || snapshot.profile.tech.includes(id)
  const hp = hpOf(structure), maxHp = maxHpFor(structure.type)
  const crystals = Object.values(structure.crystals ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
  const cost = repairCost(structure)
  const lotMachine = isLotMachine(structure.type)
  const flow = owns('flow-lens') ? engine.flowFor(structure.id) : null
  const recipe = structure.target ? RECIPES[structure.target] : null
  const breakdown = structure.target ? fusionBreakdown(structure.target) : null
  const showAnswers = snapshot.profile.difficulty === 'apprentice' || snapshot.profile.difficulty === 'artisan'

  return <div data-testid="machine-controls">
    {structure.hp !== undefined && <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] text-[#c5b69c]"><span>Durabilidade</span><strong style={{ color: isBroken(structure) ? '#ff8a73' : '#dfd2b9' }}>{Math.ceil(hp)}/{maxHp}{isBroken(structure) ? ' · QUEBRADA' : ''}</strong></div>
      <div className="bar"><i style={{ width: `${(hp / maxHp) * 100}%`, background: hp / maxHp > 0.5 ? '#7ccf6e' : hp / maxHp > 0.25 ? '#e5b347' : '#e0523f' }} /></div>
      {(cost > 0) && <button type="button" onClick={() => engine.repairAt(at)} className="mt-1 flex min-h-9 w-full items-center justify-center gap-1 border border-[#b58d4f] text-xs text-[#f4d9a0]">
        <Wrench className="h-3.5 w-3.5" aria-hidden="true" /> {isBroken(structure) ? 'Consertar' : crystals > 0 && hp >= maxHp ? 'Limpar cristais' : 'Consertar'} · {free ? 'grátis' : `${cost} Éter`}
      </button>}
      {crystals > 0 && <p className="mt-1 text-[11px] text-[#d9b8ff]">◆ {crystals} cristal(is) de resto na entrada. Se acumularem demais, nasce um Monstro de Escória.</p>}
    </div>}

    {flow !== null && <p className="mt-1 text-[11px] text-[#9fe8ff]">Lente de Fluxo: {flow} item(ns)/min</p>}

    {structure.type === 'golem' && <Row title={`Seletor do Golem: ${structure.batch ?? 1} por batida`} hint={`Cada batida entrega um lote de ${structure.batch ?? 1}. Múltiplos: ${[1, 2, 3, 4, 5].map((n) => n * (structure.batch ?? 1)).join(', ')}…`}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => <Choice key={value} pressed={(structure.batch ?? 1) === value} onClick={() => engine.setGolemBatch(at, value)} label={`Seletor ${value}`}>{value}</Choice>)}
    </Row>}

    {structure.type === 'smelter' && <Row title={`Apetite de Lote: ${structure.lot ?? 2}`} hint={`Só aceita quantidades na tabuada do ${structure.lot ?? 2}: ${[1, 2, 3, 4].map((n) => n * (structure.lot ?? 2)).join(', ')}… Falta machuca; sobra cristaliza.`}>
      {[2, 3, 4, 5, 6, 7, 8, 9].map((value) => <Choice key={value} pressed={(structure.lot ?? 2) === value} onClick={() => engine.setSmelterLot(at, value)} label={`Lote ${value}`}>{value}</Choice>)}
    </Row>}

    {isFusionMachine(structure.type) && <div className="mt-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[11px] text-[#d0c3aa]">
      <label className="block">
        <span className="text-[10px]">Receita</span>
        <select value={structure.target ?? ''} onChange={(event) => engine.setTarget(at, (event.target.value || null) as AlloyId | null)}
          className="mt-1 h-10 w-full border border-[#63543d] bg-[#1b1815] px-1 text-sm text-[#f4ead4]" aria-label="Receita da máquina">
          <option value="">Automática (pelos minérios que chegam)</option>
          {recipesFor(structure.type).map((entry) => <option key={entry.id} value={entry.id}>{ALLOYS[entry.id].name} · MMC {entry.output}</option>)}
        </select>
      </label>
      {recipe && breakdown && <div className="mt-2 space-y-1">
        <p className="text-[#9fe8ff]">{showAnswers ? breakdown.sentence : `Lotes: ${breakdown.lines.map((line) => line.lot).join(' e ')}. Qual é o MMC?`}</p>
        {recipeLots(recipe).map((part) => {
          const have = structure.inputs[part.resource] ?? 0
          return <div key={part.resource}>
            <div className="flex justify-between"><span>{resourceName(part.resource)} (lote {part.lot} = {formatFactorization(part.lot)})</span><span>{have}/{part.amount}</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (have / part.amount) * 100)}%` }} /></div>
          </div>
        })}
        {recipe.catalyst > 0 && <p>Catalisador: {structure.inputs['raw-ether-crystal'] ?? 0}/{recipe.catalyst} Cristais de Éter</p>}
        {recipe.etherCost > 0 && <p>Custo por fusão: {recipe.etherCost} Éter · exige Runa</p>}
        {structure.recipe && <p className="text-[#b9ec91]">Fundindo… {Math.round((structure.progress / recipe.durationTicks) * 100)}%</p>}
      </div>}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Gem className="h-3.5 w-3.5 text-[#7de3da]" aria-hidden="true" />
        <span>Éter curinga: {structure.inputs['raw-ether-crystal'] ?? 0}</span>
        <Choice pressed={false} onClick={() => engine.insertCrystals(at, 1)} label="Inserir 1 Cristal de Éter">+1</Choice>
        <Choice pressed={false} onClick={() => engine.insertCrystals(at, 3)} label="Inserir 3 Cristais de Éter">+3</Choice>
      </div>
    </div>}

    {structure.type === 'grandaltar' && <div className="mt-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[11px] text-[#d0c3aa]">
      <p className="text-[#9fe8ff]">Funde até {GRAND_ALTAR_JOBS} ligas ao mesmo tempo e entrega × {GRAND_ALTAR_OUTPUT_FACTOR} de cada fusão.</p>
      {(structure.jobs ?? []).length === 0 && <p className="mt-1">Nenhuma fusão em andamento. Deixe a receita em automático para que o Altar use tudo o que chegar, ou fixe uma receita acima.</p>}
      {(structure.jobs ?? []).map((job, index) => <div key={index} className="mt-1">
        <div className="flex justify-between"><span>{ALLOYS[job.recipe].name}</span><span>{Math.round(job.progress / RECIPES[job.recipe].durationTicks * 100)}%</span></div>
        <div className="bar"><i style={{ width: `${Math.min(100, job.progress / RECIPES[job.recipe].durationTicks * 100)}%` }} /></div>
      </div>)}
      {Object.entries(structure.products ?? {}).length > 0 && <p className="mt-1 text-[#b9ec91]">Prontas, aguardando a saída: {Object.entries(structure.products ?? {}).map(([resource, amount]) => `${amount} × ${resourceName(resource as ResourceId)}`).join(', ')}</p>}
    </div>}

    {structure.type === 'collector' && <div className="mt-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[11px] text-[#d0c3aa]">
      <p>Recebe a carga dos Golems a até {COLLECTOR_RADIUS} células quando eles trocam de jazida, e solta em remessas de até {COLLECTOR_RELEASE}.</p>
      <p className="mt-1">Estoque: {Object.values(structure.inputs).reduce((sum, amount) => sum + (amount ?? 0), 0)}/{COLLECTOR_CAPACITY}</p>
      {Object.entries(structure.inputs).filter(([, amount]) => (amount ?? 0) > 0).map(([resource, amount]) => <p key={resource} style={{ color: getResource(resource as ResourceId).highlight }}>{amount} × {resourceName(resource as ResourceId)}</p>)}
    </div>}

    {structure.type === 'alchemy' && <div className="mt-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[11px] text-[#d0c3aa]">
      <p className="text-[#9fe8ff]">1 Núcleo de Dragão = {DRAGON_CORE_ORE_COST} minérios básicos (Aço Etéreo 4 + Adamantina Dorsal 4).</p>
      <p>Cada ciclo: {DRAGON_CORE_ORE_COST} + {ALCHEMY_BONUS} de bônus = <strong>{ALCHEMY_YIELD}</strong> do minério-semente.</p>
      <p className="mt-1">Núcleos: {structure.inputs['dragon-core'] ?? 0} · Semente: {Object.entries(structure.inputs).filter(([resource, amount]) => resource !== 'dragon-core' && (amount ?? 0) > 0).map(([resource, amount]) => `${amount} × ${resourceName(resource as ResourceId)}`).join(', ') || 'nenhuma'}</p>
      {structure.sourceResource && <p className="text-[#d9b8ff]">Transmutando {resourceName(structure.sourceResource)}…</p>}
    </div>}

    {structure.type === 'energizer' && <Row title={`Dose: ${structure.power ?? 1} Latão por ciclo → velocidade × ${energizerBoost(structure.power ?? 1)}`} hint={`Raio de ${ENERGIZER_RADIUS} células (veja o círculo no mapa). Cada ciclo dura ${ENERGIZER_CYCLE_TICKS / 20} s. ${(structure.charge ?? 0) > 0 ? `Carregado: × ${energizerBoost(structure.dose ?? 1)} por mais ${Math.ceil((structure.charge ?? 0) / 20)} s. ` : 'Sem carga. '}Latão na reserva: ${structure.inputs['resonant-brass'] ?? 0}. Os bônus de dois Energizadores não se somam: vale o maior.`}>
      {Array.from({ length: ENERGIZER_MAX_DOSE }, (_, index) => index + 1).map((value) => <Choice key={value} pressed={(structure.power ?? 1) === value} onClick={() => engine.setEnergizerDose(at, value)} label={`Dose ${value}`}>{value}</Choice>)}
    </Row>}

    {lotMachine && <>
      {structure.type !== 'grandaltar' && <Row title={`Runa Multiplicadora${(structure.rune ?? 0) ? `: ×${10 ** (structure.rune ?? 0)}` : ''}`} hint="Cada fusão passa a render 10ⁿ vezes mais, em Caixas Rúnicas Condensadas. O dano dos erros também cresce.">
        <Choice pressed={(structure.rune ?? 0) === 0} onClick={() => engine.engraveRune(at, 0)}>Nenhuma</Choice>
        {([1, 2, 3] as const).map((level) => <Choice key={level} pressed={(structure.rune ?? 0) === level} disabled={level > (owns('rune-100') ? 3 : owns('rune-10') ? 1 : 0)} onClick={() => engine.engraveRune(at, level)} label={`Runa ×${10 ** level}`}>×{10 ** level}{(structure.rune ?? 0) < level && !free ? ` · ${RUNE_COSTS[level]}` : ''}</Choice>)}
      </Row>}
      <Row title="Melhorias da máquina">
        <Choice pressed={!!structure.twin} disabled={!owns('twin-forges')} onClick={() => engine.setTwin(at, !structure.twin)} label="Forja geminada">II · Geminada{!structure.twin && !free ? ' · 6' : ''}</Choice>
        <Choice pressed={!!structure.alchemist} disabled={!owns('gnome-guild')} onClick={() => engine.setAlchemist(at, !structure.alchemist)} label="Gnomo Alquimista">A · Alquimista{!structure.alchemist && !free ? ` · ${ALCHEMIST_COST_ETHER}` : ''}</Choice>
      </Row>
    </>}

    {structure.type === 'tower' && <Row title={`Dano exato: ${structure.power ?? 1}`} hint={`Divisores de 12: ${divisors(12).join(', ')}. O Golem Corrompido só sofre o golpe se o dano dividir o HP dele sem resto.`}>
      {Array.from({ length: MAX_TOWER_POWER }, (_, index) => index + 1).map((value) => <Choice key={value} pressed={(structure.power ?? 1) === value} onClick={() => engine.setTowerPower(at, value)} label={`Dano ${value}`}>{value}</Choice>)}
    </Row>}

    {(structure.type === 'depot' || structure.type === 'portal') && <ChannelSelector colors={channelColors(structure)} kind={structure.type} onChange={colors=>engine.setChannel(at,colors)}/>}
    {structure.type === 'depot' && <Row title={`Caixa de ${structure.crateSize ?? 10}`} hint="Um Golem Transportador leva cada caixa fechada por cima de qualquer obstáculo.">
      {([10, 50, 100] as const).map((value) => <Choice key={value} pressed={(structure.crateSize ?? 10) === value} onClick={() => engine.setCrateSize(at, value)}>{value}</Choice>)}
    </Row>}

    {structure.type === 'conveyor' && !free && snapshot.run.mode !== 'free' && <p className="mt-1 text-[11px] text-[#b0a18a]">Nível {structure.tier ?? 1} · {structure.tier === 3 ? '4×' : structure.tier === 2 ? '2×' : '1×'}. Troque o nível pela Doca.</p>}

    {structure.type === 'prism' && structure.prismOutputCount === 2 && <Row title={structure.ratio ? `Proporção ${structure.ratio[0]} : ${structure.ratio[1]}` : 'Proporção igual (1 : 1)'} hint={owns('adjustable-prism') ? 'Com a proporção a : b, o lote precisa ser múltiplo de a + b.' : 'Requer o Prisma Ajustável no Grimório.'}>
      <Choice pressed={!structure.ratio} onClick={() => engine.setPrismRatio(at, null)}>1:1</Choice>
      {([[2, 1], [1, 2], [3, 1], [1, 3], [3, 2], [2, 3]] as [number, number][]).map(([a, b]) => <Choice key={`${a}${b}`} disabled={!owns('adjustable-prism')} pressed={structure.ratio?.[0] === a && structure.ratio?.[1] === b} onClick={() => engine.setPrismRatio(at, [a, b])}>{a}:{b}</Choice>)}
    </Row>}

    {structure.type === 'gnomepost' && <p className="mt-2 text-[11px] text-[#d0c3aa]">{structure.worker ? 'Gnomo a caminho de um conserto…' : 'Gnomo de prontidão: conserta máquinas e limpa cristais num raio de 9 células (gasta Éter).'}</p>}
    {structure.type === 'gnome' && <p className="mt-2 text-[11px] text-[#d0c3aa]">Tudo o que chega aqui conta para as metas do contrato.</p>}
    {structure.type !== 'gnome' && <p className="mt-2 flex items-center gap-1 text-[11px] italic text-[#9fe8ff]"><Hammer className="h-3 w-3" aria-hidden="true" /> {STRUCTURES[structure.type].lesson}</p>}
    {structure.output && <p className="mt-1 text-[11px]" style={{ color: getResource(structure.output.resource as ResourceId).highlight }}>Saída: {structure.output.amount} × {resourceName(structure.output.resource)}{structure.output.scale ? ` (cada caixa vale ${structure.output.scale})` : ''}</p>}
  </div>
}
