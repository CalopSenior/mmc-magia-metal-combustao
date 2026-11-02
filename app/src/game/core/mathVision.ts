import { getResource, resourceName } from '../content/resources'
import { ALCHEMY_BONUS, ALCHEMY_YIELD, COLLECTOR_CAPACITY, DRAGON_CORE_ORE_COST, GRAND_ALTAR_JOBS, GRAND_ALTAR_OUTPUT_FACTOR, RECIPES, STRUCTURES, energizerBoost, recipeLots } from '../content/structures'
import { channelCode,channelColors } from '../content/channels'
import { describeDivision, lcmMany } from '../math/number'
import type { ResourceId, Structure } from '../types'
import { energizerActive, isBroken, isLotMachine, portLot, pendingBurst } from './machineRules'

export interface MathLine { readonly text: string; readonly tone: 'info' | 'good' | 'bad' | 'warn' }

/**
 * The equation floating over a machine (GDD 9.2, Visão Matemática).
 * `reveal` is false for the advanced difficulties: they see the question, not the answer.
 */
export function machineMath(structure: Structure, reveal: boolean): MathLine[] {
  const lines: MathLine[] = []
  if (isBroken(structure)) lines.push({ text: 'QUEBRADA — conserte', tone: 'bad' })
  switch (structure.type) {
    case 'golem': {
      const batch = structure.batch ?? 1
      lines.push({ text: `lote ${batch}: ${batch}, ${batch * 2}, ${batch * 3}…`, tone: 'info' })
      break
    }
    case 'smelter': {
      const lot = structure.lot ?? 2
      lines.push({ text: `apetite de lote ${lot}`, tone: 'info' })
      const incoming = Object.entries(structure.bursts ?? {})[0]
      if (incoming) {
        const [, tracker] = incoming
        lines.push({ text: describeDivision(tracker.count, lot), tone: tracker.count % lot === 0 ? 'good' : 'bad' })
      }
      break
    }
    case 'furnace':
    case 'chamber': {
      const recipe = structure.target ? RECIPES[structure.target] : null
      if (!recipe) { lines.push({ text: 'escolha a receita', tone: 'warn' }); break }
      const parts = recipeLots(recipe)
      const lcm = lcmMany(parts.map((part) => part.lot))
      lines.push({ text: reveal ? `MMC(${parts.map((part) => part.lot).join(', ')}) = ${lcm}` : `MMC(${parts.map((part) => part.lot).join(', ')}) = ?`, tone: 'info' })
      lines.push({ text: parts.map((part) => `${getResource(part.resource).shortName} ${structure.inputs[part.resource] ?? 0}/${part.amount}`).join(' · '), tone: 'info' })
      for (const part of parts) {
        const pending = pendingBurst(structure, part.resource)
        if (pending > 0) lines.push({ text: describeDivision(pending, portLot(structure, part.resource)), tone: pending % part.lot === 0 ? 'good' : 'bad' })
      }
      break
    }
    case 'prism': {
      const count = structure.prismOutputCount
      lines.push({ text: structure.ratio && count === 2 ? `proporção ${structure.ratio[0]} : ${structure.ratio[1]}` : `÷ ${count} saídas`, tone: 'info' })
      break
    }
    case 'silo':
      lines.push({ text: `libera de ${structure.siloReleaseMultiple} em ${structure.siloReleaseMultiple}`, tone: 'info' })
      break
    case 'depot':
      lines.push({ text: `caixas de ${structure.crateSize ?? 10} · ${channelCode(channelColors(structure))}`, tone: 'info' })
      break
    case 'portal':
      lines.push({ text: `primo ou ×12 · ${channelCode(channelColors(structure))}`, tone: 'info' })
      break
    case 'tower':
      lines.push({ text: `dano exato ${structure.power ?? 1}`, tone: 'info' })
      break
    case 'collector':
      lines.push({ text: `estoque ${Object.values(structure.inputs).reduce((sum, amount) => sum + (amount ?? 0), 0)}/${COLLECTOR_CAPACITY}`, tone: 'info' })
      break
    case 'alchemy':
      lines.push({ text: `1 Núcleo = ${DRAGON_CORE_ORE_COST} minérios · ${DRAGON_CORE_ORE_COST} + ${ALCHEMY_BONUS} = ${ALCHEMY_YIELD}`, tone: 'info' })
      if (structure.sourceResource) lines.push({ text: `multiplicando ${resourceName(structure.sourceResource)}`, tone: 'good' })
      break
    case 'energizer': {
      const dose = Math.max(1, structure.power ?? 1)
      lines.push({ text: `dose ${dose}: velocidade 1 + ${dose} = ×${energizerBoost(dose)}`, tone: energizerActive(structure) ? 'good' : 'info' })
      break
    }
    case 'grandaltar':
      lines.push({ text: `${structure.jobs?.length ?? 0}/${GRAND_ALTAR_JOBS} fusões · saída × ${GRAND_ALTAR_OUTPUT_FACTOR}`, tone: 'info' })
      break
    case 'conveyor':
      if ((structure.tier ?? 1) > 1) lines.push({ text: `×${structure.tier === 3 ? 4 : 2}`, tone: 'info' })
      break
    default:
      break
  }
  if (isLotMachine(structure.type) && structure.type !== 'grandaltar' && (structure.rune ?? 0) > 0) lines.push({ text: `Runa ×${10 ** (structure.rune ?? 0)}`, tone: 'warn' })
  return lines
}

export function describeStock(structure: Structure): string[] {
  return Object.entries(structure.inputs)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([resource, amount]) => `${amount} × ${resourceName(resource as ResourceId)}`)
}

export function machineName(structure: Structure): string {
  return STRUCTURES[structure.type].name
}
