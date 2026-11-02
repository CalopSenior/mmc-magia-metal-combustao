import { useEffect,useRef,useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { ChannelSelector,ChannelSwatches } from '../src/components/game/ChannelSelector'
import { sameChannel } from '../src/game/content/channels'
import { Simulation } from '../src/game/core/simulation'
import { Renderer } from '../src/game/core/renderer'
import { Camera } from '../src/game/core/camera'
import { ChunkWorld } from '../src/game/world/ChunkWorld'
import { exhibitionRules } from '../src/game/content/exhibition'
import { DEFAULT_SETTINGS } from '../src/game/config'
import type { ChannelSequence,Structure } from '../src/game/types'

const initial:ChannelSequence=['white','gray','black']
export default function ChannelsQA() {
  const [source,setSource]=useState<ChannelSequence>(initial),[target,setTarget]=useState<ChannelSequence>(initial)
  const canvas=useRef<HTMLCanvasElement>(null),simulation=useRef<Simulation|null>(null),status=useRef<HTMLParagraphElement>(null)
  useEffect(()=>{
    const sim=new Simulation(),world=new ChunkWorld('CHANNELS-QA',1),camera=new Camera(),renderer=new Renderer(canvas.current!)
    const piece=(id:number,type:Structure['type'],q:number):Structure=>({id,type,q,r:0,direction:0,inputs:{},output:null,recipe:null,progress:0,createdTick:0,workTicks:0,sourceResource:null,migrationPath:[],migrationProgress:0,migrationThreshold:0,laneOutputs:[],prismOutputCount:2,siloReleaseMultiple:2,channelColors:initial,crateSize:50,hp:100})
    sim.restore(0,null,DEFAULT_SETTINGS,{structures:[{...piece(1,'depot',-5),inputs:{'bloody-iron':100000}},piece(2,'depot',5),piece(3,'conveyor',6),piece(4,'gnome',7)],inventory:{},deposits:{},nextStructureId:5,shipments:[]});sim.configure(exhibitionRules(),world);simulation.current=sim
    const resize=()=>{const box=canvas.current!.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);canvas.current!.width=box.width*dpr;canvas.current!.height=box.height*dpr;camera.resize(box.width,box.height);camera.restore({x:0,y:0,zoom:Math.min(1,box.width/960)})}
    const observer=new ResizeObserver(resize);observer.observe(canvas.current!);resize()
    let frame=0,last=0,acc=0
    const tick=(time:number)=>{acc+=last?Math.min(100,time-last):0;last=time;while(acc>=50){sim.step(world);sim.drainEvents();sim.drainTransferMotions();sim.drainCues();acc-=50}renderer.render(world,camera,sim,null,Math.min(devicePixelRatio,2));if(status.current)status.current.textContent=`${sim.shipments.filter(s=>s.deliveredAt===undefined).length} na ida · ${sim.shipments.filter(s=>s.deliveredAt!==undefined).length} descarregando ou voltando · ${sim.inventory['bloody-iron']??0} Ferro recolhido`;frame=requestAnimationFrame(tick)}
    frame=requestAnimationFrame(tick)
    return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();simulation.current=null}
  },[])
  const connected=sameChannel({channelColors:source},{channelColors:target})
  return <main style={{maxWidth:1150,margin:'auto',padding:20,color:'#dfd6bc',background:'#182219',minHeight:'100dvh'}}>
    <h1 className="font-display text-2xl text-[#efd19c]">Canais de cores</h1><p className="my-2 text-sm">Três posições, doze cores. A mesma sequência conecta os Entrepostos. Bancada isolada, sem acesso a saves.</p>
    <div className="grid gap-4 sm:grid-cols-2"><article><h2>Entreposto de origem</h2><ChannelSelector colors={source} kind="depot" onChange={colors=>{setSource(colors);simulation.current?.setChannel({q:-5,r:0},colors)}}/></article><article><h2>Entreposto de destino</h2><ChannelSelector colors={target} kind="depot" onChange={colors=>{setTarget(colors);simulation.current?.setChannel({q:5,r:0},colors)}}/></article></div>
    <div className="my-4 flex flex-wrap items-center justify-center gap-5 border border-[#7e7850] p-3"><ChannelSwatches colors={source}/><strong role="status">{connected?'Conectados':'Sequências diferentes'}</strong><ChannelSwatches colors={target}/></div>
    <p ref={status} role="status" className="my-2 text-xs"/><canvas ref={canvas} role="img" aria-label="Transporte real entre os canais selecionados" style={{display:'block',width:'100%',height:270}}/>
  </main>
}
const root=createRoot(document.getElementById('root')!);root.render(<ChannelsQA/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount())
