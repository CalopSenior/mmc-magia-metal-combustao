import { Accessibility, BookOpen, Calculator, Check, Copy, Focus, Grid2X2, Hand, Hammer, LoaderCircle, Lock, MapPin, Menu, Minus, MousePointer2, Pause, Play, Plus, RotateCw, Save, ScanSearch, Settings2, Sparkles, Stamp, Trash2, WifiOff } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ContractPanel } from './ContractPanel'
import { BIOMES } from '@/game/content/biomes'
import type { InputMode } from '@/game/core/input'
import type { EngineSnapshot, ResourceInventory, SaveStatus, SimulationSpeed } from '@/game/types'
import type { VisualPreferences } from '@/game/visualPreferences'
import { ResourceBar } from './ResourceBar'
import { LessonFeed, type LessonEntry } from './LessonFeed'

export function GameHUD({ snapshot, inventory, saveStatus, online, offlineReady, speedUnlocked, lessons=[], readOnly=false, onPause, onSpeed, onSave, onMathVision, onMenu }: {
  snapshot: EngineSnapshot; inventory: ResourceInventory; saveStatus: SaveStatus; online: boolean; offlineReady: boolean; speedUnlocked: boolean
  lessons?:readonly LessonEntry[]
  readOnly?:boolean
  onPause: () => void; onSpeed: (speed: SimulationSpeed) => void; onSave: () => void; onMathVision: () => void; onMenu: () => void
}) {
  return <header className="game-hud" aria-label="Estado da oficina">
    <div className="hud-top forge-panel">
      <div className="hud-brand">
        <span className="brand-rune" aria-hidden="true">ᛗ</span>
        <div><h1>M.M.C.</h1><p>Magia · Metal · Combustão</p></div>
      </div>
      <div className="hud-location">
        <MapPin aria-hidden="true" /><div><strong>{BIOMES[snapshot.centerCell.biome].name}</strong>
          <span>{snapshot.renderLOD === 'radar' ? 'Radar de fluxos' : 'Dorso Dracônico'} <span aria-hidden="true">/</span> {snapshot.centerCell.q}, {snapshot.centerCell.r}</span></div>
      </div>
      <div className="hud-actions">
        {(!online || offlineReady) && <span className="offline-indicator" title={offlineReady ? 'Disponível offline' : 'Sem conexão'}>
          {offlineReady ? <Check aria-hidden="true" /> : <WifiOff aria-hidden="true" />}<span>{offlineReady ? 'Offline pronto' : 'Sem rede'}</span>
        </span>}
        <button type="button" className="hud-button" onClick={onPause} aria-label={snapshot.paused ? 'Retomar simulação' : 'Pausar simulação'} aria-pressed={snapshot.paused} title="Pausar / retomar (Espaço)">
          {snapshot.paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}<span>{snapshot.paused ? 'Retomar' : 'Pausar'}</span>
        </button>
        <div className="speed-group" role="group" aria-label="Velocidade da fábrica">
          {([1, 2, 4] as const).map((speed) => {
            const locked = speed === 4 && !speedUnlocked
            return <button key={speed} type="button" className="hud-button speed-button" aria-pressed={snapshot.speed === speed} onClick={() => onSpeed(speed)}
              aria-label={locked ? 'Velocidade 4×: requer o Simulador de Pulso' : `Velocidade ${speed}×`} title={locked ? 'Simulador de Pulso (Grimório, Visão Arcana)' : `Velocidade ${speed}×`}>
              {locked ? <Lock aria-hidden="true" /> : null}{speed}×
            </button>
          })}
        </div>
        <button type="button" className="hud-button" onClick={onMathVision} aria-pressed={snapshot.mathVision} aria-label="Visão Matemática" title="Visão Matemática: mostra a conta sobre cada máquina">
          <Calculator aria-hidden="true" /><span>Visão Matemática</span>
        </button>
        <button type="button" className="hud-button" onClick={onSave} disabled={readOnly || !snapshot.ready || saveStatus === 'saving'} aria-label={readOnly?'Exposição protegida: salvamento desativado':'Salvar agora'} title={readOnly?'Esta visita não sobrescreve a exposição':saveStatus === 'error' ? 'Falha no salvamento. Tentar novamente.' : 'Salvar neste navegador'}>
          {saveStatus === 'saving' ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}<span>Salvar</span>
          {saveStatus === 'error' && <strong aria-label="Erro de salvamento">!</strong>}
        </button>
        <button type="button" className="hud-button" onClick={onMenu} aria-label={readOnly?'Voltar ao menu principal':'Menu da fábrica'} title={readOnly?'Encerrar visita e voltar ao menu':'Menu: contratos, Grimório, Códice e sair'}><Menu aria-hidden="true" /><span>Menu</span></button>
      </div>
    </div>
    <div className="hud-supplement"><div className="hud-row">
      {snapshot.progress && <ContractPanel progress={snapshot.progress} />}
      <div className="forge-panel ether-counter" aria-label="Pontos de Éter e Selos de Perfeição">
        <span title="Pontos de Éter"><Sparkles aria-hidden="true" /> <strong>{snapshot.profile.ether.toLocaleString('pt-BR')}</strong> Éter</span>
        <span title="Selos de Perfeição"><Stamp aria-hidden="true" /> <strong>{snapshot.profile.seals}</strong></span>
      </div>
    </div>
    <ResourceBar inventory={inventory} />
    </div>
    <LessonFeed entries={lessons} />
  </header>
}

const MODE_HELP: Record<InputMode, string> = {
  pan: 'Arraste para explorar; toque nas estruturas para selecioná-las.',
  inspect: 'Toque em uma célula para examinar. Ctrl + clique abre o Códice.',
  build: 'R gira; Shift + R volta. Arraste para conectar esteiras. Esc sai.',
  demolish: 'Toque numa estrutura para recolhê-la e recuperar os materiais.',
  rotate: 'Toque numa estrutura para girar seu corpo e suas conexões.',
  copy: 'Toque numa estrutura para construir outra do mesmo tipo e orientação.',
}

const TOUCH_ACTIONS: {mode:InputMode; label:string; Icon:typeof Hand}[] = [
  {mode:'pan',label:'Mover',Icon:Hand}, {mode:'inspect',label:'Examinar',Icon:ScanSearch},
  {mode:'build',label:'Construir',Icon:Hammer}, {mode:'rotate',label:'Girar',Icon:RotateCw},
  {mode:'copy',label:'Copiar',Icon:Copy}, {mode:'demolish',label:'Recolher',Icon:Trash2},
]

export function GameToolbar({ mode, onMode, onCenter, onGuide, onSettings,readOnly=false }: {
  mode: InputMode; onMode: (mode: InputMode) => void; onCenter: () => void; onGuide: () => void; onSettings: () => void
  readOnly?:boolean
}) {
  const actions = [
    { label: 'Oficina', name: 'Construir', key: 'B', Icon: Hammer, active: mode === 'build', action: () => onMode(mode === 'build' ? 'pan' : 'build') },
    { label: 'Examinar', name: 'Inspecionar células', key: 'I', Icon: ScanSearch, active: mode === 'inspect', action: () => onMode('inspect') },
    { label: 'Mover', name: 'Mover mapa', key: 'V', Icon: Hand, active: mode === 'pan', action: () => onMode('pan') },
    { label: 'Centro', name: 'Centralizar mapa', key: 'F', Icon: Focus, action: onCenter },
    { label: 'Códice', name: 'Abrir Códice', Icon: BookOpen, action: onGuide },
    { label: 'Ajustes', name: 'Abrir ajustes', Icon: Settings2, action: onSettings },
  ]
  return <footer className="game-footer" data-readonly={readOnly}>
    <p className="mode-help forge-panel" role="status">{MODE_HELP[mode]}</p>
    <nav className="game-toolbar forge-panel" aria-label="Ferramentas do mundo">
      {actions.filter(action=>!readOnly||action.label!=='Oficina').map(({ label, name, key, Icon, active, action }) => <button key={name} type="button" onClick={action}
        aria-label={name} aria-pressed={active} aria-keyshortcuts={key} title={`${name}${key ? ` (${key})` : ''}`}>
        {key && <kbd aria-hidden="true">{key}</kbd>}<Icon aria-hidden="true" /><span>{label}</span>
        {active && <span className="tool-active-mark" aria-hidden="true" />}
      </button>)}
      {!readOnly&&<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="touch-action-trigger" aria-label={`Ação ao toque: ${TOUCH_ACTIONS.find((entry)=>entry.mode===mode)?.label}. Escolher ação`} title="Escolher ação ao toque">
        <MousePointer2 aria-hidden="true" /><span>Ação</span><small>{TOUCH_ACTIONS.find((entry)=>entry.mode===mode)?.label}</small>
      </button></DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="touch-action-menu forge-panel" aria-label="Ação ao toque">
          <DropdownMenuRadioGroup value={mode} onValueChange={(value)=>onMode(value as InputMode)}>
            {TOUCH_ACTIONS.map(({mode:choice,label,Icon})=><DropdownMenuRadioItem key={choice} value={choice}><Icon aria-hidden="true" />{label}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>}
    </nav>
  </footer>
}

const GRID_LABELS = { off: 'oculto', subtle: 'suave', strong: 'forte' }

export function MapControls({ zoom, grid, onZoom, onGrid, onAccessibility }: {
  zoom: number; grid: VisualPreferences['grid']; onZoom: (factor: number) => void; onGrid: () => void; onAccessibility: () => void
}) {
  return <aside className="map-controls forge-panel" aria-label="Visão do mapa">
    <button type="button" onClick={() => onZoom(1.2)} aria-label="Aumentar zoom" title="Aumentar zoom (+)"><Plus aria-hidden="true" /></button>
    <output aria-label="Zoom atual">{Math.round(zoom * 100)}%</output>
    <button type="button" onClick={() => onZoom(1 / 1.2)} aria-label="Diminuir zoom" title="Diminuir zoom (−)"><Minus aria-hidden="true" /></button>
    <span className="control-divider" aria-hidden="true" />
    <button type="button" onClick={onGrid} aria-label={`Contorno da malha: ${GRID_LABELS[grid]}. Alternar`} aria-pressed={grid !== 'off'} aria-keyshortcuts="G" title={`Malha ${GRID_LABELS[grid]} (G)`}><Grid2X2 aria-hidden="true" /></button>
    <button type="button" onClick={onAccessibility} aria-label="Acessibilidade e leitura" title="Fonte, malha e acessibilidade"><Accessibility aria-hidden="true" /></button>
  </aside>
}
