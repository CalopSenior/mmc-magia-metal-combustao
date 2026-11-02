import { useEffect,useRef } from 'react'
import { drawCarrierPortrait } from '@/game/core/carrierRenderer'

export function PixelCarrierIcon() {
  const ref=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{const ctx=ref.current?.getContext('2d');if(ctx){ctx.clearRect(0,0,48,48);drawCarrierPortrait(ctx,24,24,48)}},[])
  return <canvas ref={ref} width={48} height={48} className="pixel-structure-icon" aria-hidden="true"/>
}
