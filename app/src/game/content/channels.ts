import type { ChannelColorId, ChannelSequence, Structure } from '../types'

/** Stable IDs: append colours without renaming existing ones. */
export const CHANNEL_COLORS = [
  {id:'white',name:'Branco',code:'B',hex:'#f2efe2',ink:'#20251f'},
  {id:'gray',name:'Cinza',code:'C',hex:'#939a9e',ink:'#111820'},
  {id:'black',name:'Preto',code:'P',hex:'#161b21',ink:'#f2efe2'},
  {id:'brown',name:'Marrom',code:'Mr',hex:'#815330',ink:'#fff3df'},
  {id:'red',name:'Vermelho',code:'Vm',hex:'#bb3935',ink:'#fff5e4'},
  {id:'orange',name:'Laranja',code:'L',hex:'#eb8a3c',ink:'#23180c'},
  {id:'yellow',name:'Amarelo',code:'Am',hex:'#e8cf52',ink:'#211d0c'},
  {id:'green',name:'Verde',code:'Vd',hex:'#78b467',ink:'#11200e'},
  {id:'cyan',name:'Ciano',code:'Cy',hex:'#45c5c9',ink:'#102224'},
  {id:'blue',name:'Azul',code:'Az',hex:'#365fae',ink:'#fff8e8'},
  {id:'purple',name:'Roxo',code:'R',hex:'#774da6',ink:'#fff7ed'},
  {id:'magenta',name:'Magenta',code:'Mg',hex:'#ce6aba',ink:'#21141e'},
] as const
export const CHANNEL_POSITIONS=[1,2,3] as const
export const DEFAULT_CHANNEL:ChannelSequence=['white','white','white']
export const CHANNEL_COLOR_BY_ID=Object.fromEntries(CHANNEL_COLORS.map(color=>[color.id,color])) as Record<ChannelColorId,typeof CHANNEL_COLORS[number]>
export function isChannelSequence(value:unknown):value is ChannelSequence {
  return Array.isArray(value)&&value.length===CHANNEL_POSITIONS.length&&value.every(id=>typeof id==='string'&&Object.hasOwn(CHANNEL_COLOR_BY_ID,id))
}
/** Original channels 1–9 retain their exact pairings after migration. */
export function legacyChannelColors(channel=1):ChannelSequence {
  const index=Number.isInteger(channel)&&channel>=1&&channel<=9?channel-1:0
  return ['white','white',CHANNEL_COLORS[index].id]
}
type ChannelOwner=Pick<Structure,'channel'|'channelColors'>
export function channelColors(owner:ChannelOwner):ChannelSequence {return owner.channelColors??legacyChannelColors(owner.channel)}
export function channelName(colors:ChannelSequence):string {return colors.map(id=>CHANNEL_COLOR_BY_ID[id].name).join(' → ')}
export function channelCode(colors:ChannelSequence):string {return colors.map(id=>CHANNEL_COLOR_BY_ID[id].code).join(' · ')}
/** Position and repetition are significant; every sequence is a different channel. */
export function sameChannel(a:ChannelOwner,b:ChannelOwner):boolean {
  const left=channelColors(a),right=channelColors(b)
  return left.every((color,index)=>color===right[index])
}
export function assignChannel(structure:Structure,colors:ChannelSequence):void {
  structure.channelColors=[...colors]
  delete structure.channel
}
export function normalizeStructureChannel(structure:Structure):void {
  if(structure.type==='depot'||structure.type==='portal')assignChannel(structure,channelColors(structure))
}
