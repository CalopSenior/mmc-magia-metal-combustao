import type { CodexTarget, StructureType } from '../types'
import type { MachineGuide } from './machineGuides'

export function isCreature(type:StructureType):type is 'golem'|'gnome' {return type==='golem'||type==='gnome'}
export function structureCodexTarget(type:StructureType):CodexTarget {return isCreature(type)?{category:'creatures',id:type}:{category:'machines',id:type}}
/** Old links keep working, but creatures always open their own section. */
export function normalizeCodexTarget(target:CodexTarget):CodexTarget {return target.category==='machines'?structureCodexTarget(target.id):target}
export const CARRIER_GUIDE:MachineGuide={
  purpose:'Leva caixas entre Entrepostos do mesmo canal. É um colosso de pedra animado por runas, capaz de atravessar obstáculos com a carga.',
  input:'Uma caixa fechada de 10, 50 ou 100 unidades de um único recurso no Entreposto de origem.',
  output:'O mesmo material e a mesma quantidade no Entreposto parceiro. As caixas não multiplicam nem convertem minérios.',
  setup:'Construa dois Entrepostos, selecione o mesmo canal em ambos e alimente a origem. O transportador é convocado automaticamente. Após descarregar, caminha vazio de volta e fica disponível na origem. Cada Entreposto tem até seis transportadores em serviço, contando os que estão retornando.',
  example:'50 de Ferro → Entreposto A (caixa 50; Branco → Cinza → Preto) → o colosso pega a caixa, caminha e entrega 50 no Entreposto B com a mesma sequência de cores.',
  failure:'Com material insuficiente, não há partida. Se a saída do destino estiver cheia ou contiver outro recurso, o colosso espera com a caixa nas mãos. Desobstrua a saída com esteiras e um coletor.',
}
