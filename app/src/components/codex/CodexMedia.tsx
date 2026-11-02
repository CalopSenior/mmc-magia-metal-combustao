import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { OperationDemo } from './OperationDemo'
import type { CodexEntry } from '@/game/content/codex'
import { drawMatrix, structurePalette } from '@/game/content/pixelMatrices'
import { structureMatrix } from '@/game/content/orientedMatrices'
import { drawResource } from '@/game/content/resourceSprites'
import { TERRAINS } from '@/game/content/terrains'
import type { BiomeId, CodexTarget, HexDirection, ResourceId, StructureType, Terrain } from '@/game/types'
import { createSeedHash } from '@/game/world/generation'
import { colorCSS, sampleTerrainField, terrainColor } from '@/game/world/topography'
import { drawCarrierPortrait } from '@/game/core/carrierRenderer'

type Art = Pick<CodexEntry,'category'|'id'|'accent'>
const SEED=createSeedHash('CODEX-ILLUSTRATION')

/** All illustrations use the same numeric art as the world, never bitmap files. */
function drawArt(ctx:CanvasRenderingContext2D,art:Art,x:number,y:number,size:number,time=0,direction:HexDirection=0):void {
  if(art.category==='creatures'&&art.id==='carrier') {
    drawCarrierPortrait(ctx,x+size/2,y+size/2,size,'carry',1,0,(['east','north-east','north','west','south-west','south'] as const)[direction])
  } else if(art.category==='machines'||art.category==='creatures') {
    const type=art.id as StructureType, matrix=structureMatrix(type,direction)
    drawMatrix(ctx,matrix,structurePalette(type,true,Math.floor(time*8)%4),x,y,size/matrix.length)
  } else if(art.category==='ores'||art.category==='alloys') {
    drawResource(ctx,art.id as ResourceId,x,y,size)
  } else {
    const terrain=art.category==='terrains'?TERRAINS[art.id as Terrain]:null
    const step=size/24
    for(let py=0;py<24;py++) for(let px=0;px<24;px++) {
      const field=sampleTerrainField(SEED,(px+time*2)/3,py/3,art.category==='biomes'?art.id as BiomeId:'copper-vale')
      if(terrain) {
        const level=Math.floor(field.height*10)%3
        ctx.fillStyle=level===0?terrain.fill:level===1?terrain.stroke:terrain.detail
        if(art.id==='magma') ctx.fillStyle=Math.abs(field.fissure-.5)<.04?'#ffb344':level===2?'#853c26':terrain.fill
        if(art.id==='acid') ctx.fillStyle=field.height<.5?terrain.fill:field.height<.6?terrain.stroke:terrain.detail
      } else ctx.fillStyle=colorCSS(terrainColor(field,0.015,0.025,.5))
      ctx.fillRect(x+px*step,y+py*step,step,step)
    }
  }
}

export function CodexSprite({entry}:{entry:CodexEntry}) {
  const ref=useRef<HTMLCanvasElement>(null)
  const {category,id,accent}=entry
  useEffect(()=>{
    const ctx=ref.current?.getContext('2d'); if(!ctx) return
    ctx.clearRect(0,0,48,48);drawArt(ctx,{category,id,accent},0,0,48)
  },[category,id,accent])
  return <canvas ref={ref} width={48} height={48} className="codex-mini" aria-hidden="true" />
}

export function CodexMedia({entry}:{entry:CodexEntry}) {
  const illustration=useRef<HTMLCanvasElement>(null)
  const [direction,setDirection]=useState<HexDirection>(0)
  const {category,id,accent,name}=entry
  const directional=category==='machines'||category==='creatures'
  useEffect(()=>{
    const ctx=illustration.current?.getContext('2d'); if(!ctx) return
    ctx.clearRect(0,0,192,192);drawArt(ctx,{category,id,accent},16,16,160,0,direction)
  },[category,id,accent,direction])
  return <section className="codex-media guided-media" aria-label={`Ilustração e demonstração de ${name}`}>
    <figure><canvas ref={illustration} width={192} height={192} role="img" aria-label={`Ilustração ampliada: ${name}${directional?`, direção ${['leste','nordeste','norte','oeste','sudoeste','sul'][direction]}`:''}`} /><figcaption>Vista ampliada{directional&&<div className="codex-demo-controls"><button type="button" onClick={()=>setDirection(value=>((value+1)%6) as HexDirection)} aria-label="Girar ilustração"><RotateCw aria-hidden="true" /></button></div>}</figcaption></figure>
    <div className="codex-observe"><h3>{category==='creatures'?'Reconheça a criatura':category==='machines'?'Reconheça a orientação':'Reconheça o material'}</h3><p>{category==='creatures'?(id==='carrier'?'O colosso ergue a carga com as mãos, apoia caixas no dorso e caminha com passadas pesadas. Os Entrepostos o convocam automaticamente.':'Criaturas têm rosto, membros e gestos próprios. A postura e as ferramentas indicam o trabalho; golens são pedra animada por runas.'):category==='machines'?'Observe os bocais e a base. Girar muda a conexão da saída; a base ocupa a mesma área.':'O formato e as cores são os mesmos na Reserva, no mapa e nas cargas. Use as referências desta página para seguir as receitas.'}</p>{(category==='biomes'||category==='terrains')&&<p>As faixas claras e escuras indicam relevo. Examine as células antes de construir: magma, ácido, basalto e ruínas são obstáculos nos contratos.</p>}</div>
    <OperationDemo key={`${category}:${id}`} target={{category,id} as CodexTarget}/>
  </section>
}
