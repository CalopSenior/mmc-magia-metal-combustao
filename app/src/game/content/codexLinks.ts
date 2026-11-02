import type { CodexTarget, ResourceId } from '../types'
import { RECIPES, RECIPE_LIST, STRUCTURE_LIST, STRUCTURES } from './structures'
import { resourceName } from './resources'
import { structureCodexTarget } from './creatures'

export interface CodexLink { target:CodexTarget;name:string;note:string }
export interface CodexLinkGroup { title:string;links:CodexLink[] }
const resourceTarget=(id:ResourceId):CodexTarget=>({category:id in RECIPES?'alloys':'ores',id} as CodexTarget)
const units=(amount:number)=>`${amount} ${amount===1?'unidade':'unidades'}`
export function codexLinks(target:CodexTarget):CodexLinkGroup[] {
  if(target.category!=='ores'&&target.category!=='alloys') return []
  const resource=target.id,groups:CodexLinkGroup[]=[]
  if(target.category==='alloys') {
    const recipe=RECIPES[target.id]
    const ingredients=Object.entries(recipe.inputs).map(([id,amount])=>({target:resourceTarget(id as ResourceId),name:resourceName(id as ResourceId),note:`${amount} unidades por fusão`}))
    if(recipe.catalyst) ingredients.push({target:{category:'ores',id:'raw-ether-crystal'},name:resourceName('raw-ether-crystal'),note:`${recipe.catalyst} cristais catalisadores`})
    groups.push({title:'Ingredientes desta liga',links:ingredients})
    const type=recipe.tier===2?'chamber':'furnace'
    groups.push({title:'Onde produzir',links:[{target:{category:'machines',id:type},name:STRUCTURES[type].name,note:recipe.tier===0?'Receita da Oficina livre':'Abra para ver entradas, saídas e montagem'}]})
  }
  const recipes=RECIPE_LIST.filter(recipe=>recipe.inputs[resource]!==undefined||resource==='raw-ether-crystal'&&recipe.catalyst>0)
  if(recipes.length) groups.push({title:'Usado para fabricar',links:recipes.map(recipe=>({target:{category:'alloys',id:recipe.id},name:resourceName(recipe.id),note:`${recipe.inputs[resource]??recipe.catalyst} unidades por fusão`}))})
  const machines=STRUCTURE_LIST.filter(machine=>machine.cost[resource]!==undefined)
  if(machines.length) groups.push({title:'Usado na construção básica',links:machines.map(machine=>({target:structureCodexTarget(machine.id),name:machine.name,note:`${units(machine.cost[resource]!)} para construir`}))})
  groups.push({title:'Transportar e organizar',links:(['golem','conveyor','silo','gnome'] as const).filter(type=>type!=='golem'||target.category==='ores').map(type=>({target:structureCodexTarget(type),name:STRUCTURES[type].name,note:type==='golem'?'Extrair este minério':type==='silo'?'Preparar lotes':type==='gnome'?'Recolher para a Reserva':'Levar até a próxima máquina'}))})
  groups.push({title:'Transporte a distância',links:[{target:{category:'creatures',id:'carrier'},name:'Golem Transportador',note:'Conhecer o colosso convocado pelos Entrepostos'}]})
  return groups
}
