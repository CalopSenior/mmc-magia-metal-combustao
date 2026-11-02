import { createRoot } from 'react-dom/client'
import '../src/index.css'
import { PORTRAIT_ART } from '../src/game/content/portraitArt'
import { TEAM,SUPERVISOR,COORDINATOR } from '../src/game/content/credits'
import { PixelArt } from '../src/components/menu/PixelArt'
const people=[...TEAM,SUPERVISOR,COORDINATOR]
export default function PortraitsQA(){return <main style={{maxWidth:1200,padding:24,margin:'auto',minHeight:'100dvh',background:'#19221b',color:'#e5d9b9'}}>
  <h1 className="font-display text-2xl text-[#edcc8a]">Artífices das ilhas do M.M.C.</h1><p className="my-3 text-sm">Dez retratos · equipe, supervisão e coordenação · direção de arte fornecida pelo autor.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>{people.map(person=>{
    const art=PORTRAIT_ART[person.id],matrix=art.rows.map(row=>[...row].map(char=>char==='.'?0:parseInt(char,36)))
    return <figure key={person.id} className="forge-panel" style={{padding:12,textAlign:'center',margin:0}}><span className="credits-frame" style={{display:'inline-block'}} role="img" aria-label={`Retrato de ${person.name} como artífice`}><PixelArt matrix={matrix} palette={art.palette} scale={1}/></span><figcaption className="font-display" style={{marginTop:12,fontSize:14,lineHeight:1.6}}>{person.name}</figcaption></figure>
  })}</div><p className="my-4 text-sm"><a href="/" style={{color:'#edcc8a'}}>Abrir o jogo e os créditos →</a></p>
</main>}
const root=createRoot(document.getElementById('root')!);root.render(<PortraitsQA/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount())
