import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { GameHUD, GameToolbar, MapControls } from '@/components/game/GameHUD'
import { BuildPalette } from '@/components/game/BuildPalette'
import { CodexDialog } from '@/components/game/CodexDialog'
import { GameCanvas } from '@/components/game/GameCanvas'
import { ExhibitionTour } from '@/components/game/ExhibitionTour'
import { HowToPlay } from '@/components/menu/HowToPlay'
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import { InspectionBalloon } from '@/components/game/InspectionBalloon'
import type { LessonEntry } from '@/components/game/LessonFeed'
import { ReportDialog } from '@/components/game/ReportDialog'
import { SettingsSheet } from '@/components/game/SettingsSheet'
import { Hub } from '@/components/hub/Hub'
import type { SlotId } from '@/game/config'
import { DEFAULT_SEED,DEMO_SLOT_ID } from '@/game/config'
import { STARTING_INVENTORY, STRUCTURES } from '@/game/content/structures'
import { TERRAINS } from '@/game/content/terrains'
import { TECH_BY_ID, maxRuneLevel } from '@/game/content/tech'
import { createProfile, createRun } from '@/game/stats'
import type { GameEngine } from '@/game/boot'
import type { InputMode } from '@/game/core/input'
import { parseSaveText, serializeSave } from '@/game/persistence/save'
import type { CodexTarget, EngineSnapshot, HexDirection, SaveStatus, SimulationSpeed, StructureType } from '@/game/types'
import { createSeedHash, generateCell } from '@/game/world/generation'
import { nextGrid, type VisualPreferences } from '@/game/visualPreferences'
import { audio } from '@/game/audio/engine'
import { useMusicDucked } from '@/game/audio/useAudio'

const INITIAL_CENTER_CELL = generateCell(createSeedHash(DEFAULT_SEED), 0, 0)

const INITIAL_SNAPSHOT: EngineSnapshot = {
  renderLOD: 'matrix',
  ready: false,
  tick: 0,
  paused: false,
  speed: 1,
  showCoordinates: false,
  selected: null,
  selectedCell: null,
  focusedCell: INITIAL_CENTER_CELL,
  selectedStructure: null,
  focusedStructure: null,
  focusedDepositRemaining: INITIAL_CENTER_CELL.deposit ? INITIAL_CENTER_CELL.deposit.quantity * INITIAL_CENTER_CELL.deposit.richness : null,
  structureCount: 0,
  inventory: { ...STARTING_INVENTORY },
  centerCell: INITIAL_CENTER_CELL,
  camera: { x: 0, y: 0, zoom: 0.9 },
  seed: DEFAULT_SEED,
  chunkDistance: 2,
  loadedChunks: 25,
  cellCount: 1600,
  fps: 60,
  dpr: 1,
  profile: createProfile('Engenheiro', 'artisan', 0),
  run: createRun(),
  progress: null,
  mathVision: false,
  monsterCount: 0,
  unlocked: ['golem', 'conveyor', 'gnome'],
  slot: 'slot-1',
}

interface GameScreenProps {
  slot: SlotId
  preferences: VisualPreferences
  onPreferences: (patch: Partial<VisualPreferences>) => void
  onExit: () => void
}

export default function GameScreen({ slot, preferences, onPreferences, onExit }: GameScreenProps) {
  const readOnly=slot===DEMO_SLOT_ID
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(INITIAL_SNAPSHOT)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen,setHelpOpen]=useState(false)
  const [hubOpen, setHubOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideTarget, setGuideTarget] = useState<CodexTarget>({ category: 'lessons', id: 'tabuada' })
  const [inputMode, setInputModeState] = useState<InputMode>('pan')
  const [buildType, setBuildType] = useState<StructureType>('conveyor')
  const [buildDirection, setBuildDirection] = useState<HexDirection>(0)
  const [buildTier, setBuildTier] = useState<1 | 2 | 3>(1)
  const [seed, setSeed] = useState(DEFAULT_SEED)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [offlineReady, setOfflineReady] = useState(false)
  const [lessons, setLessons] = useState<(LessonEntry & { run: string })[]>([])
  const runKeyRef = useRef('')
  const initialisedRef = useRef(false)
  const loadedSeedRef = useRef(DEFAULT_SEED)
  const lessonId = useRef(0)

  const handleEngine = useCallback((value: GameEngine | null) => setEngine(value), [])
  const handleSnapshot = useCallback((value: EngineSnapshot) => {
    runKeyRef.current = `${value.run.mode}:${value.run.contractId}:${value.run.endless?.key}:${value.profile.campaign[value.run.contractId ?? '']?.attempts ?? 0}`
    setSnapshot(value)
    if (value.ready && !initialisedRef.current) {
      initialisedRef.current = true
      // A finished contract greets the player with its report, not with the map.
      if (value.run.mode !== 'free' && value.run.status !== 'active') setHubOpen(false)
    }
    if (loadedSeedRef.current !== value.seed) {
      loadedSeedRef.current = value.seed
      setSeed(value.seed)
    }
  }, [])
  const handleSaveStatus = useCallback((value: SaveStatus) => setSaveStatus(value), [])
  const handleError = useCallback((message: string) => { audio.ui('error'); toast.error(message) }, [])
  const handleNotice = useCallback((message: string) => { audio.ui('notice'); toast.success(message) }, [])
  const handleLesson = useCallback((message: string) => setLessons((current) => current[current.length - 1]?.text === message ? current : [...current.slice(-19), { id: lessonId.current++, text: message, run: runKeyRef.current }]), [])
  const handleOpenGuide = useCallback((target: CodexTarget) => {
    setGuideTarget(target)
    setGuideOpen(true)
  }, [])
  const openCodex = useCallback((target?: CodexTarget) => {
    if (target) setGuideTarget(target)
    setGuideOpen(true)
  }, [])
  const markLessonRead = useCallback((id: string) => engine?.markLessonRead(id), [engine])
  const handleBuildSelection = useCallback((selection: {type:StructureType;direction:HexDirection;tier:1|2|3}) => {
    setBuildType(selection.type); setBuildDirection(selection.direction); setBuildTier(selection.tier); setInputModeState('build')
    toast.info('Peça copiada: tipo, direção e nível. Estoques e melhorias não são duplicados.')
  }, [])

  useEffect(() => { engine?.setPrefs(preferences) }, [engine, preferences])

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    let active = true
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(() => {
        if (active) setOfflineReady(true)
      }).catch(() => {
        if (active) setOfflineReady(false)
      })
    }
    return () => {
      active = false
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
    }
  }, [])

  useEffect(() => { engine?.setBuildSelection(buildType, buildDirection, buildTier) }, [buildDirection, buildType, buildTier, engine])
  useEffect(() => { engine?.setSuspended(hubOpen || guideOpen || helpOpen) }, [engine, hubOpen, guideOpen,helpOpen])

  useMusicDucked(hubOpen || guideOpen || settingsOpen)

  const free = snapshot.run.mode === 'free'
  const owns = useCallback((id: string) => free || snapshot.profile.tech.includes(id), [free, snapshot.profile.tech])

  const setInputMode = (mode: InputMode) => {
    if(readOnly&&mode!=='pan'&&mode!=='inspect') {toast.info('Exposição protegida: explore e examine sem alterar a fábrica.');return}
    setInputModeState(mode)
    engine?.setInputMode(mode)
  }

  const lockReason = useCallback((type: StructureType) => {
    const definition = STRUCTURES[type]
    if (definition.tech && !owns(definition.tech)) return `${definition.name} requer "${TECH_BY_ID[definition.tech]?.name}" no Grande Grimório.`
    return `${definition.name} será liberada no contrato ${definition.introOrder} da campanha.`
  }, [owns])

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || settingsOpen || guideOpen || hubOpen) return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable=true], [role=slider], [role=dialog], [role=alertdialog], [role=menu], [role=menuitemradio]')) return
    const key = event.key.toLowerCase()
    if(readOnly&&(key==='b'||key==='r')) {event.preventDefault();return}
    if (!['b', 'i', 'v', 'g', 'r', 'f', 'm', 'escape'].includes(key)) return
    event.preventDefault()
    if (key === 'b') setInputMode('build')
    else if (key === 'i') setInputMode('inspect')
    else if (key === 'v' || key === 'escape') setInputMode('pan')
    else if (key === 'g') onPreferences({ grid: nextGrid(preferences.grid) })
    else if (key === 'f') engine?.resetCamera()
    else if (key === 'm') engine?.setMathVision(!snapshot.mathVision)
    else if (key === 'r') {
      if ((inputMode === 'inspect' || inputMode === 'pan') && snapshot.selected) engine?.rotateAt(snapshot.selected)
      else setBuildDirection((direction) => ((direction + (event.shiftKey ? 5 : 1)) % 6) as HexDirection)
    }
    document.getElementById('world-canvas')?.focus({ preventScroll: true })
  }

  const exportSave = () => {
    if (!engine) return
    const content = serializeSave(engine.exportSnapshot())
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mmc-save-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Save exportado em JSON.')
  }

  const importSave = async (file: File) => {
    if (!engine) return
    try {
      const imported = parseSaveText(await file.text())
      await engine.importSnapshot(imported)
      setSettingsOpen(false)
      toast.success('Save importado e validado.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível importar o save.')
    }
  }

  const resetSandbox = async () => {
    if (!engine) return
    await engine.resetSandbox()
    setSettingsOpen(false)
    toast.success('Oficina livre reiniciada.')
  }

  const regenerate = () => {
    if (!seed.trim()) {
      toast.error('Informe uma seed para gerar o mundo.')
      return
    }
    engine?.regenerate(seed)
  }

  const exitToMenu = async () => {
    if (engine) await engine.saveNow()
    onExit()
  }

  const selectedAt = snapshot.focusedCell

  return (
    <div className="game-shell relative flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-[#111a18] text-[#e7eee9]" data-mode={inputMode} onKeyDown={handleKeyboard}>
      <a href="#world-canvas" className="skip-to-map">Ir para o mapa</a>
      <p id="game-controls" className="sr-only">{readOnly?'Exposição protegida. Setas ou WASD movem o mapa. Enter seleciona a célula da mira central. I examina, V move, G alterna a malha, F centraliza e M liga a Visão Matemática. Tab percorre os controles.':'Setas ou WASD movem o mapa. Enter aplica a ferramenta na célula da mira central. B constrói, I examina, V move, G alterna a malha, R gira, F centraliza e M liga a Visão Matemática. Tab percorre os controles. Escape sai da ferramenta.'}</p>
      <p id="map-focus-summary" className="sr-only" aria-live="polite">{snapshot.selectedCell ? `Célula selecionada: ${snapshot.selectedCell.key}. ${snapshot.selectedStructure ? `${STRUCTURES[snapshot.selectedStructure.type].name}, ${snapshot.selectedStructure.size ?? 1} por ${snapshot.selectedStructure.size ?? 1} células` : TERRAINS[snapshot.selectedCell.terrain].name}.` : 'Nenhuma célula selecionada.'}</p>
      <main className="relative min-h-0 flex-1">
        <GameCanvas
          slot={slot}
          onEngine={handleEngine}
          onSnapshot={handleSnapshot}
          onSaveStatus={handleSaveStatus}
          onError={handleError}
          onNotice={handleNotice}
          onOpenGuide={handleOpenGuide}
          onLesson={handleLesson}
          onBuildSelection={handleBuildSelection}
          inputMode={inputMode}
        />

        <GameHUD snapshot={snapshot} saveStatus={saveStatus} online={online} offlineReady={offlineReady} speedUnlocked={owns('pulse-simulator')} readOnly={readOnly}
          lessons={lessons.filter((entry) => entry.run === `${snapshot.run.mode}:${snapshot.run.contractId}:${snapshot.run.endless?.key}:${snapshot.profile.campaign[snapshot.run.contractId ?? '']?.attempts ?? 0}`)}
          inventory={snapshot.inventory} onPause={() => engine?.togglePause()} onSpeed={(speed: SimulationSpeed) => engine?.setSpeed(speed)} onSave={() => { if (engine) void engine.saveNow() }}
          onMathVision={() => engine?.setMathVision(!snapshot.mathVision)} onMenu={() => readOnly?void exitToMenu():setHubOpen(true)} />

        {(inputMode === 'inspect' || inputMode === 'pan') && snapshot.selectedCell && selectedAt && (
          <InspectionBalloon
            cell={selectedAt}
            structure={snapshot.focusedStructure}
            depositRemaining={snapshot.focusedDepositRemaining}
            engine={engine}
            snapshot={snapshot}
            onOpenGuide={handleOpenGuide}
            onRotate={() => { if (snapshot.focusedCell) engine?.rotateAt(snapshot.focusedCell) }}
            onExpand={() => { if (snapshot.focusedCell) engine?.expandAt(snapshot.focusedCell) }}
            onMigrationThreshold={(threshold) => { if (snapshot.focusedCell) engine?.setGolemMigrationThreshold(snapshot.focusedCell, threshold) }}
            onPrismOutputCount={(count) => { if (snapshot.focusedCell) engine?.setPrismOutputCount(snapshot.focusedCell, count) }}
            onSiloReleaseMultiple={(multiple) => { if (snapshot.focusedCell) engine?.setSiloReleaseMultiple(snapshot.focusedCell, multiple) }}
          />
        )}

        {!readOnly&&<BuildPalette
          onOpenCreature={()=>openCodex({category:'creatures',id:'carrier'})}
          mode={inputMode}
          selectedType={buildType}
          direction={buildDirection}
          tier={buildTier}
          inventory={snapshot.inventory}
          unlocked={snapshot.unlocked}
          maxRune={maxRuneLevel(snapshot.profile, free)}
          lockReason={lockReason}
          onSelectType={(type) => { setBuildType(type); setInputMode('build') }}
          onDirection={(direction) => { setBuildDirection(direction); setInputMode('build') }}
          onTier={(tier) => { setBuildTier(tier); if (buildType !== 'paving') setBuildType('conveyor'); setInputMode('build') }}
          onDemolish={() => setInputMode('demolish')}
          onClose={() => setInputMode('pan')}
          onDropStructure={(type, x, y) => { setBuildType(type); engine?.buildAtClient(type, buildDirection, buildTier, x, y) }}
          onDropRune={(level, x, y) => engine?.dropRune(level, x, y)}
          onLockedTap={(message) => toast.info(message)}
        />}


        <MapControls zoom={snapshot.camera.zoom} grid={preferences.grid} onZoom={(factor) => engine?.zoomBy(factor)}
          onGrid={() => onPreferences({ grid: nextGrid(preferences.grid) })} onAccessibility={() => setSettingsOpen(true)} />
        {readOnly&&<ExhibitionTour count={snapshot.structureCount} ready={snapshot.ready} onVisit={(q,r,zoom)=>engine?.focusAt(q,r,zoom)}/>}
      </main>
      <GameToolbar mode={inputMode} onMode={setInputMode} onCenter={() => engine?.resetCamera()} onGuide={() => openCodex()} onSettings={() => setSettingsOpen(true)} readOnly={readOnly}/>

      <SettingsSheet
        readOnly={readOnly}
        preferences={preferences}
        onPreferences={onPreferences}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        snapshot={snapshot}
        seed={seed}
        onSeedChange={setSeed}
        onRegenerate={regenerate}
        onSpeed={(speed) => engine?.setSpeed(speed)}
        onShowCoordinates={(show) => engine?.setShowCoordinates(show)}
        onChunkDistance={(distance) => engine?.setChunkDistance(distance)}
        onSave={() => { if (engine) void engine.saveNow() }}
        onExport={exportSave}
        onImport={(file) => void importSave(file)}
        onReset={() => void resetSandbox()}
        saveStatus={saveStatus}
        offlineReady={offlineReady}
        freeMode={free}
      />
      <CodexDialog open={guideOpen} onOpenChange={setGuideOpen} target={guideTarget} onSelect={setGuideTarget} profile={snapshot.profile} freeMode={free} onLessonRead={markLessonRead} />
      <Hub open={hubOpen && snapshot.ready} snapshot={snapshot} engine={engine}
        onHelp={()=>{setHubOpen(false);setHelpOpen(true)}}
        onClose={() => setHubOpen(false)} onOpenCodex={openCodex} onSettings={() => setSettingsOpen(true)} onExit={() => void exitToMenu()}
        onError={handleError} onNotice={handleNotice} />
      <ReportDialog snapshot={snapshot} engine={engine} hubOpen={hubOpen} onHub={() => setHubOpen(true)} onRetry={() => { const error = engine?.retryRun(); if (error) toast.error(error) }} />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="how-dialog"><DialogTitle className="sr-only">Como jogar M.M.C.</DialogTitle><DialogDescription className="sr-only">Guia de construção, extração, lotes e exploração.</DialogDescription><HowToPlay onBack={()=>setHelpOpen(false)} onCodex={target=>{setHelpOpen(false);openCodex(target)}}/></DialogContent></Dialog>
    </div>
  )
}
