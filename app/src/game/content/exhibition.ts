import { DEFAULT_SETTINGS, DEMO_SLOT_ID } from '../config'
import { createProfile, createRun } from '../stats'
import type { AlloyId, Axial, FactoryState, HexCell, HexDirection, OreId, ResourceId, SaveSnapshot, Structure, StructureType } from '../types'
import { generateCell, createSeedHash } from '../world/generation'
import { footprintCells, portCell } from '../core/structureGeometry'
import { HEX_DIRECTIONS, hexKey } from '../math/hex'
import { RECIPES, STRUCTURES, STRUCTURE_LIST, TIER1_RECIPE_LIST, TIER2_RECIPE_LIST, maxHpFor, resourceLot } from './structures'
import { ORES } from './ores'
import { TECH_BY_ID } from './tech'
import { ALLOY_LIST } from './resources'
import { normalizeStructureChannel } from './channels'
import { DIFFICULTIES } from './difficulty'
import type { RulesConfig } from '../core/machineRules'

export const EXHIBITION_NAME='Cidadela Pibid de Matemática'
export const EXHIBITION_SEED='CIDADELA-DA-CONFLUENCIA'
export const EXHIBITION_RADIUS=148
/** Districts of the city, each one named after the mathematics it makes visible. */
export const EXHIBITION_TOUR=[
  {name:'Praça da Origem · plano cartesiano',q:0,r:0,zoom:.9},
  {name:'Avenida das Tabuadas · lotes de 2 a 13',q:0,r:-136,zoom:.5},
  {name:'Bairro do MMC · nove ligas',q:12,r:-84,zoom:.5},
  {name:'Barramento das Proporções · divisão e fração',q:-58,r:-41,zoom:.5},
  {name:'Quarteirão da Fatoração · Nível 2',q:113,r:24,zoom:.5},
  {name:'Reator Recursivo · Mesas de Alquimia',q:40,r:98,zoom:.55},
  {name:'Pomar de Mesas · excedente de minérios',q:131,r:100,zoom:.55},
  {name:'Campos da Conservação · Ponto de Coleta',q:-125,r:-6,zoom:.5},
  {name:'Galeria das Obras-Primas',q:-62,r:100,zoom:.5},
  {name:'Estação dos Primos · portal modular',q:-112,r:46,zoom:.6},
  {name:'Estrada da Progressão · rota monumental',q:70,r:140,zoom:.45},
] as const

export function exhibitionRules():RulesConfig {
  return {difficulty:{...DIFFICULTIES.engineer,monsters:false,canFail:false},mode:'free',bounds:EXHIBITION_RADIUS,freeMode:false,hasTech:()=>true,maxGnomes:100,allowed:new Set(STRUCTURE_LIST.map(s=>s.id))}
}
export interface Exhibition {factory:FactoryState;overrides:ReadonlyMap<string,HexCell>;platforms:ReadonlySet<string>}
let blueprint:Exhibition|undefined

/** The Mesas de Alquimia that close the loop sit beside the four tier-1 furnaces of the Núcleo de Dragão tree. */
interface Boost {readonly ores:ReadonlySet<ResourceId>;readonly furnaces:{x:number;y:number}[]}

/** A deterministic, connected factory. No resource is injected while it runs. */
export function createExhibition():Exhibition {
  if(blueprint) return blueprint
  const structures:Structure[]=[],occupied=new Map<string,Structure>(),overrides=new Map<string,HexCell>()
  const seed=createSeedHash(EXHIBITION_SEED)
  function add(type:StructureType,q:number,r:number,direction:HexDirection=0,extra:Partial<Structure>={}):Structure {
    const structure:Structure={id:structures.length+1,type,q,r,direction,size:STRUCTURES[type].size,hp:maxHpFor(type),inputs:{},output:null,recipe:null,progress:0,createdTick:0,workTicks:0,sourceResource:null,migrationPath:[],migrationProgress:0,migrationThreshold:0,laneOutputs:type==='prism'||type==='bridge'?[null,null]:[],prismOutputCount:2,siloReleaseMultiple:2,tier:3,...extra}
    normalizeStructureChannel(structure)
    for(const cell of footprintCells(structure,structure.size!)) {
      const key=hexKey(cell.q,cell.r)
      if(occupied.has(key)) throw new Error(`Exposição: sobreposição em ${key} (${type}/${occupied.get(key)!.type}).`)
      occupied.set(key,structure)
      // The Altar de Fusão Maior is the one piece that stands on magma instead of the workshop's ash.
      overrides.set(key,{...generateCell(seed,cell.q,cell.r),terrain:type==='grandaltar'?'magma':'ash',deposit:null})
    }
    structures.push(structure);return structure
  }
  function route(points:readonly Axial[]):void {
    const cells:Axial[]=[{...points[0]}]
    for(const target of points.slice(1)) {
      let {q,r}=cells[cells.length-1]
      while(q!==target.q||r!==target.r) {
        const dx=Math.sign(target.q-q),dy=Math.sign(target.r-r)
        if(dx&&dy&&dx===-dy){q+=dx;r+=dy}else if(dx)q+=dx;else r+=dy
        cells.push({q,r})
      }
    }
    for(let i=1;i<cells.length-1;i++) {
      const cell=cells[i],next=cells[i+1],dx=next.q-cell.q,dy=next.r-cell.r
      const direction=HEX_DIRECTIONS.findIndex(d=>d.q===dx&&d.r===dy) as HexDirection
      add('conveyor',cell.q,cell.r,direction)
    }
  }
  function connect(source:Structure,target:Axial,waypoints:Axial[]=[],direction=source.direction) {
    const port=portCell(source,direction),delta=HEX_DIRECTIONS[direction]
    route([port,{q:port.q+delta.q,r:port.r+delta.r},...waypoints,target])
  }
  function miner(ore:OreId,q:number,r:number,batch=resourceLot(ore)??3,direction:HexDirection=0) {
    const golem=add('golem',q,r,direction,{batch:Math.min(9,batch),sourceResource:ore,workTicks:60+ORES[ore].extraction*30})
    const cell=overrides.get(hexKey(q,r))!
    overrides.set(cell.key,{...cell,deposit:{ore,purity:99,richness:3,quantity:100000000}})
    return golem
  }
  // Receivers are inserted first: every remote depot selects its central partner.
  for(let channel=1;channel<=9;channel++) {
    const q=-12+(channel-1)%3*4,r=-10+Math.floor((channel-1)/3)*4
    const depot=add('depot',q,r,0,{channel,crateSize:10})
    const gnome=add('gnome',q+3,r)
    connect(depot,gnome)
  }
  const center=add('gnome',0,0)
  const portal=add('portal',6,0,3,{channel:1})
  connect(portal,center)
  add('gnomepost',2,4,0)
  add('tower',-15,3,0,{power:4});add('tower',14,3,3,{power:6})

  function height(resource:ResourceId):number {
    if(!(resource in RECIPES)) return 3
    const ingredients=Object.keys(RECIPES[resource as AlloyId].inputs) as ResourceId[]
    return height(ingredients[0])+height(ingredients[1])+5
  }

  /**
   * Reator Recursivo, one pair of stations per tier-1 furnace: a Mesa de Alquimia in the corridor beside the furnace returns
   * 18 of one of its ores per Núcleo, a Silo regroups them into whole lots, and they join the belt that already feeds the
   * furnace. The Núcleos arrive from the west along the rows y-2 (upper station) and y+2 (lower station).
   */
  function boostStations(ingredients:readonly ResourceId[],x:number,y:number,boost:Boost) {
    ingredients.forEach((item,index)=>{
      if(!boost.ores.has(item)) return
      const ore=item as OreId,lot=resourceLot(ore)??1,upper=index===0
      const top=upper?y-3:y+2,seedRow=upper?y-3:y+3
      const mesa=add('alchemy',x-14,top,0,{inputs:{'dragon-core':12}})
      connect(miner(ore,x-23,seedRow,lot),{q:x-14,r:seedRow})
      const hopper=add('silo',x-11,top,0,{siloReleaseMultiple:lot})
      connect(mesa,{q:x-11,r:top})
      connect(hopper,{q:x-3,r:top})
    })
    boost.furnaces.push({x,y})
  }

  /**
   * A balanced binary tree of Prismas, each one a T-splitter that sends half of the flow north and half south (50 % + 50 %).
   * Every lane of a level serves the same number of Mesas, so each Mesa receives the same share (1/2, 1/4, 1/8…) and no stage starves.
   * `heights[k]` is how many rows level k separates its two branches; the last level hands its lanes to `leaf`.
   */
  function splitTree(px:number,py:number,heights:readonly number[],leaf:(from:Structure,direction:1|5,row:number)=>void,depth=0):Structure {
    const node=add('prism',px,py,0,{prismOutputCount:2}),h=heights[depth]
    for(const direction of [1,5] as const) {
      const row=py+(direction===1?-h:h),shoulder={q:direction===1?px+1:px,r:row}
      if(depth===heights.length-1) { leaf(node,direction,row);continue }
      splitTree(px+3,row,heights,leaf,depth+1)
      connect(node,{q:px+3,r:row},[shoulder],direction)
    }
    return node
  }

  function produce(resource:ResourceId,x:number,y:number,boost?:Boost):Structure {
    if(!(resource in RECIPES)) {
      const source=miner(resource as OreId,x,y)
      const lot=resourceLot(resource)??1
      if(lot<=9) return source
      const silo=add('silo',x+4,y,0,{siloReleaseMultiple:lot})
      connect(source,silo);return silo
    }
    const recipe=RECIPES[resource as AlloyId],ingredients=Object.keys(recipe.inputs) as ResourceId[]
    const machine=add(recipe.tier===2?'chamber':'furnace',x,y-1,0,{target:recipe.id,inputs:{...recipe.inputs,...(recipe.catalyst?{'raw-ether-crystal':recipe.catalyst*2}:{})},rune:recipe.minRune})
    const upper=y-Math.floor((height(ingredients[1])+5)/2),lower=y+Math.floor((height(ingredients[0])+5)/2)
    for(const [index,cy] of [upper,lower].entries()) {
      const child=produce(ingredients[index],x-28,cy,boost),port=portCell(child,0)
      const entryY=y+(index===0?-1:1)
      connect(child,{q:x,r:entryY},[{q:x-3,r:port.r},{q:x-3,r:entryY}])
    }
    if(recipe.catalyst) {
      const source=miner('raw-ether-crystal',x+1,y-9,3,5)
      connect(source,{q:x+1,r:y-1})
    }
    if(boost&&recipe.tier===1) boostStations(ingredients,x,y,boost)
    return machine
  }
  function dispatch(machine:Structure,channel:number) {
    const port=portCell(machine,0),depot=add('depot',port.q+12,port.r,0,{channel,crateSize:10})
    connect(machine,depot)
  }
  TIER1_RECIPE_LIST.forEach((recipe,index)=>dispatch(produce(recipe.id,[-68,12,92][index%3],[-108,-84,-60][Math.floor(index/3)]),index+1))
  TIER2_RECIPE_LIST.filter(recipe=>recipe.id!=='dragon-core').forEach((recipe,index)=>dispatch(produce(recipe.id,index%2?112:-36,[-12,24,60][Math.floor(index/2)]),index+1))

  // Reator Recursivo: the root of the Núcleo de Dragão tree hands what it forges to a three-way Prisma. One third goes to the
  // eight Mesas inside the tree (they return the ore the tree is short of), one third to eight more Mesas whose surplus goes
  // straight to Gnomos, and one third to the royal Gnomo as pure surplus. The Prisma also unpacks the ×10 pack of the Runa.
  const boost:Boost={ores:new Set<ResourceId>(['rusted-copper','fossil-coal','bloody-iron','whispering-quartz','raw-scales','draconic-obsidian','solar-gold']),furnaces:[]}
  const core=produce('dragon-core',112,100,boost),royal=add('gnome',0,7)
  const split=add('prism',116,100,0,{prismOutputCount:3})
  connect(core,{q:116,r:100})
  const rows=boost.furnaces.map(furnace=>furnace.y).sort((a,b)=>a-b),middle=(rows[0]+rows[1]+rows[2]+rows[3])/4
  const treeRoot=splitTree(18,middle,[(rows[2]+rows[3]-rows[0]-rows[1])/4,(rows[1]-rows[0])/2,2],(from,direction,row)=>{
    const furnace=boost.furnaces.find(item=>item.y===from.r)!
    connect(from,{q:furnace.x-14,r:row},[{q:direction===1?from.q+1:from.q,r:row}],direction)
  })
  connect(split,{q:treeRoot.q,r:treeRoot.r},[{q:117,r:66},{q:10,r:66},{q:10,r:treeRoot.r}],1)
  // Surplus orchard: eight Mesas on their own tree, one ore each. Each returns 18 per Núcleo to its own Gnomo.
  const orchard=['rusted-copper','fossil-coal','bloody-iron','whispering-quartz','raw-scales','draconic-obsidian','solar-gold','abyssal-cobalt'] as const
  let planted=0
  const orchardRoot=splitTree(121,middle,[16,8,4],(from,direction,row)=>{
    const ore=orchard[planted++],lot=resourceLot(ore)??1
    const mesa=add('alchemy',131,row,0,{inputs:{'dragon-core':12}})
    connect(from,{q:131,r:row},[{q:direction===1?from.q+1:from.q,r:row}],direction)
    connect(miner(ore,139,row+1,lot,3),{q:132,r:row+1})
    connect(mesa,{q:137,r:row})
    add('gnome',137,row)
  })
  connect(split,{q:orchardRoot.q,r:orchardRoot.r},[],0)
  connect(split,royal,[{q:116,r:140},{q:0,r:140}],5)

  // A northern avenue mines every raw resource and validates exact batches.
  Object.keys(ORES).forEach((id,index)=>{
    const q=-120+index*24,ore=id as OreId,batch=Math.min(9,resourceLot(ore)??3)
    const source=miner(ore,q,-136,Math.max(2,batch))
    const furnace=add('smelter',q+6,-136,0,{lot:Math.max(2,batch)})
    connect(source,furnace)
    const depot=add('depot',q+20,-136,0,{channel:7+index%3,crateSize:10})
    connect(furnace,depot,[{q:q+9,r:-136},{q:q+9,r:-126},{q:q+17,r:-126},{q:q+17,r:-136}])
  })
  // Prime-lot portal: a genuine distant route ending at the gnome at (0, 0).
  const silver=miner('lunar-silver',-126,46,9),silo=add('silo',-119,46,0,{siloReleaseMultiple:13})
  connect(silver,silo)
  const remote=add('portal',-105,46,0,{channel:1});connect(silo,remote)

  const splitSource=miner('rusted-copper',-18,14,6),prism=add('prism',-10,14)
  connect(splitSource,prism)
  const splitA=add('gnome',-3,13),splitSilo=add('silo',-4,18,0,{siloReleaseMultiple:3}),splitB=add('gnome',-1,18)
  connect(prism,splitA,[],1);connect(prism,splitSilo,[{q:-10,r:18}],5);connect(splitSilo,splitB)
  const merge=add('confluence',10,16),mergeA=miner('rusted-copper',6,10,4),mergeB=miner('rusted-copper',2,23,5),mergeEnd=add('gnome',18,16)
  connect(mergeA,merge,[{q:10,r:10}]);connect(mergeB,merge,[{q:9,r:23},{q:9,r:17}]);connect(merge,mergeEnd)
  const bridge=add('bridge',20,-16,1),crossA=miner('rusted-copper',15,-11,2,1),crossB=miner('fossil-coal',20,-10,3,2)
  connect(crossA,bridge);connect(crossB,bridge)
  connect(bridge,add('gnome',25,-21),[],1);connect(bridge,add('gnome',20,-22),[],2)

  // Barramento das Proporções: three ore lines run side by side. A Silo regroups each line into multiples of three lots and a
  // three-way Prisma splits it exactly (6 ÷ 3 = 2, 9 ÷ 3 = 3, 12 ÷ 3 = 4). Each lane then passes through a Silo of its own, so the
  // furnace at the end always receives whole lots, however slowly the lane drains. Between two lines a furnace takes one lane from each.
  const LINE_COPPER=-48,LINE_COAL=-38,LINE_IRON=-28
  function bus(x0:number) {
    const lines=[{ore:'rusted-copper' as OreId,row:LINE_COPPER},{ore:'fossil-coal' as OreId,row:LINE_COAL},{ore:'bloody-iron' as OreId,row:LINE_IRON}]
    const slots=Array.from({length:4},(_,index)=>x0+18+index*14)
    const prisms=lines.map(()=>[] as Structure[])
    lines.forEach((line,li)=>{
      const lot=resourceLot(line.ore)!
      for(let k=0;k<5;k++) {
        miner(line.ore,x0+2*k,line.row-1,lot,5)
        miner(line.ore,x0+2*k+1,line.row+1,lot,2)
      }
      for(let q=x0;q<=slots[0]-7;q++) add('conveyor',q,line.row,0)
      let previous:Structure|null=null
      slots.forEach((x,si)=>{
        const hopper=add('silo',x-6,line.row,0,{siloReleaseMultiple:3*lot})
        if(previous) connect(previous,{q:x-6,r:line.row},[],0)
        const tap=add('prism',x,line.row,0,{prismOutputCount:3})
        connect(hopper,{q:x,r:line.row})
        prisms[li][si]=tap;previous=tap
      })
      connect(previous!,{q:slots[slots.length-1]+5,r:line.row},[],0)
      add('gnome',slots[slots.length-1]+5,line.row)
    })
    /** A furnace of the bus: output east to its own Gnomo, plus golems beside it for ore the bus does not carry. */
    function furnace(recipeId:AlloyId,x:number,top:number,partner?:OreId) {
      const recipe=RECIPES[recipeId],machine=add('furnace',x-1,top,0,{target:recipe.id,inputs:{...recipe.inputs},rune:recipe.minRune})
      if(partner) for(const row of [top,top+1]) miner(partner,x-2,row,resourceLot(partner)??3,0)
      connect(machine,{q:x+5,r:top+1})
      add('gnome',x+5,top+1)
    }
    /** One lane of a prism, regrouped by a Silo that sits against the prism and delivers north (2) or south (5) to `entry`. */
    function lane(tap:Structure,laneDirection:1|5,x:number,toward:2|5,entry:Axial) {
      const lot=resourceLot(lines.find(line=>line.row===tap.r)!.ore)!
      const hopper=add('silo',x,toward===2?tap.r-2:tap.r+1,toward,{siloReleaseMultiple:3*lot})
      void laneDirection
      connect(hopper,entry,[],toward)
    }
    slots.forEach((x,si)=>{
      const [cu,coal,iron]=[prisms[0][si],prisms[1][si],prisms[2][si]]
      furnace('resonant-brass',x,LINE_COPPER-6,'whispering-quartz')
      lane(cu,1,x,2,{q:x,r:LINE_COPPER-4})
      furnace('runic-bronze',x,LINE_COPPER+4)
      lane(cu,5,x,5,{q:x,r:LINE_COPPER+4});lane(coal,1,x,2,{q:x,r:LINE_COPPER+6})
      furnace('gray-steel',x,LINE_COAL+4)
      lane(coal,5,x,5,{q:x,r:LINE_COAL+4});lane(iron,1,x,2,{q:x,r:LINE_COAL+6})
      add('gnome',x,LINE_IRON+1)
    })
  }
  bus(-92);bus(-22);bus(48)

  // Campos da Conservação: each Ponto de Coleta receives four golems that hop between two lean deposits. An Energizador Aditivo
  // (dose 1 to 5) makes them recover 2× to 6× as fast, so the dose is visible in how long a golem has to wait.
  const keep=new Set<string>()
  function lean(ore:OreId,q:number,r:number) {
    const base=overrides.get(hexKey(q,r))??{...generateCell(seed,q,r),terrain:'ash' as const,deposit:null}
    overrides.set(base.key,{...base,terrain:'ash',deposit:{ore,purity:99,richness:1,quantity:12}})
    keep.add(base.key)
  }
  function field(ax:number,ay:number,ore:OreId,dose:number) {
    connect(add('collector',ax,ay,0),{q:ax+9,r:ay})
    add('gnome',ax+9,ay)
    for(const [gx,gy] of [[-6,-6],[4,-6],[-6,5],[4,5]]) {
      add('golem',ax+gx,ay+gy,0,{batch:3,sourceResource:ore,workTicks:90})
      lean(ore,ax+gx,ay+gy);lean(ore,ax+gx+3,ay+gy)
    }
    add('energizer',ax-4,ay-1,0,{power:dose,inputs:{'resonant-brass':40}})
  }
  const fieldOres:OreId[][]=[['rusted-copper','fossil-coal'],['bloody-iron','whispering-quartz'],['raw-scales','draconic-obsidian']]
  fieldOres.forEach((pair,row)=>pair.forEach((ore,column)=>field(-136+column*22,-34+row*28,ore,1+row*2+column%2)))

  // Galeria das Obras-Primas (south-west): every new piece working beside the others.
  const AX=-84,AY=108
  // A pool of magma around and under the Altar de Fusão Maior; belts and the gnome turn their own cells back to ash.
  for(let dr=-3;dr<=7;dr++) for(let dq=-3;dq<=7;dq++) {const at=hexKey(AX+dq,AY+dr);overrides.set(at,{...generateCell(seed,AX+dq,AY+dr),terrain:'magma',deposit:null});keep.add(at)}
  const altar=add('grandaltar',AX,AY,0)
  for(const [ore,row,entry] of [['rusted-copper',98,AY],['fossil-coal',110,AY+2],['bloody-iron',122,AY+4]] as const) {
    const child=produce(ore,AX-28,row),port=portCell(child,0)
    connect(child,{q:AX,r:entry},[{q:AX-3,r:port.r},{q:AX-3,r:entry}])
  }
  connect(altar,add('gnome',AX+9,AY+2))
  // Mesa de Alquimia: a copper miner supplies the seed, the stored Núcleos of Dragão are the fuel.
  const table=add('alchemy',-40,100,0,{inputs:{'dragon-core':12}})
  connect(miner('rusted-copper',-52,100,3),{q:-40,r:100})
  connect(table,add('gnome',-30,100))
  // Ponto de Coleta: a golem hops between two lean copper deposits and empties its sack before each move.
  add('golem',-60,84,0,{batch:3,sourceResource:'rusted-copper',workTicks:90})
  lean('rusted-copper',-60,84);lean('rusted-copper',-57,84)
  connect(add('collector',-58,87,0),{q:-48,r:87})
  add('gnome',-48,87)
  add('energizer',-66,88,0,{power:2,inputs:{'resonant-brass':40}})

  // Decoration: paved plazas, a stone avenue lined with lanterns, runic slabs and brass mosaics. Floors only take free cells.
  function floor(x0:number,y0:number,x1:number,y1:number,pick:number|((q:number,r:number)=>number)) {
    for(let r=y0;r<=y1;r++) for(let q=x0;q<=x1;q++) {
      const tier=typeof pick==='number'?pick:pick(q,r)
      if(tier>0&&!occupied.has(hexKey(q,r))&&!keep.has(hexKey(q,r))) add('paving',q,r,0,{tier:tier as 1|2|3})
    }
  }
  /** Concentric squares around a centre: 3 = mosaic, 2 = runic slab, 1 = stone. */
  const rings=(cx:number,cy:number,widths:number)=>(q:number,r:number)=>[3,1,2,1][Math.floor(Math.max(Math.abs(q-cx),Math.abs(r-cy))/widths)%4]
  /** Three-colour tiling by residue: the tile at (q, r) depends on (q + 2r) mod 3. */
  const residue=(q:number,r:number)=>(((q+2*r)%3)+3)%3+1
  floor(-20,-14,20,28,rings(0,0,3))
  floor(-114,78,-6,79,1);floor(-70,81,-45,93,2);floor(-44,97,-35,104,3)
  for(let q=-112;q<=-8;q+=8) add('lantern',q,77)
  fieldOres.forEach((pair,row)=>pair.forEach((_,column)=>{
    const ax=-136+column*22,ay=-34+row*28
    for(const [dq,dr] of [[-9,-8],[12,-8],[-9,8],[12,8]]) add('lantern',ax+dq,ay+dr)
    floor(ax-8,ay-7,ax+11,ay+7,residue)
  }))
  for(const x0 of [-92,-22,48]) for(let q=x0;q<=x0+66;q+=6) if(!occupied.has(hexKey(q,-55))) add('lantern',q,-55)

  // Industrial ground: whole districts stand on one stone floor instead of the wild biome, like a megabase poured in concrete.
  // Only cells nobody has claimed yet are touched (golem deposits, lean fields and the magma pool keep their own terrain).
  const poured=new Set<string>()
  function ground(x0:number,y0:number,x1:number,y1:number) {
    for(let r=y0;r<=y1;r++) for(let q=x0;q<=x1;q++) {
      const at=hexKey(q,r)
      if(!overrides.has(at)) overrides.set(at,{...generateCell(seed,q,r),terrain:'ash',deposit:null})
      poured.add(at)
    }
  }
  ground(-124,-142,146,-120)
  ground(-100,-118,130,-52)
  for(const x0 of [-92,-22,48]) ground(x0-5,-58,x0+74,-25)
  ground(-100,-24,146,72)
  ground(6,62,146,142)
  ground(-122,74,-2,132)
  ground(-132,40,-98,54)
  ground(-148,-44,-102,36)

  const platforms=new Set<string>()
  for(const key of poured) platforms.add(key)
  for(const key of occupied.keys()) {
    const [q,r]=key.split(',').map(Number)
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      const at=hexKey(q+dx,r+dy);platforms.add(at)
      if(!overrides.has(at)) overrides.set(at,{...generateCell(seed,q+dx,r+dy),terrain:'ash',deposit:null})
    }
  }
  for(const key of keep) platforms.add(key)
  blueprint={factory:{structures,inventory:{},deposits:{},nextStructureId:structures.length+1,delivered:{},monsters:[],shipments:[],nextMonsterId:1},overrides,platforms}
  return blueprint
}

export function exhibitionSnapshot(factory=createExhibition().factory,tick=0):SaveSnapshot {
  const profile=createProfile(EXHIBITION_NAME,'engineer',100000)
  profile.tech=Object.keys(TECH_BY_ID);profile.discovered=ALLOY_LIST.map(alloy=>alloy.id)
  return {schemaVersion:7,id:DEMO_SLOT_ID,savedAt:'2026-11-01T00:00:00.000Z',seed:EXHIBITION_SEED,oreLayout:'veins',tick,selected:null,camera:{x:0,y:0,zoom:.85},settings:{...DEFAULT_SETTINGS,chunkDistance:1},factory,profile,run:createRun()}
}
