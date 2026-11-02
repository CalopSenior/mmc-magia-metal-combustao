import { useState } from 'react'
import { ChevronDown,ChevronUp,Lock,MapPin } from 'lucide-react'
import { EXHIBITION_NAME, EXHIBITION_TOUR } from '@/game/content/exhibition'
export function ExhibitionTour({count,ready,onVisit}:{count:number;ready:boolean;onVisit:(q:number,r:number,zoom:number)=>void}) {
  const [open,setOpen]=useState(false)
  return <aside className="exhibition-tour forge-panel" aria-label="Roteiro da exposição">
    <button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Lock aria-hidden="true"/><span>{EXHIBITION_NAME}</span>{open?<ChevronDown/>:<ChevronUp/>}</button>
    <p>{ready?`${count.toLocaleString('pt-BR')} estruturas · produção real · visita protegida`:'Preparando a cidade-fábrica…'}</p>
    {open&&<nav aria-label="Setores da exposição">{EXHIBITION_TOUR.map(point=><button type="button" key={point.name} disabled={!ready} onClick={()=>onVisit(point.q,point.r,point.zoom)}><MapPin/>{point.name}</button>)}</nav>}
  </aside>
}
