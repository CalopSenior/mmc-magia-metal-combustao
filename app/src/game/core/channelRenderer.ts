import { CHANNEL_COLOR_BY_ID } from '../content/channels'
import type { ChannelSequence } from '../types'

/** Three ordered colour seals, rasterized directly; never an image asset. */
export function drawChannelTag(ctx:CanvasRenderingContext2D,colors:ChannelSequence,x:number,y:number,pixel=1,showCodes=false):void {
  const rect=(px:number,py:number,w:number,h:number)=>ctx.fillRect(Math.round(px),Math.round(py),Math.round(w),Math.round(h))
  ctx.fillStyle='#141910';rect(x-pixel,y-pixel,27*pixel,9*pixel)
  const font=ctx.font,align=ctx.textAlign,baseline=ctx.textBaseline
  colors.forEach((id,index)=>{
    const color=CHANNEL_COLOR_BY_ID[id],left=x+index*9*pixel
    ctx.fillStyle='#cebd90';rect(left,y,7*pixel,7*pixel)
    ctx.fillStyle=color.hex;rect(left+pixel,y+pixel,5*pixel,5*pixel)
    if(showCodes) {
      ctx.fillStyle=color.ink;ctx.font=`bold ${Math.max(6,Math.round(pixel*5))}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.fillText(color.code,left+3.5*pixel,y+3.5*pixel)
    }
  })
  ctx.font=font;ctx.textAlign=align;ctx.textBaseline=baseline
}
