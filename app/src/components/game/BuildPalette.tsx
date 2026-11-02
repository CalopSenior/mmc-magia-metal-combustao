import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp, Hammer, Lock, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getResource } from '@/game/content/resources'
import { DOCK_TABS, PAVING_STYLES, RUNE_COSTS, STRUCTURES, STRUCTURE_LIST } from '@/game/content/structures'
import type { InputMode } from '@/game/core/input'
import type { HexDirection, ResourceId, ResourceInventory, StructureType } from '@/game/types'
import { PixelStructureIcon } from './PixelStructureIcon'
import { ResourceIcon } from './ResourceIcon'
import { PixelCarrierIcon } from './PixelCreatureIcon'

const DIRECTION_LABELS = ['Leste', 'Nordeste', 'Norte', 'Oeste', 'Sudoeste', 'Sul']
const DIRECTION_ANGLES = [0, -45, -90, 180, 135, 90]
const BELT_TIERS = [{ tier: 1, label: 'I · 1×' }, { tier: 2, label: 'II · 2×' }, { tier: 3, label: 'III · 4×' }] as const
const RUNES = [{ level: 1, label: '×10' }, { level: 2, label: '×100' }, { level: 3, label: '×1000' }] as const

type DockTab = (typeof DOCK_TABS)[number]['id']

interface BuildPaletteProps {
  readonly mode: InputMode
  readonly selectedType: StructureType
  readonly direction: HexDirection
  readonly tier: 1 | 2 | 3
  readonly inventory: ResourceInventory
  readonly unlocked: readonly StructureType[]
  readonly maxRune: number
  readonly lockReason: (type: StructureType) => string
  readonly onSelectType: (type: StructureType) => void
  readonly onDirection: (direction: HexDirection) => void
  readonly onTier: (tier: 1 | 2 | 3) => void
  readonly onDemolish: () => void
  readonly onClose: () => void
  readonly onDropStructure: (type: StructureType, x: number, y: number) => void
  readonly onDropRune: (level: 1 | 2 | 3, x: number, y: number) => void
  readonly onLockedTap: (message: string) => void
  readonly onOpenCreature?:()=>void
}

interface Drag { kind: 'structure'; type: StructureType; x: number; y: number }
interface RuneDrag { kind: 'rune'; level: 1 | 2 | 3; x: number; y: number }

/** Creatures are summoned separately from the machinery tabs. */
export function BuildPalette(props: BuildPaletteProps) {
  const { mode, selectedType, direction, tier, inventory, unlocked, maxRune, lockReason, onSelectType, onDirection, onTier, onDemolish, onClose, onDropStructure, onDropRune, onLockedTap } = props
  const [tab, setTab] = useState<DockTab>(STRUCTURES[selectedType].tab)
  const [collapsed, setCollapsed] = useState(false)
  const [drag, setDrag] = useState<Drag | RuneDrag | null>(null)
  const pending = useRef<{ kind: 'structure' | 'rune'; type?: StructureType; level?: 1 | 2 | 3; x: number; y: number; moved: boolean } | null>(null)

  const finish = useCallback((event: PointerEvent) => {
    const current = pending.current
    pending.current = null
    setDrag(null)
    if (!current?.moved) return
    if (current.kind === 'structure' && current.type) onDropStructure(current.type, event.clientX, event.clientY)
    if (current.kind === 'rune' && current.level) onDropRune(current.level, event.clientX, event.clientY)
  }, [onDropRune, onDropStructure])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = pending.current
      if (!current) return
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return
      current.moved = true
      setDrag(current.kind === 'structure' ? { kind: 'structure', type: current.type!, x: event.clientX, y: event.clientY } : { kind: 'rune', level: current.level!, x: event.clientX, y: event.clientY })
    }
    const cancel = () => { pending.current = null; setDrag(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [finish])

  if (mode !== 'build' && mode !== 'demolish') return null
  const definition = STRUCTURES[selectedType]
  const items = STRUCTURE_LIST.filter((structure) => structure.tab === tab)
  const cost = selectedType === 'conveyor' ? (tier === 1 ? { 'rusted-copper': 1 } : tier === 2 ? { 'rusted-copper': 2, 'fossil-coal': 1 } : { 'rusted-copper': 2, 'bloody-iron': 2 }) : definition.cost

  return (
    <aside className="build-panel forge-panel" aria-label="Doca de construção">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#f4d9a0]">
          <Hammer className="h-4 w-4" />
          <h2 className="font-display text-lg">Doca de construção</h2>
        </div>
        <div className="flex">
          <Button type="button" variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)} className="h-11 w-11 text-[#d0c3aa]" aria-expanded={!collapsed} aria-label={collapsed ? 'Expandir a doca' : 'Recolher a doca'}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="h-11 w-11 text-[#d0c3aa]" aria-label="Fechar construção">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!collapsed && <>
        <div className="dock-families" role="group" aria-label="Família da oficina">
          <button type="button" aria-pressed={tab==='creatures'} onClick={()=>{setTab('creatures');if(unlocked.includes('golem'))onSelectType('golem')}}>Criaturas</button>
          <button type="button" aria-pressed={tab!=='creatures'} onClick={()=>{setTab('logistics');onSelectType('conveyor')}}>Maquinário</button>
        </div>
        {tab!=='creatures'&&<div className="mt-1 grid grid-cols-3 gap-1" role="tablist" aria-label="Abas do maquinário">
          {DOCK_TABS.filter(entry=>entry.id!=='creatures').map((entry) => (
            <button key={entry.id} type="button" role="tab" aria-selected={tab === entry.id} onClick={() => setTab(entry.id)}
              className={`min-h-9 border px-1 text-xs ${tab === entry.id ? 'border-[#d3a958] bg-[#4a3c29] text-[#f4d9a0]' : 'border-[#63543d] bg-[#1b1815] text-[#d0c3aa] hover:bg-[#3b3124]'}`}>
              {entry.label}
            </button>
          ))}
        </div>}

        <div className="mt-2 grid grid-cols-3 gap-1.5 short-landscape:grid-cols-4" role="tabpanel">
          {items.map((structure) => {
            const isUnlocked = unlocked.includes(structure.id)
            const active = mode === 'build' && selectedType === structure.id
            return (
              <button
                key={structure.id}
                type="button"
                data-testid={`dock-${structure.id}`}
                onPointerDown={(event) => { if (isUnlocked) pending.current = { kind: 'structure', type: structure.id, x: event.clientX, y: event.clientY, moved: false } }}
                onClick={() => { if (isUnlocked) { onSelectType(structure.id); if (structure.tab !== tab) setTab(structure.tab) } else onLockedTap(lockReason(structure.id)) }}
                aria-pressed={active}
                aria-disabled={!isUnlocked}
                title={isUnlocked ? `${structure.name} — arraste para o mapa ou toque para escolher` : lockReason(structure.id)}
                style={{ touchAction: 'none' }}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 border px-1 text-[10px] short-landscape:min-h-12 short-landscape:gap-0.5 short-landscape:text-[9px] ${active ? 'border-[#d3a958] bg-[#4a3c29] text-[#f4d9a0]' : 'border-[#63543d] bg-[#1b1815] text-[#d0c3aa] hover:bg-[#3b3124]'} ${isUnlocked ? '' : 'opacity-55'}`}
              >
                <PixelStructureIcon type={structure.id} direction={direction} tier={tier} />
                {structure.shortName}
                <span className="text-xs text-[#bda67d]">{structure.size}×{structure.size}</span>
                {!isUnlocked && <Lock className="absolute right-1 top-1 h-3 w-3 text-[#e0a46b]" aria-label="Bloqueada" />}
              </button>
            )
          })}
          {tab === 'support' && RUNES.map(({ level, label }) => {
            const ok = level <= maxRune
            return <button key={level} type="button" style={{ touchAction: 'none' }} aria-disabled={!ok}
              onPointerDown={(event) => { if (ok) pending.current = { kind: 'rune', level, x: event.clientX, y: event.clientY, moved: false } }}
              onClick={() => onLockedTap(ok ? `Arraste a Runa ${label} sobre uma Fornalha, Altar ou Câmara (ou use Examinar). Custa ${RUNE_COSTS[level]} Éter.` : level === 1 ? 'Requer a Runa de Dezena no Grande Grimório.' : 'Requer as Runas de Centena e Milhar no Grande Grimório.')}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 border px-1 text-[10px] ${ok ? 'border-[#c9a45a] bg-[#2f2619] text-[#ffd37a]' : 'border-[#63543d] bg-[#1b1815] text-[#9d8f78] opacity-55'}`}>
              <span className="text-2xl leading-none" aria-hidden="true">ᚱ</span>
              Runa {label}
              <span className="text-xs text-[#bda67d]">{RUNE_COSTS[level]} Éter</span>
              {!ok && <Lock className="absolute right-1 top-1 h-3 w-3 text-[#e0a46b]" aria-label="Bloqueada" />}
            </button>
          })}
        </div>

        {tab==='creatures'&&<div className="dock-creature-note"><PixelCarrierIcon/><div><p><strong>Golem Transportador</strong>Convocado automaticamente por dois Entrepostos no mesmo canal.</p>{props.onOpenCreature&&<button type="button" onClick={props.onOpenCreature}>Ver criatura no Códice →</button>}</div></div>}

        <p className="mt-2 text-xs font-semibold text-[#e9b969]">{definition.tab==='creatures'?'Criatura escolhida':'Peça escolhida'}: {definition.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#c5b69c] short-landscape:mt-1 short-landscape:line-clamp-2 short-landscape:text-[11px]">{definition.description}</p>
        <p className="mt-1 text-xs italic text-[#9fe8ff]">{definition.lesson}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 short-landscape:mt-1 short-landscape:gap-1">
          {Object.entries(cost).map(([resource, amount]) => {
            const id = resource as ResourceId
            const available = inventory[id] ?? 0
            return (
              <span key={resource} className={`inline-flex items-center gap-1 border px-1.5 py-1 text-[10px] ${available >= (amount ?? 0) ? 'border-[#63543d] text-[#dfd2b9]' : 'border-[#815247] text-[#efb5a6]'}`}>
                <ResourceIcon resource={id} />
                {amount} {getResource(id).shortName} <span className="text-[#b0a18a]">({available})</span>
              </span>
            )
          })}
        </div>

        {selectedType === 'paving' && <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label="Acabamento do piso">
          {PAVING_STYLES.map((entry) => <button key={entry.tier} type="button" onClick={() => onTier(entry.tier)} aria-pressed={tier === entry.tier}
            className={`min-h-9 border text-xs ${tier === entry.tier ? 'border-[#d3a958] bg-[#4a3c29] text-[#f4d9a0]' : 'border-[#63543d] text-[#d0c3aa]'}`}>{entry.label}</button>)}
          <p className="col-span-3 text-[11px] text-[#b0a18a]">Arraste no mapa para pintar uma faixa de piso. Tocar num piso de outro acabamento troca só o acabamento.</p>
        </div>}

        {selectedType === 'conveyor' && <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label="Nível da esteira">
          {BELT_TIERS.map((entry) => <button key={entry.tier} type="button" onClick={() => onTier(entry.tier)} aria-pressed={tier === entry.tier}
            className={`min-h-9 border text-xs ${tier === entry.tier ? 'border-[#d3a958] bg-[#4a3c29] text-[#f4d9a0]' : 'border-[#63543d] text-[#d0c3aa]'}`}>{entry.label}</button>)}
          <p className="col-span-3 text-[11px] text-[#b0a18a]">Toque numa esteira já colocada com outro nível para melhorá-la.</p>
        </div>}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#4a3c29] pt-3 short-landscape:mt-2 short-landscape:justify-center short-landscape:pt-2">
          <span className="text-xs text-[#dfd2b9] short-landscape:hidden">{selectedType === 'prism' ? 'Eixo das saídas' : selectedType === 'bridge' ? 'Direção da pista 1' : selectedType === 'energizer' || selectedType === 'paving' || selectedType === 'lantern' ? 'Sem saída' : 'Saída'}</span>
          <div className="flex gap-1" aria-label="Direção da saída">
            {DIRECTION_LABELS.map((label, index) => (
              <Button key={label} type="button" variant="outline" size="icon" onClick={() => onDirection(index as HexDirection)} aria-label={`Direção ${label}`} aria-pressed={direction === index}
                className={`h-11 w-11 ${direction === index ? 'border-[#d3a958] bg-[#4a3c29] text-[#e9b969]' : 'border-[#63543d] bg-transparent text-[#c5b69c]'}`}>
                <ArrowRight className="h-4 w-4" style={{ transform: `rotate(${DIRECTION_ANGLES[index]}deg)` }} />
              </Button>
            ))}
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onDemolish} aria-pressed={mode === 'demolish'} className={`mt-3 h-10 w-full short-landscape:mt-2 short-landscape:h-11 ${mode === 'demolish' ? 'border-[#b76852] bg-[#3b2824] text-[#efb5a6]' : 'border-[#665047] bg-transparent text-[#d8aaa0]'}`}>
          <Trash2 className="h-4 w-4" /> Demolir e devolver recursos
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-[#b0a18a] short-landscape:hidden">
          Escolha e toque no chão; arraste no mapa para ligar esteiras. R gira · Shift + R volta · Esc fecha.
        </p>
      </>}

      {drag && <div className="dock-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
        {drag.kind === 'structure' ? <PixelStructureIcon type={drag.type} direction={direction} /> : <span className="text-4xl text-[#ffd37a]">ᚱ</span>}
      </div>}
    </aside>
  )
}
