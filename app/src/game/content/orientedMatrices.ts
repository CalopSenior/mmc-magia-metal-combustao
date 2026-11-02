import { CONVEYOR_ICON, LARGE_MATRICES, PIXEL_MATRICES, type PixelMatrix } from './pixelMatrices'
import type { HexDirection, StructureType } from '../types'
import { minerMatrix } from './creatureSprites'

const cache=new Map<string,PixelMatrix>()
const NO_OUTLET=new Set<StructureType>(['energizer','paving','lantern'])
/** Integer quarter turns retain every source pixel; diagonals use authored elbows. */
export function orientMatrix(matrix:PixelMatrix,direction:HexDirection):PixelMatrix {
  const turns=[0,0,3,2,2,1][direction],n=matrix.length
  return Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>turns===0?matrix[y][x]:turns===1?matrix[n-1-x][y]:turns===2?matrix[n-1-y][n-1-x]:matrix[x][n-1-y]))
}
function box(rows:number[][],x:number,y:number,w:number,h:number,color:number) {
  for(let py=y;py<y+h;py++) for(let px=x;px<x+w;px++) if(rows[py]?.[px]!==undefined) rows[py][px]=color
}
function conduit(rows:number[][],points:readonly (readonly [number,number])[]) {
  for(let i=1;i<points.length;i++) {
    const [ax,ay]=points[i-1],[bx,by]=points[i]
    for(let step=0;step<=Math.abs(ax-bx)+Math.abs(ay-by);step++) {
      const x=ax+Math.sign(bx-ax)*step,y=ay+Math.sign(by-ay)*step
      box(rows,x-2,y-2,5,5,1);box(rows,x-1,y-1,3,3,5);box(rows,x,y,1,1,6)
    }
  }
}
function character(direction:HexDirection):PixelMatrix {
  const base=PIXEL_MATRICES.gnome,west=direction===3||direction===4
  const rows=base.map(row=>west?[...row].reverse():[...row])
  box(rows,5,8,6,3,3)
  const faces=[[10,9],[9,8],[7,8],[4,9],[5,10],[7,10]] as const
  const [x,y]=faces[direction];box(rows,x,y,2,1,7)
  const bags=[[12,11],[11,5],[7,4],[1,11],[2,12],[8,13]] as const
  const [bx,by]=bags[direction];box(rows,bx,by,3,2,5);box(rows,bx+1,by,1,1,6)
  return rows
}
export function structureMatrix(type:StructureType,direction:HexDirection=0,large=true):PixelMatrix {
  if(type==='golem')return minerMatrix(direction)
  const key=`${type}:${large}:${direction}`,known=cache.get(key)
  if(known) return known
  if(type==='gnome') {const result=character(direction);cache.set(key,result);return result}
  const source=type==='conveyor'?CONVEYOR_ICON:(large?LARGE_MATRICES[type]:undefined)??PIXEL_MATRICES[type]
  const rows=orientMatrix(source,direction).map(row=>[...row]),n=rows.length,m=Math.floor(n/2)
  if(NO_OUTLET.has(type)) {
    // Decoration and the energiser have no outlet: no copper elbow on the plan.
  } else if(type==='conveyor'&&(direction===1||direction===4)) {
    for(const row of rows) row.fill(0)
    const points=direction===1?[[1,n-2],[m,n-2],[m,1],[n-2,1]] as const:[[n-2,1],[m,1],[m,n-2],[1,n-2]] as const
    conduit(rows,points)
  } else {
    // Square foundations remain square. Diagonal outlets use copper elbows.
    const paths=[[[n-6,m],[n-1,m]],[[n-6,m],[n-3,m],[n-3,2],[n-2,2]],[[m,5],[m,0]],[[5,m],[0,m]],[[5,m],[2,m],[2,n-3],[1,n-3]],[[m,n-6],[m,n-1]]] as const
    conduit(rows,paths[direction])
  }
  cache.set(key,rows);return rows
}
