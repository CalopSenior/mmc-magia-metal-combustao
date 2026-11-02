import { CARRIER_HEIGHT, CARRIER_PALETTE, CARRIER_PIXEL, CARRIER_WIDTH, carrierFacing, carrierMatrix, type CarrierFacing, type CarrierPose } from '../content/carrierSprites'
import { drawMatrix } from '../content/pixelMatrices'
import { drawResource } from '../content/resourceSprites'
import { getResource } from '../content/resources'
import { CELL_SIZE } from '../math/grid'
import type { Shipment, Structure } from '../types'
import type { Camera } from './camera'
import { structureCenter } from './structureGeometry'
import { carrierHomeward, carrierReturnAt, carrierTravel } from './carrierMotion'

export { carrierTravel } from './carrierMotion'
interface Tracked {
  shipment:Shipment;from:{x:number;y:number};to:{x:number;y:number};facing:CarrierFacing
}
const keyOf=(s:Shipment)=>`${s.from}:${s.to}:${s.resource}:${s.departedAt}`
const SHADOW=[[0,0,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1,0]]

/** Draws the persisted round trip. Rendering never transfers cargo or guesses
 * acceptance from disappearance: blocked deliveries retain their boxes. */
export class CarrierRenderer {
  private tracked=new Map<string,Tracked>()
  clear():void {this.tracked.clear()}
  get finishingCount():number {return [...this.tracked.values()].filter(item=>item.shipment.deliveredAt!==undefined).length}
  update(shipments:readonly Shipment[],tick:number,byId:(id:number)=>Structure|null|undefined):void {
    const current=new Map<string,Tracked>()
    for(const shipment of shipments) {
      const from=byId(shipment.from),to=byId(shipment.to)
      const returnedAt=carrierReturnAt(shipment)
      if(!from||!to||shipment.amount<=0||returnedAt!==null&&tick>=returnedAt)continue
      const a=structureCenter(from),b=structureCenter(to)
      current.set(keyOf(shipment),{shipment:{...shipment},from:a,to:b,facing:carrierFacing(b.x-a.x,b.y-a.y)})
    }
    this.tracked=current
  }
  draw(ctx:CanvasRenderingContext2D,camera:Camera,tick:number,radar:boolean,reducedMotion:boolean,font:string):void {
    const actors=[...this.tracked.values()].map(item=>{
      const phase=item.shipment.deliveredAt===undefined?carrierTravel(item.shipment,tick):carrierHomeward(item.shipment,tick)
      const facing=phase.pose==='return'?carrierFacing(item.from.x-item.to.x,item.from.y-item.to.y):item.facing
      return {...item,facing,pose:phase.pose as CarrierPose,progress:phase.progress,x:item.from.x+(item.to.x-item.from.x)*phase.travel,y:item.from.y+(item.to.y-item.from.y)*phase.travel}
    })
    actors.sort((a,b)=>a.y-b.y||a.x-b.x)
    const pixel=CARRIER_PIXEL*camera.currentZoom,width=CARRIER_WIDTH*pixel,height=CARRIER_HEIGHT*pixel
    for(const actor of actors) {
      const p=camera.worldToScreen(actor.x,actor.y)
      if(p.x< -width||p.y< -height||p.x>camera.viewportWidth+width||p.y>camera.viewportHeight+height)continue
      if(radar) {
        // No creature matrices at radar LOD: a single cargo node, cheap and flat.
        const x=Math.round(p.x-2),y=Math.round(p.y-2)
        ctx.fillStyle=actor.pose==='return'?'#a5b797':getResource(actor.shipment.resource).color
        if(actor.pose==='return') {ctx.fillRect(x,y,4,1);ctx.fillRect(x,y+3,4,1);ctx.fillRect(x,y+1,1,2);ctx.fillRect(x+3,y+1,1,2)}
        else ctx.fillRect(x,y,4,4)
        continue
      }
      const left=p.x-width/2,top=p.y-height*.72
      drawMatrix(ctx,SHADOW,['','#0b120b70'],p.x-pixel*17,p.y+height*.20,pixel*3.4)
      drawMatrix(ctx,carrierMatrix({pose:actor.pose,progress:actor.progress,step:Math.floor((tick+actor.shipment.from*3)/3),facing:actor.facing,amount:actor.shipment.amount,reducedMotion}),CARRIER_PALETTE,left,top,pixel)
      // Cargo seal and amount describe the actual shipment, including alloys.
      if((actor.pose==='walk'||actor.pose==='carry')&&camera.currentZoom>=.55) {
        drawResource(ctx,actor.shipment.resource,left+16*pixel,top+25*pixel,8*pixel)
        ctx.font=font;ctx.textAlign='center';ctx.textBaseline='top'
        const label=String(actor.shipment.amount),labelY=p.y+height*.30+2
        ctx.fillStyle='#111a13e8';const w=ctx.measureText(label).width+10
        ctx.fillRect(Math.round(p.x-w/2),Math.round(labelY-1),Math.round(w),17)
        ctx.fillStyle='#ffe5ae';ctx.fillText(label,p.x,labelY)
      }
      if((actor.pose==='walk'||actor.pose==='return')&&!reducedMotion&&tick%12<4) {
        const dustX=p.x+(tick%24<12?-11:11)*pixel
        drawMatrix(ctx,[[0,1,0],[1,1,1]],['','#b9ac7760'],dustX,p.y+height*.25,pixel)
      }
    }
  }
}

/** Reuse the exact game sprite and poses inside educational Canvas scenes. */
export function drawCarrierPortrait(ctx:CanvasRenderingContext2D,x:number,y:number,height:number,pose:CarrierPose='carry',progress=1,step=0,facing:CarrierFacing='south-east',amount=50,reducedMotion=false):void {
  const pixel=height/CARRIER_HEIGHT
  drawMatrix(ctx,carrierMatrix({pose,progress,step,facing,amount,reducedMotion}),CARRIER_PALETTE,x-CARRIER_WIDTH*pixel/2,y-height/2,pixel)
}

// Keep the intended size relative to the existing cell scale explicit.
export const CARRIER_WORLD_SIZE={width:CARRIER_WIDTH*CARRIER_PIXEL/CELL_SIZE,height:CARRIER_HEIGHT*CARRIER_PIXEL/CELL_SIZE}
