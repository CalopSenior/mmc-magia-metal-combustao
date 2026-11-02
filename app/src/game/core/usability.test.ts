import { afterEach, describe, expect, it, vi } from 'vitest'
import { orientMatrix, structureMatrix } from '../content/orientedMatrices'
import { STRUCTURE_LIST } from '../content/structures'
import { DIFFICULTIES } from '../content/difficulty'
import { createSeedHash, generateCell } from '../world/generation'
import { planBeltStroke } from './beltStroke'
import { connectionForLane } from './structureGeometry'
import { Simulation } from './simulation'
import { Camera } from './camera'
import { InputController } from './input'

const seed=createSeedHash('GESTOS-MMC')
const world={getCell:(q:number,r:number)=>({...generateCell(seed,q,r),terrain:'ash' as const,deposit:null})}
const path=(...cells:[number,number][])=>planBeltStroke(cells.map(([q,r])=>({x:q*64,y:r*64})))

describe('construção contínua de esteiras',()=>{
  it('preenche saltos rápidos, negativos e curvas com vizinhos conectáveis',()=>{
    const steps=path([-4,-2],[1,-2],[1,2])
    expect(steps).toHaveLength(10)
    const sim=new Simulation()
    expect(sim.drawConveyors(steps,world,1)).toBeNull()
    for(let i=0;i<steps.length-1;i++) {
      const source=sim.structureAt(steps[i])!
      expect(connectionForLane(source,0,(q,r)=>sim.structureAtCoords(q,r))?.target).toBe(sim.structureAt(steps[i+1]))
    }
  })
  it('apaga um retorno sobre a própria linha e fecha um circuito sem inverter seu início',()=>{
    expect(path([0,0],[3,0],[1,0]).map(s=>[s.q,s.r])).toEqual([[0,0],[1,0]])
    const steps=path([0,0],[2,0],[2,2],[0,2],[0,0]),sim=new Simulation()
    expect(sim.drawConveyors(steps,world,1)).toBeNull()
    for(const cell of steps) expect(connectionForLane(sim.structureAt(cell)!,0,(q,r)=>sim.structureAtCoords(q,r))).not.toBeNull()
  })
  it('valida o trecho inteiro sem gastar, construir ou girar nada se faltam materiais',()=>{
    const sim=new Simulation();sim.reset({'rusted-copper':2})
    sim.build(world.getCell(0,0),'conveyor',2)
    const before=sim.getFactoryState()
    expect(sim.drawConveyors(path([0,0],[4,0]),world,1)).not.toBeNull()
    expect(sim.getFactoryState()).toEqual(before)
  })
  it('conecta entre bocais de máquinas grandes sem construir dentro da ocupação',()=>{
    const sim=new Simulation()
    sim.build(world.getCell(-4,-1),'furnace',2)
    sim.build(world.getCell(2,0),'silo',0)
    expect(sim.drawConveyors(path([-3,0],[-1,0],[2,0]),world,1)).toBeNull()
    expect(sim.structureAtCoords(-4,-1)?.direction).toBe(0)
    expect(sim.structureAtCoords(-2,0)?.type).toBe('furnace')
    expect(sim.structureAtCoords(2,0)?.type).toBe('silo')
    for(const q of [-4,-1,0,1]) expect(connectionForLane(sim.structureAtCoords(q,q===-4?-1:0)!,0,(x,y)=>sim.structureAtCoords(x,y))).not.toBeNull()
  })
  it('respeita obstáculos e limites do contrato sem deixar um trecho parcial',()=>{
    const sim=new Simulation()
    sim.configure({difficulty:DIFFICULTIES.engineer,mode:'campaign',bounds:2,freeMode:false,hasTech:()=>true,maxGnomes:4,allowed:new Set(STRUCTURE_LIST.map(s=>s.id))},world)
    const before=sim.getFactoryState()
    expect(sim.drawConveyors(path([0,0],[4,0]),world,1)).not.toBeNull()
    expect(sim.getFactoryState()).toEqual(before)
    const blocked={getCell:(q:number,r:number)=>({...world.getCell(q,r),terrain:q===1?'basalt' as const:'ash' as const})}
    sim.configure({...sim.rulesConfig!,bounds:10},blocked)
    expect(sim.drawConveyors(path([0,0],[2,0]),blocked,1)).not.toBeNull()
    expect(sim.getFactoryState()).toEqual(before)
  })
  it('muda o rumo de esteiras existentes sem cobrar ou substituir o nível escolhido nelas',()=>{
    const sim=new Simulation()
    sim.configure({difficulty:DIFFICULTIES.engineer,mode:'campaign',bounds:20,freeMode:false,hasTech:()=>true,maxGnomes:4,allowed:new Set(STRUCTURE_LIST.map(s=>s.id))},world)
    sim.reset({'rusted-copper':30,'fossil-coal':10,'bloody-iron':20})
    expect(sim.build(world.getCell(0,0),'conveyor',2,{tier:2})).toBeNull()
    const copper=sim.inventory['rusted-copper']!
    expect(sim.drawConveyors(path([0,0],[2,0]),world,1)).toBeNull()
    expect(sim.structureAtCoords(0,0)?.tier).toBe(2)
    expect(sim.structureAtCoords(0,0)?.direction).toBe(0)
    expect(sim.inventory['rusted-copper']).toBe(copper-2)
    expect(sim.inventory['fossil-coal']).toBe(9)
  })
  it('recusa chegada pelo lado errado de um Prisma sem mudar a fábrica',()=>{
    const sim=new Simulation();sim.build(world.getCell(2,0),'prism',0)
    const before=sim.getFactoryState()
    expect(sim.drawConveyors(path([0,-2],[2,-2],[2,0]),world,1)).not.toBeNull()
    expect(sim.getFactoryState()).toEqual(before)
  })
})

describe('orientação física da arte numérica',()=>{
  it('gira exatamente nas direções cardinais e mantém os índices de paleta',()=>{
    const matrix=[[1,2],[3,4]]
    expect(orientMatrix(matrix,2)).toEqual([[2,4],[1,3]])
    expect(orientMatrix(matrix,3)).toEqual([[4,3],[2,1]])
    expect(orientMatrix(matrix,5)).toEqual([[3,1],[4,2]])
  })
  it('mostra corpos distintos nas seis orientações de cada máquina sem mudar o tamanho',()=>{
    // The energiser and the decoration have no outlet, so turning them changes nothing but the (symmetric) drawing.
    const withoutOutlet=new Set(['energizer','paving','lantern'])
    for(const {id,size} of STRUCTURE_LIST) {
      const frames=Array.from({length:6},(_,i)=>structureMatrix(id,i as 0))
      if(!withoutOutlet.has(id)) expect(new Set(frames.map(frame=>JSON.stringify(frame))).size).toBe(6)
      for(const frame of frames) expect(frame.length).toBe(size*16)
    }
  })
})

afterEach(()=>vi.unstubAllGlobals())
describe('gestos de mouse e toque',()=>{
  function setup() {
    const listeners=new Map<string,EventListener>()
    const canvas={addEventListener:(name:string,cb:EventListener)=>listeners.set(name,cb),removeEventListener:vi.fn(),focus:vi.fn(),setPointerCapture:vi.fn(),hasPointerCapture:()=>false,getBoundingClientRect:()=>({left:0,top:0})} as unknown as HTMLCanvasElement
    const camera=new Camera();camera.resize(640,400);camera.restore({x:0,y:0,zoom:1})
    const callbacks={onTap:vi.fn(),onBuild:vi.fn(),onDemolish:vi.fn(),onRotate:vi.fn(),onCopy:vi.fn(),onHover:vi.fn(),onHoverEnd:vi.fn(),onClearSelection:vi.fn(),onTogglePause:vi.fn(),onCameraChange:vi.fn(),onStroke:vi.fn(),canDraw:()=>true}
    const input=new InputController(canvas,camera,callbacks)
    const send=(name:string,x:number,y:number,id=1)=>listeners.get(name)!({clientX:x,clientY:y,pointerId:id,pointerType:'touch',preventDefault:()=>{},ctrlKey:false,metaKey:false} as unknown as Event)
    return {input,camera,callbacks,send}
  }
  it('seleciona com Mover no toque curto, mas só desloca no arrasto',()=>{
    const {callbacks,send,camera}=setup()
    send('pointerdown',320,200);send('pointerup',320,200)
    expect(callbacks.onTap).toHaveBeenCalledTimes(1)
    send('pointerdown',320,200);send('pointermove',350,200);send('pointerup',350,200)
    expect(callbacks.onTap).toHaveBeenCalledTimes(1);expect(camera.viewX).toBe(-30)
  })
  it('desenha em coordenadas do mundo sem mover a câmera e só confirma ao soltar',()=>{
    const {input,callbacks,send,camera}=setup();input.setMode('build')
    send('pointerdown',320,200);send('pointermove',448,200)
    expect(callbacks.onStroke).not.toHaveBeenCalled()
    send('pointerup',448,200)
    expect(callbacks.onStroke).toHaveBeenCalledWith([{x:0,y:0},{x:128,y:0},{x:128,y:0}])
    expect(camera.viewX).toBe(0);expect(callbacks.onBuild).not.toHaveBeenCalled()
  })
  it('não constrói após pinça, cancelamento ou troca de ferramenta',()=>{
    const {input,callbacks,send}=setup();input.setMode('build')
    send('pointerdown',300,200);send('pointermove',400,200)
    send('pointerdown',450,200,2);send('pointerup',450,200,2);send('pointerup',400,200)
    send('pointerdown',300,200);send('pointercancel',300,200);send('pointerup',300,200)
    send('pointerdown',300,200);input.setMode('rotate');send('pointerup',300,200)
    expect(callbacks.onStroke).not.toHaveBeenCalled();expect(callbacks.onBuild).not.toHaveBeenCalled();expect(callbacks.onRotate).not.toHaveBeenCalled()
  })
  it('aplica Girar e Copiar no toque curto',()=>{
    const {input,callbacks,send}=setup();input.setMode('rotate')
    send('pointerdown',10,20);send('pointerup',10,20)
    input.setMode('copy');send('pointerdown',30,40);send('pointerup',30,40)
    expect(callbacks.onRotate).toHaveBeenCalledWith(10,20);expect(callbacks.onCopy).toHaveBeenCalledWith(30,40)
  })
})
