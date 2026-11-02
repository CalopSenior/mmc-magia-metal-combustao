import { useId,useState } from 'react'
import { CHANNEL_COLORS,CHANNEL_COLOR_BY_ID,CHANNEL_POSITIONS,channelName } from '@/game/content/channels'
import type { ChannelSequence } from '@/game/types'

export function ChannelSwatches({colors}:{colors:ChannelSequence}) {
  return <span className="channel-swatches" role="img" aria-label={channelName(colors)}>{colors.map((id,index)=>{
    const color=CHANNEL_COLOR_BY_ID[id]
    return <span key={index} style={{background:color.hex,color:color.ink}} aria-hidden="true">{color.code}</span>
  })}</span>
}

export function ChannelSelector({colors,onChange,kind}:{colors:ChannelSequence;onChange:(colors:ChannelSequence)=>void;kind:'depot'|'portal'}) {
  const [position,setPosition]=useState<0|1|2>(0),id=useId()
  const choose=(index:number)=>{const next=[...colors] as [ChannelSequence[0],ChannelSequence[1],ChannelSequence[2]];next[position]=CHANNEL_COLORS[index].id;onChange(next)}
  return <section className="channel-selector" aria-label="Canal de cores">
    <h3>Canal de cores</h3>
    <div className="channel-positions" role="group" aria-label="Posições do canal">{CHANNEL_POSITIONS.map((number,index)=>{
      const color=CHANNEL_COLOR_BY_ID[colors[index]]
      return <button key={number} type="button" aria-pressed={position===index} aria-controls={`${id}-palette`} aria-label={`Posição ${number}: ${color.name}. Escolher cor`} onClick={()=>setPosition(index as 0|1|2)}>
        <small>{number}</small><span className="channel-position-color" style={{background:color.hex,color:color.ink}} aria-hidden="true">{color.code}</span><span>{color.name}</span>
      </button>
    })}</div>
    <p className="channel-palette-caption">Cor da posição {position+1}</p>
    <div className="channel-palette" id={`${id}-palette`} role="radiogroup" aria-label={`Cor da posição ${position+1}`} onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return
      event.preventDefault()
      const current=CHANNEL_COLORS.findIndex(color=>color.id===colors[position])
      const delta=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-3:3
      const next=event.key==='Home'?0:event.key==='End'?CHANNEL_COLORS.length-1:(current+delta+CHANNEL_COLORS.length)%CHANNEL_COLORS.length
      choose(next);document.getElementById(`${id}-${CHANNEL_COLORS[next].id}`)?.focus()
    }}>{CHANNEL_COLORS.map((color,index)=><button key={color.id} id={`${id}-${color.id}`} type="button" role="radio" aria-checked={colors[position]===color.id} tabIndex={colors[position]===color.id?0:-1} aria-label={color.name} onClick={()=>choose(index)}>
      <span style={{background:color.hex,color:color.ink}} aria-hidden="true">{color.code}</span><span>{color.name}</span>
    </button>)}</div>
    <p className="channel-selector-hint">Use a mesma sequência, na mesma ordem, nos dois {kind==='depot'?'Entrepostos':'Portais'}. As cores podem se repetir.</p>
    {kind==='depot'&&<p className="channel-selector-hint">A mudança vale para as próximas viagens. Remessas já enviadas continuam até o destino.</p>}
  </section>
}
