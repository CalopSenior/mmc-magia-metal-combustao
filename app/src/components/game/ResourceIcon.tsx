import { useEffect, useRef } from 'react'
import { drawResource } from '@/game/content/resourceSprites'
import { drawMatrix } from '@/game/content/pixelMatrices'
import type { ResourceId } from '@/game/types'

export function ResourceIcon({resource,className=''}:{resource:ResourceId;className?:string}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(ctx){ctx.clearRect(0,0,32,32);drawResource(ctx,resource,0,0,32)}},[resource])
  return <canvas ref={canvas} width={32} height={32} aria-hidden="true" className={`resource-icon ${className}`} />
}
export function ReserveIcon() {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(ctx)drawMatrix(ctx,[[0,1,1,1,1,1,1,0],[1,3,3,4,4,3,3,1],[1,2,2,4,4,2,2,1],[1,1,1,1,1,1,1,1],[1,3,3,4,4,3,3,1],[1,2,2,4,4,2,2,1],[1,2,2,3,3,2,2,1],[1,1,1,1,1,1,1,1]],['','#18140f','#694c2c','#aa7c43','#e4bf72'],0,0,4)},[])
  return <canvas ref={canvas} width={32} height={32} className="resource-icon" aria-hidden="true" />
}
