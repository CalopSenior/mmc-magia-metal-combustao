import { useState } from 'react'
import { ArrowLeft,BookOpen,Play } from 'lucide-react'
import type { CodexTarget } from '@/game/types'
import { OperationDemo } from '../codex/OperationDemo'

const chapters=[
  {title:'Começar',intro:'Escolha Campanha para aprender por contratos ou Oficina livre para experimentar com todas as máquinas. O quarto slot é uma exposição pronta, sem edição.',steps:['Na Campanha, leia o objetivo do contrato: material, quantidade e ciclos perfeitos.','Encontre a jazida indicada e coloque um Golem sobre ela.','Comece com Golem → esteira → Gnomo. A coleta avança a entrega. Nos contratos seguintes, acrescente a Fornalha quando ela for liberada.'],target:{category:'machines',id:'golem'} as CodexTarget},
  {title:'Construir',intro:'A direção do bocal define para onde a carga sai. Máquinas grandes ocupam toda a base destacada.',steps:['Abra Oficina, escolha uma peça e toque numa área livre.','Use R para girar, Shift + R para voltar; no toque, abra Ação e escolha Girar.','Com Esteira escolhida, arraste no mapa para criar uma linha conectada. Mover arrasta o mapa e seleciona estruturas no toque curto.'],target:{category:'machines',id:'conveyor'} as CodexTarget},
  {title:'Fechar os lotes',intro:'A Fornalha confere quantidades. O Altar de Fusão fabrica ligas. São funções diferentes.',steps:['Combine a remessa do Golem com o Apetite de Lote da Fornalha.','Se o lote é 3, envie 3, 6, 9… Chegar menos causa fome; sobras cristalizam.','Use o Silo para formar lotes e o Códice para conferir ingredientes e usos das ligas.'],target:{category:'machines',id:'smelter'} as CodexTarget},
  {title:'Explorar',intro:'Aproxime para trabalhar e afaste para ler os fluxos da fábrica. A exposição possui um roteiro de visita aos setores.',steps:['Use roda do mouse, +/− ou pinça para ajustar o zoom. F volta ao centro.','Clique em uma estrutura com Mover ou Examinar para ler seu estado.','Na Reserva e no Códice, reconheça recursos pelo formato. As páginas de minérios e ligas levam às receitas e máquinas que os usam.'],target:{category:'machines',id:'silo'} as CodexTarget},
]
export function HowToPlay({onBack,onPlay,onCodex}:{onBack:()=>void;onPlay?:()=>void;onCodex:(target:CodexTarget)=>void}) {
  const [chapter,setChapter]=useState(0),page=chapters[chapter]
  return <main className="menu-shell how-to-play"><div className="menu-inner">
    <header className="menu-title"><h1>Como jogar</h1><p>Da primeira jazida a uma fábrica sincronizada</p></header>
    <nav aria-label="Capítulos de Como jogar" className="how-chapters">{chapters.map((item,index)=><button key={item.title} type="button" aria-pressed={chapter===index} onClick={()=>setChapter(index)}>{index+1}. {item.title}</button>)}</nav>
    <article className="forge-panel how-article"><h2>{page.title}</h2><p>{page.intro}</p><ol>{page.steps.map(step=><li key={step}>{step}</li>)}</ol><button type="button" className="how-codex" onClick={()=>onCodex(page.target)}><BookOpen/>Abrir a peça no Códice</button><OperationDemo key={chapter} target={page.target}/></article>
    <nav className="how-footer" aria-label="Sair de Como jogar"><button type="button" className="menu-button" onClick={onBack}><ArrowLeft/>Voltar</button>{onPlay&&<button type="button" className="menu-button primary" onClick={onPlay}><Play/>Escolher mundo</button>}</nav>
  </div></main>
}
