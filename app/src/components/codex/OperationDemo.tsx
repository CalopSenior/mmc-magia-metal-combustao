import { useEffect,useMemo,useRef,useState } from 'react'
import { Pause,Play,RotateCcw,ChevronLeft,ChevronRight } from 'lucide-react'
import { demoCases,operationDemo,type OperationDemo as Model } from '@/game/content/operationDemos'
import { drawResource } from '@/game/content/resourceSprites'
import { structureMatrix } from '@/game/content/orientedMatrices'
import { drawMatrix,structurePalette } from '@/game/content/pixelMatrices'
import { getResource } from '@/game/content/resources'
import type { CodexTarget,ResourceStack,StructureType } from '@/game/types'
import { ResourceIcon } from '../game/ResourceIcon'
import { drawCarrierPortrait } from '@/game/core/carrierRenderer'
import { drawChannelTag } from '@/game/core/channelRenderer'

function machine(ctx:CanvasRenderingContext2D,type:StructureType,x:number,y:number,size=78,active=false) {
  const matrix=structureMatrix(type)
  drawMatrix(ctx,matrix,structurePalette(type,active),x-size/2,y-size/2,size/matrix.length)
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,color='#ead1a0') {
  ctx.fillStyle=color;ctx.font='14px "Pixelify Sans", monospace';ctx.textAlign='center';ctx.fillText(value,x,y)
}
function flow(ctx:CanvasRenderingContext2D,points:readonly [number,number][],color='#987c4f') {
  ctx.strokeStyle='#121610';ctx.lineWidth=8;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke()
}
function stack(ctx:CanvasRenderingContext2D,value:ResourceStack,x:number,y:number) {
  drawResource(ctx,value.resource,x-17,y-17,34);text(ctx,`${value.amount}×`,x,y+31)
}
/** Pieces that never hand resources over: their demo explains an effect, not a delivery. */
const NO_RESOURCE_OUTPUT=new Set<string>(['energizer','paving','lantern'])
function draw(ctx:CanvasRenderingContext2D,model:Model,phase:number,progress:number) {
  ctx.fillStyle='#171e19';ctx.fillRect(0,0,380,204)
  if(model.layout==='pair') {
    flow(ctx,[[90,100],[290,100]],model.bad?'#bd765e':'#b9a277')
    machine(ctx,model.machine,78,100,68,phase===2);machine(ctx,model.machine,304,100,68,phase===3)
    drawChannelTag(ctx,['white','gray','black'],55,22,1.8,true);drawChannelTag(ctx,['white','gray','black'],281,22,1.8,true)
    if(phase===0||phase===1||model.bad) stack(ctx,model.inputs[0],78,174)
    if(model.machine==='depot') {
      const returning=phase===3&&progress>.35
      const pose=phase===0?'idle':phase===1?'pickup':phase===2?'walk':returning?'return':'deliver'
      const x=phase<2?108:phase===2?108+progress*160:returning?268-(progress-.35)/.65*160:268
      const reducedMotion=document.documentElement.dataset.reducedMotion==='true'||window.matchMedia('(prefers-reduced-motion: reduce)').matches
      drawCarrierPortrait(ctx,x,103,108,pose,phase===3&&!returning?progress/.35:progress,Math.floor(progress*16),returning?'west':'east',model.inputs[0].amount,reducedMotion)
      if(phase===2)text(ctx,`${model.inputs[0].amount} na caixa`,190,185)
      if(returning)text(ctx,'Voltando vazio à origem',190,185)
    } else if(phase===2&&!model.bad) stack(ctx,model.inputs[0],124+progress*140,94)
    if(phase===3&&model.outputs[0]) stack(ctx,model.outputs[0],304,174)
    if(model.bad&&phase>=2) text(ctx,'RETIDO',190,150,'#efac88')
    return
  }
  if(model.layout==='combat') {
    machine(ctx,'tower',85,104,80,phase>0)
    const hp=model.bad?12:Math.max(0,12-phase*4)
    drawMatrix(ctx,[[0,1,1,1,1,0],[1,2,3,3,2,1],[1,3,1,1,3,1],[1,2,2,2,2,1],[0,1,1,1,1,0]],['','#25182d','#805699','#c79adf'],276,88,7)
    text(ctx,`HP ${hp}`,298,65);text(ctx,model.bad?'Dano 5':'Dano 4',85,167)
    if(phase>0){flow(ctx,[[130,104],[270,104]],model.bad?'#b74c4c':'#e8b45e');text(ctx,model.bad?'Ricochete':'Acerto',200,145,model.bad?'#ef9f88':'#bbdf98')}
    return
  }
  if(model.layout==='repair') {
    machine(ctx,'gnomepost',75,99,65);machine(ctx,'smelter',300,99,78)
    if(phase===1||phase===2) machine(ctx,'gnome',120+progress*120,120,40)
    ctx.fillStyle='#46362b';ctx.fillRect(260,158,80,9);ctx.fillStyle='#9ac779';ctx.fillRect(260,158,phase===3?80:phase===2?55:30,9)
    text(ctx,phase===3?'Reparada':'Durabilidade',300,186);text(ctx,'Serviço + Éter',100,181)
    return
  }
  const n=Math.max(model.inputs.length,1),m=Math.max(model.outputs.length,1)
  model.inputs.forEach((value,i)=>{const y=42+(i+.5)*(120/n);flow(ctx,[[50,y],[145,102]],getResource(value.resource).color);stack(ctx,value,42,y)})
  model.outputs.forEach((value,i)=>{const y=42+(i+.5)*(120/m);flow(ctx,[[232,102],[330,y]],getResource(value.resource).color);if(phase>=2)stack(ctx,value,337,y);else{text(ctx,'?',337,y+5,'#716d5b')}})
  machine(ctx,model.machine,190,101,80,phase===1||phase===2)
  text(ctx,model.machine==='golem'?'Na jazida':'Entrada',45,24)
  text(ctx,model.machine==='gnome'?'Reserva':'Saída',336,24)
  if(phase===1&&model.inputs[0]) drawResource(ctx,model.inputs[0].resource,58+progress*74,83,26)
  if(phase===2&&model.outputs[0]) drawResource(ctx,model.outputs[0].resource,228+progress*66,83,26)
  if(phase>=2&&model.retained.length) {
    const held=model.retained[0];drawResource(ctx,held.resource,176,160,24)
    text(ctx,`${held.amount} retido${held.amount===1?'':'s'}`,190,199,model.bad?'#efa58b':'#b6d592')
  }
  if(phase>=2&&!model.outputs.length&&!NO_RESOURCE_OUTPUT.has(model.machine)) text(ctx,'Saída 0',332,102,'#ed9f8c')
}

export function OperationDemo({target}:{target:CodexTarget}) {
  const [scenario,setScenario]=useState('exact'),[phase,setPhase]=useState(0),[playing,setPlaying]=useState(false)
  const canvas=useRef<HTMLCanvasElement>(null)
  const {category,id}=target
  const model=useMemo(()=>operationDemo({category,id} as CodexTarget,scenario),[category,id,scenario])
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d');if(!ctx||!model)return
    let frame=0,start=0,last=0
    draw(ctx,model,phase,1)
    const tick=(time:number)=>{
      if(!start)start=time
      const elapsed=time-start
      if(time-last>80){draw(ctx,model,phase,Math.min(1,elapsed/1400));last=time}
      if(elapsed>=2200){if(phase===3)setPlaying(false);else setPhase(value=>value+1);return}
      frame=requestAnimationFrame(tick)
    }
    if(playing)frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[model,phase,playing])
  if(!model) return null
  const cases=demoCases(target)
  const resultReady=phase>=(model.layout==='pair'?3:2)
  const choose=(value:number)=>{setPlaying(false);setPhase(value)}
  return <section className="operation-demo" aria-label="Demonstração guiada da operação">
    <h3>Veja a operação, etapa por etapa</h3>
    {cases.length>0&&<div className="operation-cases" aria-label="Exemplos da operação">{cases.map(option=><button key={option.id} type="button" aria-pressed={scenario===option.id} onClick={()=>{setScenario(option.id);choose(0)}}>{option.label}</button>)}</div>}
    <ol className="operation-steps">{model.stages.map((label,index)=><li key={label}><button type="button" aria-current={phase===index?'step':undefined} onClick={()=>choose(index)}><b>{index+1}</b>{label}</button></li>)}</ol>
    <canvas ref={canvas} width={380} height={204} role="img" aria-label={`Etapa ${phase+1}: ${model.captions[phase]}`} />
    <p className="operation-caption" aria-live="polite">{model.captions[phase]}</p>
    {resultReady&&<p className="operation-result" data-bad={model.bad}>{model.result}</p>}
    <dl className="operation-totals"><div><dt>Preparado</dt><dd>{model.inputs.map((value,index)=><span key={index}><ResourceIcon resource={value.resource}/>{value.amount} {getResource(value.resource).shortName}</span>)}</dd></div><div><dt>Resultado</dt><dd>{!resultReady?(model.layout==='pair'&&phase===2?'Em transporte':'Acompanhe as etapas'):model.outputs.length?model.outputs.map((value,index)=><span key={index}><ResourceIcon resource={value.resource}/>{model.layout==='split'?`Pista ${index+1}: `:''}{value.amount} {getResource(value.resource).shortName}</span>):model.layout==='combat'||model.layout==='repair'||NO_RESOURCE_OUTPUT.has(model.machine)?model.result:'Nenhuma unidade na saída'}</dd></div></dl>
    <div className="operation-controls"><button type="button" disabled={phase===0} onClick={()=>choose(phase-1)} aria-label="Etapa anterior"><ChevronLeft/>Anterior</button><button type="button" onClick={()=>{if(phase===3)setPhase(0);setPlaying(value=>!value)}} aria-label={playing?'Pausar demonstração':'Reproduzir demonstração'}>{playing?<Pause/>:<Play/>}{playing?'Pausar':'Reproduzir'}</button><button type="button" disabled={phase===3} onClick={()=>choose(phase+1)} aria-label="Próxima etapa">Próxima<ChevronRight/></button><button type="button" onClick={()=>choose(0)} aria-label="Reiniciar demonstração"><RotateCcw/></button></div>
    <p className="operation-note">Exemplo com as regras do jogo. Os passos podem ser avançados manualmente e não alteram sua fábrica.</p>
  </section>
}
