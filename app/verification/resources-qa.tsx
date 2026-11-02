import { useEffect,useRef,useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import './resources-qa.css'
import { ORE_LIST } from '../src/game/content/ores'
import { ALLOY_LIST } from '../src/game/content/resources'
import { ResourceIcon } from '../src/components/game/ResourceIcon'
import { ResourceBar } from '../src/components/game/ResourceBar'
import { CodexDialog } from '../src/components/game/CodexDialog'
import { ChunkWorld } from '../src/game/world/ChunkWorld'
import { Renderer } from '../src/game/core/renderer'
import { Camera } from '../src/game/core/camera'
import { Simulation } from '../src/game/core/simulation'
import { STRUCTURE_LIST } from '../src/game/content/structures'
import { DIFFICULTIES } from '../src/game/content/difficulty'
import { worldToGrid } from '../src/game/math/grid'
import { createProfile } from '../src/game/stats'
import type { CodexTarget } from '../src/game/types'

const resources=[...ORE_LIST,...ALLOY_LIST]
const inventory=Object.fromEntries(resources.map(resource=>[resource.id,48]))
type View='resources'|'world'|'flicker'

function World({contract}:{contract:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null),report=useRef<HTMLOutputElement>(null)
  useEffect(()=>{
    const surface=canvas.current!,world=new ChunkWorld('DRAGON-DORSAL-01',1),renderer=new Renderer(surface),camera=new Camera(),sim=new Simulation()
    const bounds=surface.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2)
    surface.width=Math.round(bounds.width*dpr);surface.height=Math.round(bounds.height*dpr)
    camera.resize(bounds.width,bounds.height);camera.restore({x:0,y:0,zoom:contract ? 0.4 : 0.55})
    sim.configure({difficulty:DIFFICULTIES.artisan,mode:'campaign',freeMode:true,bounds:contract?8:null,maxGnomes:5,hasTech:()=>true,allowed:new Set(STRUCTURE_LIST.map(s=>s.id))},world)
    sim.build(world.getCell(-2,-1),'smelter',0)
    for(const q of [-1,0,1,2,3]) sim.build(world.getCell(q,-1),'conveyor',0)
    sim.build(world.getCell(4,-1),'gnome',0)
    renderer.setInputMode(contract?'build':'pan')
    let hover={q:0,r:0},frames=0,changes=0,baseline='',animation=0,previous=0
    const move=(event:PointerEvent)=>{const rect=surface.getBoundingClientRect();hover=worldToGrid(camera.screenToWorld(event.clientX-rect.left,event.clientY-rect.top))}
    surface.addEventListener('pointermove',move)
    for(let i=0;i<36;i++) renderer.render(world,camera,sim,hover,dpr)
    const context=surface.getContext('2d')!
    const draw=(time:number)=>{
      if(time-previous>50){sim.step(world);previous=time}
      renderer.render(world,camera,sim,hover,dpr);frames++
      if(frames%15===0){
        const value=Array.from(context.getImageData(4,4,1,1).data).join(',')
        if(baseline&&value!==baseline) changes++
        baseline=value
        if(report.current) report.current.textContent=contract?`Zoom 0,40× · construção · ${frames} frames · mudanças no pixel externo amostrado: ${changes} · passe o cursor fora do limite`:'Jazidas naturais agrupadas; áreas livres entre bolsões. Não acessa partidas salvas.'
      }
      animation=requestAnimationFrame(draw)
    }
    animation=requestAnimationFrame(draw)
    return ()=>{cancelAnimationFrame(animation);surface.removeEventListener('pointermove',move);renderer.dispose()}
  },[contract])
  return <section><canvas ref={canvas} aria-label={contract?'Teste contínuo de contrato no zoom 0,40×':'Mapa com distritos de mineração'} style={{display:'block',width:'100%',height:'min(62dvh,560px)'}}/><output ref={report} className="qa-report">Preparando mapa…</output></section>
}

export default function ResourceQA() {
  const [view,setView]=useState<View>('resources'),[mono,setMono]=useState(false),[open,setOpen]=useState(false)
  const [target,setTarget]=useState<CodexTarget>({category:'machines',id:'smelter'})
  return <main className="resource-qa">
    <header><h1>M.M.C. / RECURSOS E JAZIDAS</h1><p>Arte numérica compartilhada entre mapa, carga, Reserva e Códice · cenário isolado</p></header>
    <nav aria-label="Verificações visuais"><button onClick={()=>setView('resources')} aria-pressed={view==='resources'}>Recursos</button><button onClick={()=>setView('world')} aria-pressed={view==='world'}>Jazidas</button><button onClick={()=>setView('flicker')} aria-pressed={view==='flicker'}>Contrato 0,40×</button><button onClick={()=>{setTarget({category:'machines',id:'smelter'});setOpen(true)}}>Como usar a Fornalha</button></nav>
    <ResourceBar inventory={inventory}/>
    {view==='resources'?<div data-mono={mono} className="resource-gallery">
      <label><input type="checkbox" checked={mono} onChange={e=>setMono(e.target.checked)}/> Conferir silhuetas sem cor</label>
      {([['Minérios',ORE_LIST],['Ligas',ALLOY_LIST]] as const).map(([title,list])=><section key={title}><h2>{title}</h2><div className="qa-resource-grid">{list.map(resource=><button key={resource.id} onClick={()=>{setTarget({category:title==='Minérios'?'ores':'alloys',id:resource.id} as CodexTarget);setOpen(true)}}><ResourceIcon resource={resource.id}/><span>{resource.shortName}</span></button>)}</div></section>)}
    </div>:<World key={view} contract={view==='flicker'}/>}
    <CodexDialog open={open} onOpenChange={setOpen} target={target} onSelect={setTarget} profile={createProfile('Verificação','artisan',0)} freeMode onLessonRead={()=>{}}/>
  </main>
}
createRoot(document.getElementById('root')!).render(<ResourceQA/> )
