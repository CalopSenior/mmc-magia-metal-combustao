import { BookOpen, MapPin, Mountain, RotateCw } from 'lucide-react'
import { ResourceIcon } from './ResourceIcon'
import { Button } from '@/components/ui/button'
import { BIOMES } from '@/game/content/biomes'
import { getCellInspection } from '@/game/content/codex'
import { structureCodexTarget } from '@/game/content/creatures'
import { channelCode, channelColors } from '@/game/content/channels'
import { getResource, resourceName } from '@/game/content/resources'
import { ALCHEMY_TICKS, ALCHEMY_YIELD, COLLECTOR_CAPACITY, COLLECTOR_RADIUS, ENERGIZER_RADIUS, GOLEM_MIGRATION_RADIUS, GRAND_ALTAR_JOBS, GRAND_ALTAR_OUTPUT_FACTOR, RECIPES, STRUCTURES, depositRecoveryPerSecond, energizerBoost } from '@/game/content/structures'
import type { GameEngine } from '@/game/boot'
import type { CodexTarget, EngineSnapshot, HexCell, PrismOutputCount, ResourceId, ResourceInventory, Structure } from '@/game/types'
import { MachineControls } from './MachineControls'
import { PixelStructureIcon } from './PixelStructureIcon'

function inventoryTotal(inventory: ResourceInventory): number {
  return Object.values(inventory).reduce((total, amount) => total + (amount ?? 0), 0)
}

function getStructureStatus(structure: Structure | null): string {
  if (!structure) return ''
  if (structure.type === 'golem') {
    if (structure.migrationPath.length > 0) {
      const target = structure.migrationPath[structure.migrationPath.length - 1]
      return `Migrando para ${target.q},${target.r} · ${structure.migrationPath.length} célula(s) restante(s)`
    }
    if (structure.hp !== undefined) return structure.output ? `Lote de ${structure.batch ?? 1} por batida · ${structure.output.amount} na saída` : `Lote de ${structure.batch ?? 1} por batida · busca o mesmo minério em raio ${GOLEM_MIGRATION_RADIUS}`
    if (structure.output?.amount === 8) return 'Saída cheia · extração bloqueada'
    return `Extração a cada ${(structure.workTicks / 20).toFixed(1)}s · busca o mesmo minério em raio ${GOLEM_MIGRATION_RADIUS}`
  }
  if (structure.type === 'conveyor') return structure.output ? `${structure.output.amount} × ${resourceName(structure.output.resource)} na esteira` : 'Esteira livre'
  if (structure.type === 'gnome') return 'Coleta para o inventário ativa'
  if (structure.type === 'prism') return `${structure.prismOutputCount} saídas · ${inventoryTotal(structure.inputs)} unidade(s) aguardando lote exato`
  if (structure.type === 'confluence') return structure.output ? `${structure.output.amount} × ${resourceName(structure.output.resource)} na saída` : 'Duas entradas traseiras · saída livre'
  if (structure.type === 'silo') return `Libera múltiplos de ${structure.siloReleaseMultiple} · ${inventoryTotal(structure.inputs)} unidade(s) armazenada(s)`
  if (structure.type === 'bridge') {
    const occupied = structure.laneOutputs.filter(Boolean).length
    return `${occupied}/2 pistas ocupadas · fluxos cruzados sem mistura`
  }
  if (structure.type === 'smelter') return `Apetite de lote ${structure.lot ?? 2} · só processa lotes completos`
  if (structure.type === 'tower') return `Dano exato ${structure.power ?? 1} · alcance de 5 células`
  if (structure.type === 'gnomepost') return structure.worker ? 'Gnomo em serviço' : 'Gnomo de prontidão'
  if (structure.type === 'collector') return `Estoque ${inventoryTotal(structure.inputs)}/${COLLECTOR_CAPACITY} · recebe de golems a até ${COLLECTOR_RADIUS} células`
  if (structure.type === 'alchemy') return structure.sourceResource ? `Multiplicando ${resourceName(structure.sourceResource)} · ${Math.round((structure.progress / ALCHEMY_TICKS) * 100)}%` : `${structure.inputs['dragon-core'] ?? 0} Núcleo(s) · cada um rende ${ALCHEMY_YIELD}`
  if (structure.type === 'energizer') return (structure.charge ?? 0) > 0 ? `Energizado ×${energizerBoost(structure.dose ?? 1)} · ${Math.ceil((structure.charge ?? 0) / 20)}s de carga · raio ${ENERGIZER_RADIUS}` : `Sem carga · ${structure.inputs['resonant-brass'] ?? 0} de Latão na reserva`
  if (structure.type === 'grandaltar') return `${structure.jobs?.length ?? 0}/${GRAND_ALTAR_JOBS} fusões · saída × ${GRAND_ALTAR_OUTPUT_FACTOR}`
  if (structure.type === 'paving') return 'Piso decorativo'
  if (structure.type === 'lantern') return 'Chama de mana acesa'
  if (structure.type === 'depot') return `Canal ${channelCode(channelColors(structure))} · caixas de ${structure.crateSize ?? 10}`
  if (structure.type === 'portal') return `Canal ${channelCode(channelColors(structure))} · primos e múltiplos de 12`
  if (structure.recipe) {
    const recipe = RECIPES[structure.recipe]
    return `${resourceName(structure.recipe)} · ${Math.round((structure.progress / recipe.durationTicks) * 100)}%`
  }
  if (structure.output) return `Saída: ${structure.output.amount} × ${resourceName(structure.output.resource)}`
  return 'Aguardando insumos compatíveis'
}

interface InspectionBalloonProps {
  cell: HexCell
  structure: Structure | null
  depositRemaining: number | null
  onOpenGuide: (target: CodexTarget) => void
  onRotate: () => void
  onExpand: () => void
  onMigrationThreshold: (threshold: number) => void
  onPrismOutputCount: (count: PrismOutputCount) => void
  onSiloReleaseMultiple: (multiple: number) => void
  engine: GameEngine | null
  snapshot: EngineSnapshot
}

export function InspectionBalloon({ cell, structure, depositRemaining, onOpenGuide, onRotate, onExpand, onMigrationThreshold, onPrismOutputCount, onSiloReleaseMultiple, engine, snapshot }: InspectionBalloonProps) {
  const inspection = getCellInspection(cell)
  const boost = engine?.recoveryBoostAt(cell) ?? 1
  const biome = BIOMES[cell.biome]
  const cellState = cell.deposit && depositRemaining !== null
    ? `${Math.floor(depositRemaining)}/${cell.deposit.quantity * cell.deposit.richness} unidades · pureza ${cell.deposit.purity}% · recuperação +${(depositRecoveryPerSecond(cell.deposit.purity) * boost).toFixed(3).replace('.', ',')}/s sem extração${boost > 1 ? ` (× ${boost} com o Energizador)` : ''}`
    : inspection.state
  const structureStatus = getStructureStatus(structure)

  return (
    <aside
      className="inspection-panel"
      aria-label="Inspeção da célula em foco"
    >
      <div className="forge-panel relative overflow-hidden rounded-xl border bg-[#25211c]/95 shadow-2xl shadow-black/35 backdrop-blur-md" style={{ borderColor: `${biome.edge}cc` }}>
        <div className="h-0.5 w-full" style={{ backgroundColor: biome.accent }} />
        <div className="p-3 sm:p-3.5 short-landscape:p-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20" style={{ color: biome.accent }}>
              {structure ? <PixelStructureIcon type={structure.type} direction={structure.direction} /> : cell.deposit ? <ResourceIcon resource={cell.deposit.ore} /> : <Mountain className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c5b69c]">
                <span>Célula em foco</span>
                <span className="font-mono normal-case tracking-normal text-[#b0a18a]">{cell.key}</span>
              </div>
              <h2 className="mt-0.5 truncate font-display text-base text-[#f4d9a0] sm:text-lg">{structure ? STRUCTURES[structure.type].name : inspection.title}</h2>
              <p className="truncate text-[11px] text-[#c5b69c]">{structure ? `Base ${structure.size ?? 1}×${structure.size ?? 1} · canto ${structure.q},${structure.r}` : inspection.subtitle}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpenGuide(structure?structureCodexTarget(structure.type):inspection.target)}
              className="h-11 w-11 shrink-0 border-[#806b4a] bg-transparent text-[#e9b969] hover:bg-[#413626]"
              aria-label={`Abrir ${structure?STRUCTURES[structure.type].name:inspection.title} no Códice`}
              title="Abrir no Códice (Ctrl + clique no mapa)"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-2 text-xs font-medium" style={{ color: biome.accent }}>{cellState}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#d0c3aa]">{inspection.description}</p>

          {structure && (
            <fieldset disabled={engine?.readOnly} className="mt-2 rounded-lg border border-[#63543d] bg-[#1b1815] p-2">
              {engine?.readOnly&&<p className="text-xs text-[#b3d294]">Exposição: configuração somente para leitura</p>}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: STRUCTURES[structure.type].color }}>{STRUCTURES[structure.type].name}</span>
                {structure.type !== 'gnome' && structure.type !== 'gnomepost' && (
                  <button type="button" onClick={onRotate} className="flex min-h-8 items-center gap-1 rounded px-1.5 text-[10px] text-[#dfd2b9] hover:bg-[#3b3124]">
                    <RotateCw className="h-3 w-3" /> Girar
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-[#c5b69c]">{structureStatus}</p>
              <p className="mt-1 text-xs text-[#dfd2b9]">Área: {structure.size ?? 1}×{structure.size ?? 1} células · saída na borda indicada.</p>
              {(structure.size ?? 1) < STRUCTURES[structure.type].size && <button type="button" onClick={onExpand} className="mt-2 w-full border border-[#b58d4f] px-2 text-sm text-[#f4d9a0]">
                Ampliar para {STRUCTURES[structure.type].size}×{STRUCTURES[structure.type].size}
              </button>}
              {structure.type === 'golem' && (
                <label className="mt-2 block rounded border border-[#4a3c29] px-2 py-1.5 text-[10px] text-[#d0c3aa]">
                  <span className="flex items-center justify-between gap-2">
                    <span>Migração automática</span>
                    <strong className="font-medium text-[#e9b969]">
                      {structure.migrationThreshold === 0 ? 'Ao esgotar' : `Aos ${structure.migrationThreshold}%`}
                    </strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={structure.migrationThreshold}
                    onChange={(event) => onMigrationThreshold(Number(event.target.value))}
                    className="mt-1.5 h-4 w-full cursor-pointer accent-[#d3a958]"
                    aria-label="Limiar de migração do Golem"
                  />
                </label>
              )}
              {structure.type === 'prism' && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded border border-[#4a3c29] px-2 py-1.5 text-[10px] text-[#d0c3aa]">
                  <span>Saídas do Prisma</span>
                  <div className="flex gap-1" aria-label="Quantidade de saídas do Prisma">
                    {([2, 3, 4, 5] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => onPrismOutputCount(count)}
                        aria-pressed={structure.prismOutputCount === count}
                        className={`min-h-8 min-w-8 rounded border ${structure.prismOutputCount === count ? 'border-[#d3a958] bg-[#4a3c29] text-[#e9b969]' : 'border-[#63543d] text-[#d0c3aa]'}`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {structure.type === 'silo' && (
                <label className="mt-2 block rounded border border-[#4a3c29] px-2 py-1.5 text-[10px] text-[#d0c3aa]">
                  <span className="flex items-center justify-between gap-2">
                    <span>Lote de liberação</span>
                    <strong className="font-medium text-[#e9b969]">Múltiplos de {structure.siloReleaseMultiple}</strong>
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="13"
                    step="1"
                    value={structure.siloReleaseMultiple}
                    onChange={(event) => onSiloReleaseMultiple(Number(event.target.value))}
                    className="mt-1.5 h-4 w-full cursor-pointer accent-[#d3a958]"
                    aria-label="Múltiplo de liberação do Silo"
                  />
                </label>
              )}
              {engine && <MachineControls structure={structure} engine={engine} snapshot={snapshot} />}
              {(structure.output || structure.laneOutputs.some(Boolean) || Object.values(structure.inputs).some((amount) => (amount ?? 0) > 0)) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(structure.inputs).filter(([, amount]) => (amount ?? 0) > 0).map(([resource, amount]) => (
                    <span key={resource} className="rounded px-1 py-0.5 text-[9px]" style={{ color: getResource(resource as ResourceId).highlight, backgroundColor: '#25211c' }}>
                      {amount} {getResource(resource as ResourceId).shortName}
                    </span>
                  ))}
                  {structure.laneOutputs.map((output, lane) => output && (
                    <span key={`${lane}-${output.resource}`} className="rounded bg-[#25211c] px-1 py-0.5 text-[9px] text-[#f4d9a0]">
                      Pista {lane + 1}: {output.amount} {getResource(output.resource).shortName}
                    </span>
                  ))}
                  {structure.output && <span className="rounded bg-[#25211c] px-1 py-0.5 text-[9px] text-[#f4d9a0]">Saída: {structure.output.amount} {getResource(structure.output.resource).shortName}</span>}
                </div>
              )}
            </fieldset>
          )}

          <div className="mt-2.5 flex min-h-8 flex-wrap items-center justify-between gap-2 border-t border-[#4a3c29] pt-2 text-[11px] text-[#c5b69c]">
            <button
              type="button"
              onClick={() => onOpenGuide({ category: 'biomes', id: cell.biome })}
              className="flex min-h-8 items-center gap-1.5 rounded px-1 text-left hover:text-[#e9b969]"
            >
              <MapPin className="h-3.5 w-3.5" /> {biome.name}
            </button>
            <span className="shrink-0 font-mono text-[#dfd2b9]">
              relevo {cell.elevation}{cell.deposit ? ` · lote ≈ ${cell.deposit.quantity}` : ''}
            </span>
          </div>
        </div>
        <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r bg-[#25211c] short-landscape:hidden" style={{ borderColor: `${biome.edge}cc` }} />
      </div>
    </aside>
  )
}
