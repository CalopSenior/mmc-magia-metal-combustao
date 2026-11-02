import { useEffect, useRef, useState } from 'react'
import { BookOpen, Cog, Eye, GraduationCap, Layers, Map, Mountain, Gem, Check,Footprints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CODEX_CATEGORY_LABELS, fusionBreakdown, getCodexEntries, getCodexEntry } from '@/game/content/codex'
import { LESSON_BY_ID } from '@/game/content/lessons'
import { resourceName } from '@/game/content/resources'
import type { CodexCategory, CodexTarget, Profile } from '@/game/types'
import { LessonDemoView } from '../codex/LessonDemo'
import { OracleView } from '../codex/OracleView'
import { CodexMedia, CodexSprite } from '../codex/CodexMedia'
import { codexLinks } from '@/game/content/codexLinks'
import { ResourceIcon } from './ResourceIcon'
import { PixelStructureIcon } from './PixelStructureIcon'
import { PixelCarrierIcon } from './PixelCreatureIcon'
import { normalizeCodexTarget } from '@/game/content/creatures'

interface CodexDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: CodexTarget
  onSelect: (target: CodexTarget) => void
  profile: Profile
  freeMode: boolean
  onLessonRead: (id: string) => void
}

const CATEGORY_ICONS = {
  biomes: Map,
  ores: Gem,
  alloys: Layers,
  terrains: Mountain,
  machines: Cog,
  creatures: Footprints,
  lessons: GraduationCap,
} as const

type View = CodexCategory | 'oracle'

export function CodexDialog({ open, onOpenChange, target:rawTarget, onSelect, profile, freeMode, onLessonRead }: CodexDialogProps) {
  const target=normalizeCodexTarget(rawTarget)
  const selectedPage = useRef<HTMLButtonElement>(null)
  const [oracleKey, setOracleKey] = useState<string | null>(null)
  const [history,setHistory]=useState<CodexTarget[]>([])
  const navigate=(next:CodexTarget)=>{setOracleKey(null);if(next.category===target.category&&next.id===target.id)return;setHistory(old=>[...old.slice(-29),target]);onSelect(next)}
  const entry = getCodexEntry(target)
  const entries = getCodexEntries(target.category)
  const oracle = oracleKey === `${target.category}:${target.id}`
  const view: View = oracle ? 'oracle' : target.category
  const categories = Object.keys(CODEX_CATEGORY_LABELS) as CodexCategory[]
  const tabs: View[] = [...categories, 'oracle']

  useEffect(() => { if (open) selectedPage.current?.scrollIntoView({ block: 'nearest' }) }, [open, target.category, target.id])
  useEffect(() => { if (open && target.category === 'lessons') onLessonRead(target.id) }, [open, target.category, target.id, onLessonRead])

  const selectView = (next: View) => {
    if (next === 'oracle') { setOracleKey(`${target.category}:${target.id}`); return }
    const first = getCodexEntries(next)[0]
    navigate({ category: next, id: first.id } as CodexTarget)
  }

  const lesson = target.category === 'lessons' ? LESSON_BY_ID[target.id] : null
  const breakdown = target.category === 'alloys' ? fusionBreakdown(target.id) : null
  const discovered = target.category === 'alloys' && profile.discovered.includes(target.id)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next){setOracleKey(null);setHistory([])} onOpenChange(next) }}>
      <DialogContent
        className="codex-dialog forge-panel flex h-[88dvh] w-[94vw] max-w-4xl flex-col gap-0 overflow-hidden border-[#806b4a] bg-[#25211c] p-0 text-[#f4ead4] sm:max-w-4xl [&>button[data-slot=dialog-close]]:right-3 [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:flex [&>button[data-slot=dialog-close]]:h-11 [&>button[data-slot=dialog-close]]:w-11 [&>button[data-slot=dialog-close]]:items-center [&>button[data-slot=dialog-close]]:justify-center [&>button[data-slot=dialog-close]]:opacity-90"
      >
        <DialogHeader className="shrink-0 border-b border-[#4a3c29] px-5 py-4 pr-16 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-xl text-[#f4d9a0]">
            <BookOpen className="h-5 w-5 text-[#e9b969]" /> Códice Metalúrgico
          </DialogTitle>
          <DialogDescription className="text-[#c5b69c]">
            Criaturas, maquinário, minérios, ligas e as aulas de matemática por trás da fábrica.
          </DialogDescription>
          {history.length>0&&<button type="button" className="codex-back" onClick={()=>{const previous=history[history.length-1];setHistory(old=>old.slice(0,-1));onSelect(previous)}}>← Voltar para {getCodexEntry(history[history.length-1]).name}</button>}
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-4 gap-1.5 border-b border-[#4a3c29] p-2 sm:grid-cols-4 lg:grid-cols-8" role="tablist" aria-label="Categorias do Códice" onKeyDown={(event) => {
          const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
          if (!keys.includes(event.key)) return
          event.preventDefault()
          const index = tabs.indexOf(view)
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
          selectView(tabs[next])
          document.getElementById(`codex-tab-${tabs[next]}`)?.focus()
        }}>
          {tabs.map((tab) => {
            const Icon = tab === 'oracle' ? Eye : CATEGORY_ICONS[tab]
            const active = view === tab
            return (
              <Button
                key={tab}
                type="button"
                role="tab"
                id={`codex-tab-${tab}`}
                aria-controls="codex-panel"
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                variant="ghost"
                onClick={() => selectView(tab)}
                className={`h-11 px-1.5 text-xs sm:text-sm ${active ? 'bg-[#4a3c29] text-[#e9b969]' : 'text-[#d0c3aa] hover:bg-[#3b3124]'}`}
              >
                <Icon className="hidden h-4 w-4 sm:block" /> {tab === 'oracle' ? 'Oráculo' : CODEX_CATEGORY_LABELS[tab]}
              </Button>
            )
          })}
        </div>

        {view === 'oracle' ? <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel" id="codex-panel" aria-labelledby="codex-tab-oracle">
          <OracleView unlocked={freeMode || profile.tech.includes('mmc-oracle')} />
        </div> : <div className="grid min-h-0 flex-1 grid-rows-[8rem_1fr] md:grid-cols-[16rem_1fr] md:grid-rows-1" role="tabpanel" id="codex-panel" aria-labelledby={`codex-tab-${target.category}`}>
          <nav className="min-h-0 overflow-y-auto border-b border-[#4a3c29] p-2 md:border-b-0 md:border-r" aria-label={`Páginas de ${CODEX_CATEGORY_LABELS[target.category]}`}>
            <div className="grid grid-cols-2 gap-1 md:grid-cols-1">
              {entries.map((item) => {
                const active = item.id === target.id
                const known = item.category === 'alloys' ? profile.discovered.includes(item.id) : item.category === 'lessons' ? profile.lessonsRead.includes(item.id) : false
                return (
                  <button
                    key={item.id}
                    ref={active ? selectedPage : undefined}
                    type="button"
                    onClick={() => navigate({ category: target.category, id: item.id } as CodexTarget)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs transition-colors ${active ? 'bg-[#4a3c29] text-[#f4d9a0]' : 'text-[#d0c3aa] hover:bg-[#223029]'}`}
                  >
                    {item.category==='lessons'?<GraduationCap className="h-5 w-5 shrink-0" style={{color:item.accent}} />:<CodexSprite entry={item} />}
                    <span className="flex-1 leading-tight">{item.name}</span>
                    {known && <Check className="h-3.5 w-3.5 shrink-0 text-[#8fcf8c]" aria-label={item.category === 'alloys' ? 'Proporção descoberta' : 'Lida'} />}
                  </button>
                )
              })}
            </div>
          </nav>

          <article key={`${entry.category}:${entry.id}`} className="min-h-0 overflow-y-auto p-5 sm:p-7" aria-live="polite">
            <div className="h-1 w-16 rounded-full" style={{ backgroundColor: entry.accent }} />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: entry.accent }}>{entry.subtitle}{discovered ? ' · proporção descoberta ✓' : ''}</p>
            <h2 className="mt-1 font-display text-2xl text-[#f4d9a0] sm:text-3xl">{entry.name}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#dfd2b9]">{entry.description}</p>
            {codexLinks(target).map(group=><section className="codex-link-group" key={group.title}>
              <h3>{group.title}</h3><div>{group.links.map(link=><button key={`${link.target.category}:${link.target.id}`} type="button" aria-label={`Abrir ${link.name} no Códice`} onClick={()=>navigate(link.target)}>
                {link.target.category==='creatures'?(link.target.id==='carrier'?<PixelCarrierIcon/>:<PixelStructureIcon type={link.target.id}/>):link.target.category==='machines'?<PixelStructureIcon type={link.target.id}/>:link.target.category==='ores'||link.target.category==='alloys'?<ResourceIcon resource={link.target.id}/>:null}
                <span><strong>{link.name}</strong><small>{link.note}</small></span><span aria-hidden="true">→</span>
              </button>)}</div>
            </section>)}
            {!lesson && <CodexMedia key={`${entry.category}:${entry.id}`} entry={entry} />}
            {entry.mechanics&&<section className="codex-mechanics" aria-label={entry.category==='creatures'?'Como a criatura trabalha':'Como a máquina funciona'}>
              <h3>Para que serve</h3><p>{entry.mechanics.purpose}</p>
              <dl>{([
                ['O que entra',entry.mechanics.input],['O que sai',entry.mechanics.output],
                ['Como montar',entry.mechanics.setup],['Exemplo prático',entry.mechanics.example],['Se der errado',entry.mechanics.failure],
              ] as const).map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
            </section>}

            {lesson && <div className="mt-5 max-w-2xl space-y-4">
              {lesson.sections.map((section) => <section key={section.heading}>
                <h3 className="text-sm font-semibold text-[#e9b969]">{section.heading}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#dce6df]">{section.body}</p>
              </section>)}
              <section className="border border-[#4a3c29] bg-[#1b1815] p-3">
                <h3 className="text-sm font-semibold text-[#e9b969]">Exemplo resolvido — {lesson.example.title}</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-[#dce6df]">{lesson.example.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              </section>
              <p className="border-l-2 border-[#9fe8ff] pl-3 text-sm text-[#9fe8ff]"><strong>No jogo:</strong> {lesson.inGame}</p>
              <LessonDemoView demo={lesson.demo} />
            </div>}

            {breakdown && <div className="mt-5 max-w-2xl border border-[#4a3c29] bg-[#1b1815] p-3" data-testid="fusion-breakdown">
              <h3 className="text-sm font-semibold text-[#e9b969]">Cálculo de sincronia</h3>
              <p className="mt-1 text-sm text-[#9fe8ff]">{breakdown.sentence}</p>
              <ul className="mt-2 space-y-1 text-sm text-[#dce6df]">
                {breakdown.lines.map((line) => <li key={line.resource}>{line.name}: lote {line.lot} ({line.factors}) → {line.amount} unidades = {line.lots} {line.lots === 1 ? 'lote' : 'lotes'}</li>)}
              </ul>
              <p className="mt-2 text-xs text-[#b0a18a]">MDC dos lotes: {breakdown.gcd}. Para os lotes a e b: MMC × MDC = a × b{breakdown.lines.length === 2 && breakdown.lines.every((line) => line.amount === breakdown.lcm) ? ` (${breakdown.lcm} × ${breakdown.gcd} = ${breakdown.lines[0].lot} × ${breakdown.lines[1].lot})` : ''}.</p>
            </div>}

            <dl className="mt-6 space-y-3">
              {entry.details.map((detail) => (
                <div key={detail.label} className="grid gap-1 rounded-lg border border-[#4a3c29] bg-[#1b1815] p-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[#b0a18a]">{detail.label}</dt>
                  <dd className="text-sm leading-relaxed text-[#dce6df]">{detail.value}</dd>
                </div>
              ))}
            </dl>
            {target.category === 'alloys' && profile.discovered.length > 0 && <p className="mt-5 text-xs text-[#b0a18a]">Proporções descobertas: {profile.discovered.map((id) => resourceName(id as never)).join(', ')}.</p>}
            {target.category === 'biomes' && (
              <p className="mt-5 text-xs leading-relaxed text-[#b0a18a]">
                As porcentagens de jazidas sofrem variação local por agrupamento e pelo tipo de terreno. As regiões atravessam os limites dos chunks.
              </p>
            )}
          </article>
        </div>}
      </DialogContent>
    </Dialog>
  )
}
