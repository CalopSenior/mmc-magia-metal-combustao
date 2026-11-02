// Compile the authored atlas to numeric palette-index matrices. No image is
// decoded at game runtime. Node built-ins only, so the compiler is reproducible.
import { readFileSync,writeFileSync } from 'node:fs'
import { dirname,resolve } from 'node:path'
import { inflateSync } from 'node:zlib'

const ids=['daniela','denise','fernanda','gabriel','luiz','marilia','thiago','vitoria','aline','isabella']
const WIDTH=128,HEIGHT=144,PALETTE_LIMIT=35
const manifestPath=resolve('verification/art/credit-portrait-sources.json')
const manifest=process.argv[2]?null:JSON.parse(readFileSync(manifestPath,'utf8'))
const input=process.argv[2]?resolve(process.argv[2]):resolve(dirname(manifestPath),manifest.atlas)
const output=resolve(process.argv[3]??'src/game/content/portraitData.generated.ts')

function decodePNG(bytes) {
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Expected PNG source.')
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),type=bytes[25]
  if(bytes[24]!==8||![2,6].includes(type)||bytes[28]!==0)throw new Error('Compiler needs an 8-bit RGB/RGBA non-interlaced PNG.')
  const chunks=[]
  for(let offset=8;offset<bytes.length;) {
    const length=bytes.readUInt32BE(offset),name=bytes.toString('ascii',offset+4,offset+8)
    if(name==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length))
    offset+=length+12
  }
  const channels=type===6?4:3,stride=width*channels,raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(width*height*channels)
  if(raw.length!==(stride+1)*height)throw new Error('Unexpected PNG row length.')
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c}
  for(let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)]
    if(filter>4)throw new Error('Unknown PNG filter.')
    for(let x=0;x<stride;x++) {
      const index=y*stride+x,a=x>=channels?pixels[index-channels]:0,b=y?pixels[index-stride]:0,c=y&&x>=channels?pixels[index-stride-channels]:0
      const correction=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0
      pixels[index]=(raw[y*(stride+1)+x+1]+correction)&255
    }
  }
  return {width,height,channels,pixels}
}
function sample(image,rect) {
  const result=[]
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++) {
    const left=rect.x+x*rect.w/WIDTH,right=rect.x+(x+1)*rect.w/WIDTH,top=rect.y+y*rect.h/HEIGHT,bottom=rect.y+(y+1)*rect.h/HEIGHT
    let weight=0,r=0,g=0,b=0,alpha=0
    for(let sy=Math.floor(top);sy<Math.ceil(bottom);sy++)for(let sx=Math.floor(left);sx<Math.ceil(right);sx++) {
      const area=Math.max(0,Math.min(sx+1,right)-Math.max(sx,left))*Math.max(0,Math.min(sy+1,bottom)-Math.max(sy,top))
      const at=(sy*image.width+sx)*image.channels,a=image.channels===4?image.pixels[at+3]/255:1
      weight+=area;alpha+=area*a;r+=image.pixels[at]*area*a;g+=image.pixels[at+1]*area*a;b+=image.pixels[at+2]*area*a
    }
    result.push(alpha/weight<.5?null:[r/alpha,g/alpha,b/alpha].map(Math.round))
  }
  return result
}
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2
function quantize(samples) {
  const histogram=new Map()
  for(const rgb of samples)if(rgb) {
    const key=(rgb[0]>>3)*1024+(rgb[1]>>3)*32+(rgb[2]>>3)
    const bin=histogram.get(key)??{sum:[0,0,0],count:0}
    rgb.forEach((c,i)=>bin.sum[i]+=c);bin.count++;histogram.set(key,bin)
  }
  const points=[...histogram.values()].map(bin=>({rgb:bin.sum.map(c=>c/bin.count),count:bin.count}))
  points.sort((a,b)=>b.count-a.count)
  const centers=[points[0].rgb]
  while(centers.length<Math.min(PALETTE_LIMIT,points.length)) {
    let best=points[0],score=-1
    for(const point of points) {
      const nearest=Math.min(...centers.map(center=>distance(point.rgb,center))),value=nearest*Math.sqrt(point.count)
      if(value>score){best=point;score=value}
    }
    centers.push([...best.rgb])
  }
  const closest=(rgb)=>{let best=0,score=Infinity;centers.forEach((c,i)=>{const d=distance(c,rgb);if(d<score){best=i;score=d}});return best}
  for(let iteration=0;iteration<16;iteration++) {
    const sums=centers.map(()=>[0,0,0,0])
    for(const point of points){const sum=sums[closest(point.rgb)];point.rgb.forEach((c,i)=>sum[i]+=c*point.count);sum[3]+=point.count}
    sums.forEach((sum,i)=>{if(sum[3])centers[i]=sum.slice(0,3).map(c=>c/sum[3])})
  }
  const palette=['',...centers.map(rgb=>'#'+rgb.map(c=>Math.round(c).toString(16).padStart(2,'0')).join(''))]
  const indices=samples.map(rgb=>rgb?closest(rgb)+1:0)
  return {palette,rows:Array.from({length:HEIGHT},(_,y)=>indices.slice(y*WIDTH,(y+1)*WIDTH).map(i=>i?i.toString(36):'.').join(''))}
}
const images=new Map(),data={}
for(const [index,id] of ids.entries()) {
  const source=manifest?.overrides?.[id]
  const file=typeof source==='string'?source:source?.file
  const path=file?resolve(dirname(manifestPath),file):input
  if(!images.has(path))images.set(path,decodePNG(readFileSync(path)))
  const image=images.get(path)
  if(source?.layout==='portrait') {
    // Normalized source crop keeps standalone busts at the atlas's head scale.
    const crop=source.crop??{x:0,y:0,w:1,h:1}
    if([crop.x,crop.y,crop.w,crop.h].some(value=>!Number.isFinite(value))||crop.x<0||crop.y<0||crop.w<=0||crop.h<=0||crop.x+crop.w>1||crop.y+crop.h>1)throw new Error(`Invalid portrait crop: ${id}`)
    data[id]=quantize(sample(image,{x:crop.x*image.width,y:crop.y*image.height,w:crop.w*image.width,h:crop.h*image.height}))
  } else {
    // Two source pixels exclude the faint atlas grid while retaining all hair.
    const column=index%3,row=Math.floor(index/3),w=image.width/3,h=image.height/4
    data[id]=quantize(sample(image,{x:column*w+2,y:row*h+2,w:w-4,h:h-4}))
  }
}
const header=`// Generated by scripts/compile-credit-portraits.mjs; edit the source atlases/manifest, not these indices.\nimport type { PortraitArt } from './portraitArt'\n\n`
writeFileSync(output,header+'export const PORTRAIT_DATA:Readonly<Record<string,PortraitArt>> = '+JSON.stringify(data,null,2)+'\n','utf8')
console.log(`Compiled ${ids.length} portraits: ${WIDTH}×${HEIGHT}, at most ${PALETTE_LIMIT} colours each.\n${output}`)
