import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { GameHUD, GameToolbar, MapControls } from '../src/components/game/GameHUD'
import { CodexDialog } from '../src/components/game/CodexDialog'
import { BuildPalette } from '../src/components/game/BuildPalette'
import { Renderer } from '../src/game/core/renderer'
import { Camera } from '../src/game/core/camera'
import { Simulation } from '../src/game/core/simulation'
import { ChunkWorld } from '../src/game/world/ChunkWorld'
import { createProfile, createRun } from '../src/game/stats'
import { createSeedHash, generateCell } from '../src/game/world/generation'
import { STARTING_INVENTORY,STRUCTURE_LIST } from '../src/game/content/structures'
import type { CodexTarget, EngineSnapshot,HexDirection,StructureType } from '../src/game/types'
import type { InputMode } from '../src/game/core/input'

// No engine, IndexedDB, autosave or profile mutation: real components over an isolated factory.
const seed='DRAGON-DORSAL-01', cell=generateCell(createSeedHash(seed),0,0)
const initial:EngineSnapshot={ready:true,renderLOD:'matrix',tick:80,paused:true,speed:1,showCoordinates:false,selected:null,selectedCell:null,focusedCell:cell,selectedStructure:null,focusedStructure:null,focusedDepositRemaining:null,structureCount:8,inventory:STARTING_INVENTORY,centerCell:cell,camera:{x:0,y:0,zoom:.75},seed,chunkDistance:1,loadedChunks:9,cellCount:576,fps:60,dpr:1,profile:createProfile('Engenheiro','artisan',0),run:createRun(),progress:{title:'A Fome da Fornalha',goals:[{resource:'rusted-copper',amount:48,done:46},{resource:'perfect-cycles',amount:12,done:12}],stability:100,status:'active'},mathVision:false,monsterCount:0,unlocked:['furnace','conveyor','golem','silo'],slot:'isolated-qa'}

export default function UsabilityQA() {
  const canvas=useRef<HTMLCanvasElement>(null)
  const [mode,setMode]=useState<InputMode>('pan'),[snapshot,setSnapshot]=useState(initial)
  const [guide,setGuide]=useState(false),[target,setTarget]=useState<CodexTarget>({category:'machines',id:'furnace'})
  const [build,setBuild]=useState<StructureType>('golem'),[direction,setDirection]=useState<HexDirection>(0),[tier,setTier]=useState<1|2|3>(1)
  useEffect(()=>{
    const surface=canvas.current!,world=new ChunkWorld(seed,1),simulation=new Simulation(),camera=new Camera(),renderer=new Renderer(surface)
    simulation.build(world.getCell(-1,-1),'furnace',0)
    simulation.build(world.getCell(4,0),'silo',2)
    simulation.build(world.getCell(-5,0),'gnome',0)
    for(const q of [-4,-3,-2,2,3]) simulation.build(world.getCell(q,0),'conveyor',0)
    const resize=()=>{
      const bounds=surface.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2)
      const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr)
      if(surface.width!==width||surface.height!==height) {surface.width=width;surface.height=height}
      camera.resize(bounds.width,bounds.height)
      camera.restore({x:0,y:0,zoom:.75})
      for(let i=0;i<24;i++) renderer.render(world,camera,simulation,null,dpr)
    }
    const observer=new ResizeObserver(resize);observer.observe(surface);resize()
    return ()=>{observer.disconnect();renderer.dispose()}
  },[])
  return <div className="game-shell" data-mode={mode}>
    <canvas ref={canvas} style={{position:'absolute',inset:0,width:'100%',height:'100%'}} aria-label="Fábrica isolada de verificação visual" />
    <GameHUD snapshot={snapshot} inventory={snapshot.inventory} saveStatus="saved" online offlineReady={false} speedUnlocked
      lessons={[{id:1,text:'Ciclo perfeito em Fornalha: 2 ÷ 2 = 1 (exato). Resto zero!'}]}
      onPause={()=>setSnapshot(s=>({...s,paused:!s.paused}))} onSpeed={speed=>setSnapshot(s=>({...s,speed}))} onSave={()=>{}} onMathVision={()=>setSnapshot(s=>({...s,mathVision:!s.mathVision}))} onMenu={()=>setGuide(true)} />
    <MapControls zoom={snapshot.camera.zoom} grid="subtle" onZoom={()=>{}} onGrid={()=>{}} onAccessibility={()=>{}} />
    <GameToolbar mode={mode} onMode={setMode} onCenter={()=>{}} onGuide={()=>setGuide(true)} onSettings={()=>{}} />
    <BuildPalette onOpenCreature={()=>{setTarget({category:'creatures',id:'carrier'});setGuide(true)}} mode={mode} selectedType={build} direction={direction} tier={tier} inventory={snapshot.inventory} unlocked={STRUCTURE_LIST.map(item=>item.id)} maxRune={3} lockReason={()=>''} onSelectType={type=>{setBuild(type);setMode('build')}} onDirection={setDirection} onTier={setTier} onDemolish={()=>setMode('demolish')} onClose={()=>setMode('pan')} onDropStructure={()=>{}} onDropRune={()=>{}} onLockedTap={()=>{}}/>
    <CodexDialog open={guide} onOpenChange={setGuide} target={target} onSelect={setTarget} profile={snapshot.profile} freeMode onLessonRead={()=>{}} />
  </div>
}
createRoot(document.getElementById('root')!).render(<UsabilityQA />)
