import type { PixelMatrix } from './pixelMatrices'

export type CarrierPose = 'pickup' | 'walk' | 'carry' | 'deliver' | 'return' | 'idle'
export type CarrierFacing = 'east' | 'south-east' | 'south' | 'south-west' | 'west' | 'north-west' | 'north' | 'north-east'
export const CARRIER_WIDTH = 40
export const CARRIER_HEIGHT = 48
/** Three world units per source pixel: a 120×144 colossus beside a 64×64 miner. */
export const CARRIER_PIXEL = 3
export const CARRIER_PALETTE = ['', '#182019', '#303c31', '#5e7059', '#8e9e7b', '#bcc6a2', '#4f4936', '#976a36', '#d6a350', '#ffdf8d', '#51331f', '#86532e', '#bd874b', '#e0b56e', '#c5813f', '#4c623c', '#7c8c52'] as const
const frames = new Map<string, PixelMatrix>()
const clamp = (n:number) => Math.max(0,Math.min(1,n))

export function carrierFacing(dx:number,dy:number):CarrierFacing {
  return (['east','south-east','south','south-west','west','north-west','north','north-east'] as const)[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8]
}

export interface CarrierFrame { pose:CarrierPose; progress:number; step:number; facing:CarrierFacing; amount:number; reducedMotion?:boolean }
/** Authored stone volumes and poses; never rotate/resample a character bitmap. */
export function carrierMatrix({pose,progress,step,facing,amount,reducedMotion=false}:CarrierFrame):PixelMatrix {
  const stage=pose==='pickup'||pose==='deliver'?Math.round(clamp(progress)*5):5,stride=(pose==='walk'||pose==='return')&&!reducedMotion?((Math.floor(step)%8)+8)%8:0
  const load=amount>=100?3:amount>=50?2:1
  const key=`${pose}:${stage}:${stride}:${facing}:${load}:${reducedMotion}`
  const known=frames.get(key);if(known)return known
  const rows=Array.from({length:CARRIER_HEIGHT},()=>Array<number>(CARRIER_WIDTH).fill(0))
  const rect=(x:number,y:number,w:number,h:number,c:number)=>{
    for(let py=Math.round(y);py<Math.round(y+h);py++) for(let px=Math.round(x);px<Math.round(x+w);px++) if(rows[py]?.[px]!==undefined) rows[py][px]=c
  }
  const stone=(x:number,y:number,w:number,h:number)=>{
    x=Math.round(x);y=Math.round(y)
    for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++) {
      const corner=Math.min(3,Math.floor(w/3),Math.floor(h/3))
      const cut=Math.min(dx,w-1-dx)+Math.min(dy,h-1-dy)<corner
      if(cut)continue
      const edge=dx===0||dy===0||dx===w-1||dy===h-1||Math.min(dx,w-1-dx)+Math.min(dy,h-1-dy)===corner
      rect(x+dx,y+dy,1,1,edge?1:dy===1&&dx>2&&dx<w/2?5:dy<3||dx<2?4:dy>h-3||dx>w-3?2:3)
    }
    rect(x+2,y+Math.floor(h/2),2,1,2);rect(x+3,y+Math.floor(h/2)+1,1,2,2)
    if(w>=10&&h>=9){rect(x+3,y+3,3,2,15);rect(x+4,y+2,2,1,16);rect(x+w-3,y+h-4,1,2,15)}
  }
  const crate=(x:number,y:number,w=12,h=11)=>{
    rect(x,y,w,h,1);rect(x+1,y+1,w-2,h-2,10);rect(x+2,y+2,w-4,h-4,11)
    for(let px=3;px<w-2;px+=3)rect(x+px,y+2,1,h-4,12)
    rect(x+1,y+1,w-2,1,13);rect(x+1,y+h-2,w-2,1,7)
    rect(x+1,y+2,1,h-4,12);rect(x+w-2,y+2,1,h-4,7)
    rect(x+3,y+1,1,h-2,6);rect(x+w-4,y+1,1,h-2,6)
    rect(x+5,y+Math.floor(h/2)-1,1,4,9);rect(x+6,y+Math.floor(h/2),2,1,8)
  }
  const empty=pose==='idle'||pose==='return'
  const walking=(pose==='walk'||pose==='return')&&!reducedMotion
  const lift=pose==='pickup'?stage/5:pose==='deliver'?1-stage/5:empty?0:1
  const crouch=(pose==='pickup'||pose==='deliver')&&!reducedMotion?Math.round((1-lift)*3):0
  const bob=walking&&[0,1,4,5].includes(stride)?1:0
  const oy=crouch+bob
  const back=facing.startsWith('north'),side=facing==='east'||facing==='west'
  const leftStep=walking?[0,1,2,1,0,-1,-2,-1][stride]:0,rightStep=-leftStep
  // A carved carrying frame behind the shoulders, loaded with real wooden crates.
  rect(9,5+oy,22,27,1);rect(10,6+oy,20,24,6);rect(11,7+oy,18,22,7)
  if(!empty&&lift>.35) {
    crate(8,2+oy,12,12);crate(21,4+oy,12,12)
    if(load>=2)crate(12,0+oy,14,11)
    if(load>=3)crate(24,15+oy,12,12)
  }
  // Huge independent legs, staggered soles and broad stone feet.
  stone(10,31+leftStep,8,12);stone(22,31+rightStep,8,12)
  rect(12,35+leftStep,4,2,2);rect(24,35+rightStep,4,2,2)
  stone(7,40+leftStep,12,6);stone(21,40+rightStep,12,6)
  rect(9,44+leftStep,9,1,2);rect(23,44+rightStep,8,1,2)
  stone(12,27+oy,16,9);stone(9,12+oy,22,19)
  // Runic sternum: stone grooves and warm magic, no screen or chassis.
  rect(16,20+oy,1,5,2);rect(17,24+oy,2,1,2);rect(23,25+oy,1,3,2)
  rect(18,21+oy,1,5,8);rect(19,22+oy,3,1,9)
  rect(21,23+oy,1,4,8);rect(19,25+oy,2,1,7)
  stone(0,12+oy,12,12);stone(28,12+oy,12,12)
  rect(3,16+oy,3,3,15);rect(4,16+oy,2,1,16);rect(34,16+oy,2,3,15)
  const handY=empty?32+oy:Math.round(38-lift*12)+oy
  stone(2,21+oy,7,Math.max(8,handY-20-oy));stone(31,21+oy,7,Math.max(8,handY-20-oy))
  stone(4,handY,7,7);stone(29,handY,7,7)
  // The boulder head remains upright. Profiles and the back are drawn explicitly.
  stone(side?16:14,6+oy,side?10:12,11)
  if(back) {
    rect(17,8+oy,5,1,2);rect(17,9+oy,1,4,2);rect(18,11+oy,4,1,4)
    rect(facing==='north-west'?15:22,12+oy,1,1,8)
  } else {
    const eyeX=side?22:facing==='south-west'?15:facing==='south-east'?19:16
    rect(eyeX,10+oy,side?2:3,2,1);rect(eyeX,10+oy,1,1,9)
    if(!side){rect(eyeX+5,10+oy,2,2,1);rect(eyeX+5,10+oy,1,1,9)}
    stone(side?22:18,12+oy,4,3);rect(side?19:17,15+oy,6,1,2)
  }
  if(!empty) {
    const cy=Math.round(33-lift*10)+oy
    if(lift<.25&&pose==='deliver') { if(stage<5)crate(13,cy,15,12) }
    else crate(13,cy,15,12)
    // Forearms reach around the box instead of disappearing behind the load.
    stone(7,cy+5,7,6);stone(27,cy+5,7,6)
    rect(11,cy+6,2,3,4);rect(27,cy+6,2,3,4)
  }
  const result=(facing.includes('west')?rows.map(row=>row.slice().reverse()):rows)
  // Bound the atlas to authored states, independent of quantities or elapsed time.
  frames.set(key,result);return result
}
