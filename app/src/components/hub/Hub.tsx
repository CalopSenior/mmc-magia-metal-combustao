import { useState } from 'react'
import { BookOpen, Compass, Hammer, Home, Map as MapIcon, NotebookPen, Play, Settings2, Sparkles, Swords } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { GameEngine } from '@/game/boot'
import { CONTRACT_BY_ID } from '@/game/content/contracts'
import { DIFFICULTIES } from '@/game/content/difficulty'
import type { CodexTarget, EngineSnapshot } from '@/game/types'
import { CampaignMap } from './CampaignMap'
import { EndlessPanel } from './EndlessPanel'
import { Grimoire } from './Grimoire'
import { Notebook } from './Notebook'

type HubTab = 'campaign' | 'endless' | 'grimoire' | 'notebook'

const TABS: { id: HubTab; label: string; Icon: typeof MapIcon }[] = [
  { id: 'campaign', label: 'Mapa da Campanha', Icon: MapIcon },
  { id: 'endless', label: 'Contratos Infinitos', Icon: Compass },
  { id: 'grimoire', label: 'Grande Grimório', Icon: Sparkles },
  { id: 'notebook', label: 'Caderno do Aluno', Icon: NotebookPen },
]

export interface HubProps {
  open: boolean
  snapshot: EngineSnapshot
  engine: GameEngine | null
  onClose: () => void
  onOpenCodex: (target?: CodexTarget) => void
  onSettings: () => void
  onHelp?:()=>void
  onExit: () => void
  onError: (message: string) => void
  onNotice: (message: string) => void
}

/** "Quartel": the main menu inside a save, with the five entries of GDD 9.1. */
export function Hub(props: HubProps) {
  const { open, snapshot, engine, onClose, onOpenCodex, onSettings, onExit, onError, onNotice } = props
  const [tab, setTab] = useState<HubTab>('campaign')
  const run = snapshot.run
  const level = DIFFICULTIES[snapshot.profile.difficulty]
  const activeContract = run.mode === 'campaign' && run.contractId ? CONTRACT_BY_ID[run.contractId] : null
  const running = run.mode !== 'free' && run.status === 'active'

  const start = (action: () => string | null) => {
    const error = action()
    if (error) onError(error)
    else onClose()
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
    <DialogContent className="forge-panel codex-dialog flex h-[94dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden border-[#806b4a] bg-[#25211c] p-0 text-[#f4ead4] sm:max-w-6xl [&>button[data-slot=dialog-close]]:right-3 [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:flex [&>button[data-slot=dialog-close]]:h-11 [&>button[data-slot=dialog-close]]:w-11 [&>button[data-slot=dialog-close]]:items-center [&>button[data-slot=dialog-close]]:justify-center">
      <DialogHeader className="shrink-0 border-b border-[#4a3c29] px-5 py-3 pr-16 text-left">
        <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl text-[#f4d9a0]">
          <span>As Encostas de Dragon Dorsal</span>
          <span className="pill text-xs" style={{ color: level.color }}>{snapshot.profile.name} · {level.name} ({level.grades})</span>
        </DialogTitle>
        <DialogDescription className="text-[#c5b69c]">Escolha o próximo contrato, gaste Pontos de Éter no Grimório ou revise a matemática no Códice.</DialogDescription>
      </DialogHeader>

      <div className="flex shrink-0 flex-wrap gap-2 border-b border-[#4a3c29] p-2">
        {running && <button type="button" onClick={onClose} className="menu-button primary !min-h-11 !px-3 !text-base"><Play aria-hidden="true" /> Continuar: {activeContract?.name ?? 'contrato infinito'}</button>}
        <button type="button" onClick={() => start(() => { engine?.startFree(); return null })} className="menu-button !min-h-11 !px-3 !text-base"><Hammer aria-hidden="true" /> Oficina livre</button>
        <button type="button" onClick={() => onOpenCodex()} className="menu-button !min-h-11 !px-3 !text-base"><BookOpen aria-hidden="true" /> Códice</button>
        {props.onHelp&&<button type="button" onClick={props.onHelp} className="menu-button !min-h-11 !px-3 !text-base"><BookOpen aria-hidden="true"/>Como jogar</button>}
        <button type="button" onClick={onSettings} className="menu-button !min-h-11 !px-3 !text-base"><Settings2 aria-hidden="true" /> Ajustes</button>
        <button type="button" onClick={onExit} className="menu-button !min-h-11 !px-3 !text-base ml-auto"><Home aria-hidden="true" /> Menu principal</button>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-[#4a3c29] p-2 md:grid-cols-4" role="tablist" aria-label="Seções do quartel">
        {TABS.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" id={`hub-tab-${id}`} aria-selected={tab === id} aria-controls="hub-panel" onClick={() => setTab(id)}
          className="hub-tab flex min-h-11 items-center justify-center gap-2 px-2 text-sm text-[#d0c3aa] hover:bg-[#3b3124]"><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}
      </div>

      <div id="hub-panel" role="tabpanel" aria-labelledby={`hub-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'campaign' && <CampaignMap snapshot={snapshot} onStart={(id) => start(() => engine ? engine.startContract(id) : 'O motor ainda está carregando.')} onOpenCodex={onOpenCodex} />}
        {tab === 'endless' && <EndlessPanel snapshot={snapshot} engine={engine} onStart={(seed, daily) => start(() => engine ? engine.startEndless({ seed, daily }) : 'O motor ainda está carregando.')} onOpenGrimoire={() => setTab('grimoire')} />}
        {tab === 'grimoire' && <Grimoire snapshot={snapshot} onBuy={(id) => { const error = engine?.buyTech(id); if (error) onError(error); else onNotice('Melhoria adquirida!') }} />}
        {tab === 'notebook' && <Notebook snapshot={snapshot} engine={engine} onOpenCodex={onOpenCodex} onError={onError} />}
      </div>
      <p className="sr-only"><Swords aria-hidden="true" /></p>
    </DialogContent>
  </Dialog>
}
