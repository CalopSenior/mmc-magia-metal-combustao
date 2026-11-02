import type { HexDirection } from '../types'
import type { PixelMatrix } from './pixelMatrices'

// Boulder shoulders, a stone face, mossy fissures and an incised chest rune.
// The miner has neither visor, metal casing nor a painted outlet.
const MINER = [
  '0000001111000000',
  '0000013443100000',
  '0011034443311100',
  '0134131331314310',
  '1344431717134431',
  '1344313333134431',
  '0133123443213310',
  '0011234444321100',
  '0133133797331310',
  '1344133773314431',
  '1344313737134431',
  '0133113333113310',
  '0011013223101100',
  '0000133113310000',
  '0001343103441000',
  '0001111001111000',
] as const
const cache=new Map<string,PixelMatrix>()
export function minerMatrix(direction:HexDirection,working=false,frame=0):PixelMatrix {
  frame=working?Math.floor(frame)%4:0
  const key=`${direction}:${working}:${frame}`,known=cache.get(key);if(known)return known
  const rows=MINER.map(row=>[...row].map(Number))
  const dot=(x:number,y:number,color:number)=>{if(rows[y]?.[x]!==undefined)rows[y][x]=color}
  // Face location and pickaxe posture communicate all six outputs while upright.
  if(direction===1||direction===2||direction===4) {
    for(let y=3;y<=5;y++)for(let x=6;x<=9;x++)dot(x,y,y===3?4:3)
    if(direction!==2)dot(direction===1?10:5,4,7)
    else {dot(7,3,9);dot(8,4,9)}
  } else if(direction===0||direction===3) {
    dot(6,4,3);dot(8,4,3);dot(direction===0?9:5,4,7)
    dot(direction===0?10:4,5,4)
  }
  const heads=[[13,7],[12,1],[8,0],[1,7],[2,12],[8,12]] as const
  let [hx,hy]:[number,number]=[...heads[direction]]
  if(working){hy+=frame===0?-1:frame===2?1:0;hx+=frame===1?-1:frame===3?1:0}
  // Wooden handle, rough iron pick head. No robotic articulated tool arm.
  for(let i=0;i<4;i++)dot(hx-i,hy+i,5)
  for(let i=-2;i<=2;i++)dot(hx+i,hy,2)
  dot(hx-1,hy-1,4);dot(hx,hy-1,4);dot(hx+1,hy,4)
  cache.set(key,rows);return rows
}
