import { perf, type PhaseTimes } from '../perf'
import {
  AUTOSAVE_INTERVAL_MS,
  DEFAULT_SEED,
  DEFAULT_SETTINGS,
  DEMO_SLOT_ID,
  MAX_FRAME_DELTA_MS,
  SAVE_SCHEMA_VERSION,
  SIMULATION_STEP_MS,
  SNAPSHOT_INTERVAL_MS,
  type SlotId,
} from '../config'
import { audio } from '../audio/engine'
import { FactoryAudio } from '../audio/director'
import { getCellInspection } from '../content/codex'
import { structureCodexTarget } from '../content/creatures'
import { CONTRACT_BY_ID, resolveGoals, unlockedOrder } from '../content/contracts'
import { DIFFICULTIES } from '../content/difficulty'
import { makeEndlessSpec } from '../content/endless'
import { CONTRACT_INVENTORY, STARTING_INVENTORY, STRUCTURES, STRUCTURE_LIST } from '../content/structures'
import { TECH_BY_ID, maxGnomes, previousTech } from '../content/tech'
import { worldToGrid } from '../math/grid'
import { readSaveRecord, writeSaveRecord } from '../persistence/database'
import { validateSave } from '../persistence/save'
import { createRun } from '../stats'
import type {
  AlloyId,
  Axial,
  ChannelSequence,
  ChunkDistance,
  ContractGoal,
  ContractProgress,
  DifficultyId,
  EndlessSpec,
  EngineCallbacks,
  HexCell,
  HexDirection,
  MathTopic,
  OreLayout,
  PrismOutputCount,
  Profile,
  ResourceInventory,
  RunState,
  SaveSnapshot,
  SaveStatus,
  SimulationSpeed,
  StructureType,
} from '../types'
import { ChunkWorld } from '../world/ChunkWorld'
import { planContractMap } from '../world/contractMap'
import { Camera } from './camera'
import { InputController, type InputMode } from './input'
import { FREE_RULES_DIFFICULTY, type RulesConfig } from './machineRules'
import { DEFAULT_OVERLAY_OPTIONS, type OverlayOptions } from './overlayRenderer'
import { Renderer } from './renderer'
import { Simulation } from './simulation'
import { CELL_SIZE } from '../math/grid'
import type { VisualPreferences } from '../visualPreferences'
import { planBeltStroke } from './beltStroke'
import { createExhibition, EXHIBITION_SEED, exhibitionRules } from '../content/exhibition'
import { prepareExhibition } from './exhibitionRuntime'

/** A contract fails when the factory stays this unstable for half a minute (at 1×). */
const COLLAPSE_TICKS = 600
const CALM_PACE = 0.6

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export class GameEngine {
  private world = new ChunkWorld(DEFAULT_SEED, DEFAULT_SETTINGS.chunkDistance)
  private readonly simulation = new Simulation()
  private readonly sound = new FactoryAudio()
  private readonly camera = new Camera()
  private readonly renderer: Renderer
  private readonly input: InputController
  private readonly resizeObserver: ResizeObserver
  private frameId = 0
  private running = false
  private disposed = false
  private ready = false
  /** Nothing may be written before the slot has been read: a remount (StrictMode) would erase the real save. */
  private loaded = false
  private paused = false
  /** The hub, the Grimório and the report pause the factory without touching the player's own pause button. */
  private suspended = false
  private lastFrameTime: number | null = null
  private accumulator = 0
  private autosaveElapsed = 0
  private snapshotElapsed = SNAPSHOT_INTERVAL_MS
  private fpsElapsed = 0
  private lastPhases: PhaseTimes = { simulation: 0, ticks: 0, audio: 0, render: 0 }
  private fpsFrames = 0
  private fps = 60
  private dpr = 1
  private hovered: Axial | null = null
  private pendingBuild: { type: StructureType; direction: HexDirection; tier: 1 | 2 | 3 } = { type: 'conveyor', direction: 0, tier: 1 }
  private centerCell: HexCell = this.world.getCell(0, 0)
  private dirty = false
  private revision = 0
  private saveInFlight = false
  private saveQueued = false
  private saveStatus: SaveStatus = 'loading'
  private profile: Profile
  private run: RunState = createRun()
  private mathVision = false
  private calmPace = false
  private unstableTicks = 0
  private lastLesson = { message: '', at: 0 }
  private overlay: OverlayOptions = { ...DEFAULT_OVERLAY_OPTIONS }
  private visual: VisualPreferences | null = null

  private readonly canvas: HTMLCanvasElement
  private readonly callbacks: EngineCallbacks
  readonly slot: SlotId
  get readOnly():boolean {return this.slot===DEMO_SLOT_ID}

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, slot: SlotId) {
    this.canvas = canvas
    this.callbacks = callbacks
    this.slot = slot
    this.profile = {
      name: 'Engenheiro', difficulty: 'artisan', ether: 0, seals: 0, tech: [], campaign: {}, endless: {}, discovered: [],
      math: {}, lessonsRead: [], playTicks: 0, createdAt: new Date().toISOString(),
    }
    this.renderer = new Renderer(canvas)
    this.input = new InputController(canvas, this.camera, {
      onTap: this.selectAt,
      onBuild: this.buildAt,
      onDemolish: this.demolishAt,
      onHover: this.hoverAt,
      onHoverEnd: () => { this.hovered = null },
      onClearSelection: this.clearSelection,
      onTogglePause: this.togglePause,
      onCameraChange: this.handleCameraChange,
      onRotate: (x,y) => this.rotateAt(this.getCellAtScreen(x,y)),
      onCopy: (x,y) => {
        if(this.readOnly) return
        const structure = this.simulation.structureAt(this.getCellAtScreen(x,y))
        if (!structure) { this.callbacks.onNotice('Toque em uma estrutura para copiar o tipo e a orientação.'); return }
        const selection = {type:structure.type,direction:structure.direction,tier:structure.tier ?? 1} as const
        this.setBuildSelection(selection.type,selection.direction,selection.tier)
        this.setInputMode('build')
        this.callbacks.onBuildSelection?.(selection)
      },
      canDraw: () => this.pendingBuild.type === 'conveyor' || this.pendingBuild.type === 'paving',
        onStrokePreview: (points) => this.renderer.setBeltStroke(planBeltStroke(points,this.pendingBuild.direction)),
      onStroke: (points) => {
        if(this.readOnly) return
        const steps = planBeltStroke(points,this.pendingBuild.direction)
        const error = this.pendingBuild.type === 'paving'
          ? this.simulation.paintFloors(steps,this.world,this.pendingBuild.tier)
          : this.simulation.drawConveyors(steps,this.world,this.pendingBuild.tier)
        if (error) this.callbacks.onError(error)
        else { this.markDirty(); this.emitSnapshot() }
      },
    })
    this.resizeObserver = new ResizeObserver(this.resize)
  }

  async start(): Promise<void> {
    this.resizeObserver.observe(this.canvas)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('pagehide', this.handlePageHide)
    this.resize()

    try {
      const stored = this.readOnly?await prepareExhibition():await readSaveRecord(this.slot)
      if (this.disposed) return
      const snapshot = this.readOnly?stored as SaveSnapshot:stored === undefined ? null : validateSave(stored)
      if (snapshot) {
        this.restore(snapshot, false)
        this.loaded = true
        this.setSaveStatus('saved')
      } else {
        this.callbacks.onError(stored === undefined ? 'Este espaço de save está vazio.' : 'O save local estava inválido ou em uma versão incompatível.')
        this.applyRules()
        this.camera.fit()
        this.updateCenter()
        this.loaded = stored === undefined
        this.markDirty()
      }
    } catch (error) {
      if (this.disposed) return
      this.applyRules()
      this.camera.fit()
      this.updateCenter()
      this.setSaveStatus('error')
      this.callbacks.onError(error instanceof Error ? error.message : 'Não foi possível ler o save local.')
    }

    if (this.disposed) return
    this.running = true
    this.frameId = requestAnimationFrame(this.frame)
  }

  stop(): void {
    if (this.disposed) return
    this.disposed = true
    this.running = false
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.input.dispose()
    this.renderer.dispose()
    this.sound.dispose()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('pagehide', this.handlePageHide)
    delete window.__GAME_READY__
    delete window.__MMC_PROBE__
    if (this.loaded) {
      this.markDirty(false)
      void this.saveNow()
    }
  }

  // Rules ----------------------------------------------------------------------

  private get isFree(): boolean {
    return this.run.mode === 'free'
  }

  /** Highest campaign order the player may use: every contract finished unlocks the next piece. */
  private get unlockedOrder(): number {
    return unlockedOrder(this.profile.campaign)
  }

  private buildRules(): RulesConfig {
    if(this.readOnly) return exhibitionRules()
    const free = this.isFree
    const difficulty = free ? FREE_RULES_DIFFICULTY : DIFFICULTIES[this.profile.difficulty]
    const owned = () => this.profile.tech
    const hasTech = (id: string) => free || owned().includes(id)
    const order = this.unlockedOrder
    const allowed = new Set<StructureType>(STRUCTURE_LIST.filter((entry) => free || (entry.introOrder <= order && (!entry.tech || owned().includes(entry.tech)))).map((entry) => entry.id))
    const contract = this.run.contractId ? CONTRACT_BY_ID[this.run.contractId] : null
    const bounds = this.run.mode === 'endless' ? this.run.endless?.radius ?? null : this.run.mode === 'campaign' ? contract?.radius ?? null : null
    return {
      difficulty, mode: this.run.mode, bounds, freeMode: free, hasTech,
      get maxGnomes() { return free ? 5 : maxGnomes({ tech: owned() }) },
      allowed,
    }
  }

  private applyRules(): void {
    this.simulation.configure(this.buildRules(), this.world)
    this.syncOverlay()
  }

  private syncOverlay(): void {
    const rules = this.simulation.rulesConfig
    const hints = rules?.difficulty.hints ?? 'guided'
    this.overlay = {
      ...this.overlay,
      boundsLabel:this.readOnly?'Limite da exposição':undefined,
      mathVision: this.mathVision,
      reveal: hints !== 'none' && rules?.difficulty.id !== 'engineer',
      flowLens: !this.readOnly && (rules?.hasTech('flow-lens') ?? false),
      forecast: !this.readOnly && (rules?.hasTech('chief-engineer') ?? false),
      colorblind: this.visual?.colorblind ?? false,
      font: this.visual?.font ?? 'pixel',
      fontScale: this.visual?.largeText ? 1.2 : 1,
    }
    this.renderer.setOverlayOptions(this.overlay)
  }

  private get goals(): ContractGoal[] {
    if (this.run.mode === 'endless') return this.run.endless?.goals ?? []
    const contract = this.run.contractId ? CONTRACT_BY_ID[this.run.contractId] : null
    return contract ? resolveGoals(contract.goals, this.profile.difficulty) : []
  }

  private get progress(): ContractProgress | null {
    if (this.isFree) return null
    const delivered = this.simulation.delivered
    const contract = this.run.contractId ? CONTRACT_BY_ID[this.run.contractId] : null
    return {
      title: this.run.mode === 'endless' ? (this.run.endless?.daily ? 'Contrato diário' : 'Contrato infinito') : contract?.name ?? 'Contrato',
      goals: this.goals.map((goal) => ({
        resource: goal.resource,
        amount: goal.amount,
        done: goal.resource === 'perfect-cycles' ? this.simulation.stats.perfectCycles : delivered[goal.resource] ?? 0,
      })),
      stability: this.simulation.stability,
      status: this.run.status,
    }
  }

  private checkRun(): void {
    if (this.isFree || this.run.status !== 'active') return
    const progress = this.progress
    if (!progress) return
    if (progress.goals.length > 0 && progress.goals.every((goal) => goal.done >= goal.amount)) {
      this.completeRun()
      return
    }
    const rules = this.simulation.rulesConfig
    if (rules?.difficulty.canFail && progress.stability <= 10 && this.simulation.structureCount > 2) {
      this.unstableTicks += 1
      if (this.unstableTicks >= COLLAPSE_TICKS) this.failRun()
    } else this.unstableTicks = 0
  }

  private completeRun(): void {
    const stats = { ...this.simulation.stats }
    const ticks = this.simulation.tick
    const difficulty = DIFFICULTIES[this.profile.difficulty]
    const sealed = stats.hungerEvents === 0 && stats.clogEvents === 0 && stats.damageTaken === 0
    let reward: number, newBest = false
    if (this.run.mode === 'campaign' && this.run.contractId) {
      const contract = CONTRACT_BY_ID[this.run.contractId]
      const speed = Math.max(0.5, Math.min(1.5, contract.par / Math.max(1, ticks)))
      reward = Math.round(contract.etherBase * speed * difficulty.etherMultiplier)
      const before = this.profile.campaign[contract.id]
      newBest = !before?.completed || ticks < before.bestTicks
      this.profile.campaign[contract.id] = {
        completed: true,
        bestTicks: before?.completed ? Math.min(before.bestTicks, ticks) : ticks,
        bestEther: Math.max(before?.bestEther ?? 0, reward),
        sealed: before?.sealed || sealed,
        attempts: before?.attempts ?? 1,
      }
      if (sealed && !before?.sealed) this.profile.seals += 1
    } else {
      const key = this.run.endless?.key ?? 'endless'
      reward = Math.round(45 * difficulty.etherMultiplier * (sealed ? 1.5 : 1))
      const machines = this.simulation.structureCount
      const before = this.profile.endless[key]
      newBest = !before || machines < before.machines || (machines === before.machines && ticks < before.ticks)
      if (newBest) this.profile.endless[key] = { machines, ticks, completedAt: new Date().toISOString() }
      if (sealed) this.profile.seals += 1
    }
    this.simulation.gainEther(reward)
    this.run = { ...this.run, status: 'complete', stats, report: { ticks, etherReward: reward, sealed, newBest } }
    audio.ui('complete')
    this.suspended = true
    this.markDirty()
    void this.saveNow()
    this.emitSnapshot()
  }

  private failRun(): void {
    this.run = { ...this.run, status: 'failed', stats: { ...this.simulation.stats }, report: null }
    audio.ui('fail')
    this.suspended = true
    this.markDirty()
    void this.saveNow()
    this.emitSnapshot()
    this.callbacks.onError('A fábrica entrou em colapso. Releia os avisos, conserte e tente de novo.')
  }

  // Frame ----------------------------------------------------------------------

  private readonly frame = (timestamp: number): void => {
    if (!this.running || this.disposed) return
    const frameStart = performance.now()
    let simStart = 0, simTime = 0, simSteps = 0
    if (this.lastFrameTime !== null) perf.record(timestamp - this.lastFrameTime, this.lastPhases)
    const delta = this.lastFrameTime === null ? 0 : Math.min(timestamp - this.lastFrameTime, MAX_FRAME_DELTA_MS)
    this.lastFrameTime = timestamp
    this.fpsElapsed += delta
    this.fpsFrames += 1
    if (this.fpsElapsed >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / this.fpsElapsed)
      this.fpsElapsed = 0
      this.fpsFrames = 0
    }

    if (!this.paused && !this.suspended && !document.hidden) {
      this.accumulator += delta * this.simulation.currentSettings.speed * (this.calmPace ? CALM_PACE : 1)
      let steps = 0
      simStart = performance.now()
      while (this.accumulator >= SIMULATION_STEP_MS) {
        this.simulation.step(this.world)
        this.dirty = true
        this.revision += 1
        this.accumulator -= SIMULATION_STEP_MS
        steps += 1
      }
      simSteps = steps
      simTime = performance.now() - simStart
      if (steps > 0) {
        this.profile.playTicks += steps
        this.pumpEvents()
        this.checkRun()
      }
      this.autosaveElapsed += delta
      if (this.autosaveElapsed >= AUTOSAVE_INTERVAL_MS) {
        this.autosaveElapsed = 0
        this.markDirty(false)
        if (this.dirty) void this.saveNow()
      }
    } else {
      this.accumulator = 0
    }

    this.camera.clampTo(this.simulation.bounds, CELL_SIZE)
    this.updateCenter()
    const audioStart = performance.now()
    this.sound.update(this.simulation, this.camera, this.loaded && !this.paused && !this.suspended && !document.hidden, delta)
    const renderStart = performance.now()
    this.renderer.render(this.world, this.camera, this.simulation, this.hovered, this.dpr)
    this.lastPhases = { simulation: simTime, ticks: simSteps, audio: renderStart - audioStart, render: performance.now() - renderStart }
    void frameStart
    if (!this.ready) {
      this.ready = true
      window.__GAME_READY__ = true
      if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__MMC_ENGINE__ = this
      window.__MMC_PROBE__ = () => ({
        tick: this.simulation.tick,
        seed: this.world.seed,
        cells: this.world.cellCount,
        chunks: this.world.chunkCount,
        chunkDistance: this.world.chunkDistance,
        selected: this.simulation.selected,
        center: { q: this.centerCell.q, r: this.centerCell.r },
        centerBiome: this.centerCell.biome,
        focused: this.getFocusedCell(),
        fps: this.fps,
        dpr: this.dpr,
        renderCache: this.renderer.getCacheStats(),
        structures: this.simulation.getFactoryState().structures,
        inventory: this.simulation.inventory,
        cellAt: (q: number, r: number) => this.world.getCell(q, r),
        camera: this.camera.getSnapshot(),
        paused: this.paused,
        speed: this.simulation.currentSettings.speed,
      })
    }

    this.snapshotElapsed += delta
    if (this.snapshotElapsed >= SNAPSHOT_INTERVAL_MS) {
      this.snapshotElapsed = 0
      this.emitSnapshot()
    }
    this.frameId = requestAnimationFrame(this.frame)
  }

  private pumpEvents(): void {
    if(this.readOnly) {this.simulation.drainEvents();return}
    for (const event of this.simulation.drainEvents()) {
      if (event.kind === 'lesson') this.teach(event.message)
      else if (event.kind === 'notice') this.callbacks.onNotice(event.message)
      else if (event.kind === 'error') this.callbacks.onError(event.message)
      else if (event.kind === 'discover' && !this.profile.discovered.includes(event.recipe)) {
        this.profile.discovered.push(event.recipe)
        this.callbacks.onNotice('Nova proporção registrada no Códice Metalúrgico.')
      }
    }
  }

  private teach(message: string): void {
    const now = performance.now()
    if (message === this.lastLesson.message && now - this.lastLesson.at < 4000) return
    this.lastLesson = { message, at: now }
    this.callbacks.onLesson?.(message)
  }

  private readonly resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(bounds.width))
    const height = Math.max(1, Math.round(bounds.height))
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixelWidth = Math.round(width * this.dpr)
    const pixelHeight = Math.round(height * this.dpr)
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth
      this.canvas.height = pixelHeight
    }
    this.camera.resize(width, height)
  }

  private readonly handleVisibilityChange = (): void => {
    this.lastFrameTime = null
    this.accumulator = 0
    if (document.hidden) {
      this.markDirty(false)
      void this.saveNow()
    }
    this.emitSnapshot()
  }

  private readonly handlePageHide = (): void => {
    this.markDirty(false)
    void this.saveNow()
  }

  private readonly selectAt = (screenX: number, screenY: number, openGuide: boolean): void => {
    const cell = this.getCellAtScreen(screenX, screenY)
    this.simulation.select(this.input.currentMode === 'pan' && !openGuide && !this.simulation.structureAt(cell) ? null : { q: cell.q, r: cell.r })
    this.markDirty()
    if (openGuide) {const structure=this.simulation.structureAt(cell);this.callbacks.onOpenGuide(structure?structureCodexTarget(structure.type):getCellInspection(cell).target)}
    this.emitSnapshot()
  }

  private readonly buildAt = (screenX: number, screenY: number): void => {
    const cell = this.getCellAtScreen(screenX, screenY)
    this.placeAt(cell)
  }

  private placeAt(cell: HexCell): void {
    if(this.readOnly) return
    const { type, direction, tier } = this.pendingBuild
    const error = this.simulation.build(cell, type, direction, { tier })
    if (error) this.callbacks.onError(error)
    this.markDirty()
    this.emitSnapshot()
  }

  /** Drag-and-drop from the dock: the drop point is a client coordinate. */
  buildAtClient(type: StructureType, direction: HexDirection, tier: 1 | 2 | 3, clientX: number, clientY: number): boolean {
    if(this.readOnly) return false
    const bounds = this.canvas.getBoundingClientRect()
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return false
    const cell = this.getCellAtScreen(clientX - bounds.left, clientY - bounds.top)
    const error = this.simulation.build(cell, type, direction, { tier })
    if (error) this.callbacks.onError(error)
    this.markDirty()
    this.emitSnapshot()
    return !error
  }

  /** Drag-and-drop of a Runa Multiplicadora onto a machine. */
  dropRune(level: 1 | 2 | 3, clientX: number, clientY: number): void {
    if(this.readOnly) return
    const bounds = this.canvas.getBoundingClientRect()
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return
    const cell = this.getCellAtScreen(clientX - bounds.left, clientY - bounds.top)
    if (!this.simulation.structureAt(cell)) { this.callbacks.onError('Solte a runa sobre uma Fornalha, um Altar ou uma Câmara.'); return }
    this.edit(this.simulation.engraveRune(cell, level), 'Runa gravada: a operação da máquina agora é multiplicada.')
  }

  private readonly demolishAt = (screenX: number, screenY: number): void => {
    if(this.readOnly) return
    const cell = this.getCellAtScreen(screenX, screenY)
    const error = this.simulation.demolish(cell)
    if (error) this.callbacks.onError(error)
    else this.callbacks.onNotice('Estrutura removida; recursos devolvidos ao inventário.')
    this.markDirty()
    this.emitSnapshot()
  }

  private getCellAtScreen(screenX: number, screenY: number): HexCell {
    const world = this.camera.screenToWorld(screenX, screenY)
    const axial = worldToGrid(world)
    return this.world.getCell(axial.q, axial.r)
  }

  private readonly hoverAt = (screenX: number, screenY: number): void => {
    const world = this.camera.screenToWorld(screenX, screenY)
    const axial = worldToGrid(world)
    this.hovered = { q: axial.q, r: axial.r }
  }

  private readonly clearSelection = (): void => {
    this.simulation.select(null)
    this.markDirty()
    this.emitSnapshot()
  }

  private readonly handleCameraChange = (): void => {
    this.markDirty(false)
  }

  private updateCenter(): void {
    const center = worldToGrid({ x: this.camera.viewX, y: this.camera.viewY })
    this.world.update(center)
    this.centerCell = this.world.getCell(center.q, center.r)
  }

  private getFocusedCell(): HexCell {
    const focused = this.hovered ?? this.simulation.selected
    return focused ? this.world.getCell(focused.q, focused.r) : this.centerCell
  }

  private syncProfile(): Profile {
    this.profile.ether = Math.round(this.simulation.ether * 100) / 100
    return this.profile
  }

  private emitSnapshot(): void {
    const selected = this.simulation.selected
    const selectedCell = selected ? this.world.getCell(selected.q, selected.r) : null
    const focusedCell = this.getFocusedCell()
    const profile = { ...this.syncProfile(), ether: Math.floor(this.simulation.ether) }
    const rules = this.simulation.rulesConfig
    this.callbacks.onSnapshot({
      ready: this.ready,
      tick: this.simulation.tick,
      paused: this.paused || this.suspended || document.hidden,
      speed: this.simulation.currentSettings.speed,
      showCoordinates: this.simulation.currentSettings.showCoordinates,
      selected,
      selectedCell,
      focusedCell,
      selectedStructure: selectedCell ? this.simulation.structureAt(selectedCell) : null,
      focusedStructure: this.simulation.structureAt(focusedCell),
      focusedDepositRemaining: this.simulation.getDepositRemaining(focusedCell),
      structureCount: this.simulation.structureCount,
      inventory: this.simulation.inventory,
      centerCell: this.centerCell,
      camera: this.camera.getSnapshot(),
      renderLOD: this.renderer.renderLOD,
      seed: this.world.seed,
      chunkDistance: this.world.chunkDistance,
      loadedChunks: this.world.chunkCount,
      cellCount: this.world.cellCount,
      fps: this.fps,
      dpr: this.dpr,
      profile,
      run: { ...this.run, stats: { ...this.simulation.stats } },
      progress: this.progress,
      mathVision: this.mathVision,
      monsterCount: this.simulation.monsterCount,
      unlocked: STRUCTURE_LIST.filter((entry) => rules?.allowed.has(entry.id)).map((entry) => entry.id),
      slot: this.slot,
    })
  }

  private createSnapshot(): SaveSnapshot {
    return {
      oreLayout:this.world.oreLayout,
      schemaVersion: SAVE_SCHEMA_VERSION,
      id: this.slot,
      savedAt: new Date().toISOString(),
      seed: this.world.seed,
      tick: this.simulation.tick,
      selected: this.simulation.selected,
      camera: this.camera.getSnapshot(),
      settings: this.simulation.currentSettings,
      factory: this.simulation.getFactoryState(),
      profile: clone(this.syncProfile()),
      run: { ...this.run, stats: { ...this.simulation.stats } },
    }
  }

  private markDirty(emit = true): void {
    if(this.readOnly) return
    this.dirty = true
    this.revision += 1
    if (emit) this.setSaveStatus('dirty')
  }

  private setSaveStatus(status: SaveStatus): void {
    if (this.saveStatus === status) return
    this.saveStatus = status
    this.callbacks.onSaveStatus(status)
  }

  async saveNow(): Promise<void> {
    if(this.readOnly) return
    if (!this.loaded) return
    if (this.saveInFlight) {
      this.saveQueued = true
      return
    }
    if (!this.dirty && this.saveStatus === 'saved') return
    this.saveInFlight = true
    this.saveQueued = false
    this.setSaveStatus('saving')
    const savedRevision = this.revision
    try {
      await writeSaveRecord(this.createSnapshot())
      if (this.revision === savedRevision) {
        this.dirty = false
        this.setSaveStatus('saved')
      } else {
        this.setSaveStatus('dirty')
      }
    } catch (error) {
      this.setSaveStatus('error')
      this.callbacks.onError(error instanceof Error ? error.message : 'Não foi possível salvar localmente.')
    } finally {
      this.saveInFlight = false
      if (this.saveQueued) void this.saveNow()
    }
  }

  exportSnapshot(): SaveSnapshot {
    return this.createSnapshot()
  }

  async importSnapshot(snapshot: SaveSnapshot): Promise<void> {
    if(this.readOnly) throw new Error('A exposição não pode ser sobrescrita.')
    this.restore({ ...snapshot, id: this.slot }, true)
    await this.saveNow()
  }

  private makeWorld(run: RunState, seed: string, distance: ChunkDistance,layout:OreLayout='veins'): ChunkWorld {
    if(this.readOnly) {const plan=createExhibition();return new ChunkWorld(EXHIBITION_SEED,distance,plan.overrides,'veins',plan.platforms)}
    if (run.mode === 'campaign' && run.contractId && CONTRACT_BY_ID[run.contractId]) {
      const contract = CONTRACT_BY_ID[run.contractId]
      return new ChunkWorld(contract.seed, distance, planContractMap(contract.seed, contract.radius, contract.deposits,layout,{ caldera: contract.order >= STRUCTURES.grandaltar.introOrder }).overrides,layout)
    }
    if (run.mode === 'endless' && run.endless) {
      return new ChunkWorld(run.endless.seed, distance, planContractMap(run.endless.seed, run.endless.radius, run.endless.deposits,layout,{ caldera: true }).overrides,layout)
    }
    return new ChunkWorld(seed, distance,new Map(),layout)
  }

  private restore(snapshot: SaveSnapshot, persist: boolean): void {
    this.renderer.invalidate()
    this.profile = clone(snapshot.profile)
    this.run = { ...snapshot.run }
    this.world = this.makeWorld(this.run, snapshot.seed, snapshot.settings.chunkDistance,snapshot.oreLayout??'legacy')
    this.simulation.restore(snapshot.tick, snapshot.selected, snapshot.settings, snapshot.factory)
    this.simulation.stats = { ...snapshot.run.stats }
    this.simulation.ether = snapshot.profile.ether
    this.mathVision = this.isFree ? false : DIFFICULTIES[this.profile.difficulty].mathVision
    const speed = this.simulation.currentSettings.speed
    if (speed === 4 && !(this.isFree || this.profile.tech.includes('pulse-simulator'))) this.simulation.setSpeed(2)
    this.applyRules()
    this.camera.restore(snapshot.camera)
    this.paused = false
    this.suspended = this.run.status !== 'active'
    this.hovered = null
    this.accumulator = 0
    this.unstableTicks = 0
    this.lastFrameTime = null
    this.updateCenter()
    if (persist) this.markDirty()
    this.emitSnapshot()
  }

  // Runs -----------------------------------------------------------------------

  private beginRun(run: RunState, seed: string, inventory: ResourceInventory): void {
    if(this.readOnly) return
    this.renderer.invalidate()
    this.run = run
    this.world = this.makeWorld(run, seed, this.simulation.currentSettings.chunkDistance)
    this.simulation.reset(inventory)
    this.simulation.ether = this.profile.ether
    this.applyRules()
    this.camera.fit()
    this.hovered = null
    this.paused = false
    this.suspended = false
    this.accumulator = 0
    this.unstableTicks = 0
    this.mathVision = run.mode === 'free' ? false : DIFFICULTIES[this.profile.difficulty].mathVision
    this.syncOverlay()
    this.updateCenter()
    this.markDirty()
    void this.saveNow()
    this.emitSnapshot()
  }

  startFree(): void {
    if(this.readOnly) return
    this.syncProfile()
    this.beginRun({ ...createRun() }, DEFAULT_SEED, STARTING_INVENTORY)
  }

  startContract(id: string): string | null {
    if(this.readOnly) return 'A exposição é somente para visita.'
    const contract = CONTRACT_BY_ID[id]
    if (!contract) return 'Contrato desconhecido.'
    if (contract.order > this.unlockedOrder) return 'Conclua o contrato anterior para liberar este.'
    if (contract.requiresTech && !this.profile.tech.includes(contract.requiresTech)) {
      const node = TECH_BY_ID[contract.requiresTech]
      return `Este contrato requer ${node?.name ?? contract.requiresTech} no Grande Grimório.`
    }
    const before = this.profile.campaign[id]
    this.profile.campaign[id] = { completed: before?.completed ?? false, bestTicks: before?.bestTicks ?? 0, bestEther: before?.bestEther ?? 0, sealed: before?.sealed ?? false, attempts: (before?.attempts ?? 0) + 1 }
    this.syncProfile()
    const run: RunState = { ...createRun(), mode: 'campaign', contractId: id }
    this.beginRun(run, contract.seed, CONTRACT_INVENTORY)
    return null
  }

  startEndless(options: { seed: string; daily: boolean }): string | null {
    if (!this.profile.tech.includes('rune-100')) return 'Os Contratos Infinitos são liberados pelas Runas de Centena e Milhar, no Grande Grimório.'
    const spec: EndlessSpec = makeEndlessSpec({ seed: options.seed, daily: options.daily, difficulty: this.profile.difficulty, chamberUnlocked: this.profile.tech.includes('metallurgy-2') })
    return this.startEndlessSpec(spec)
  }

  startEndlessSpec(spec: EndlessSpec): string | null {
    if(this.readOnly) return 'A exposição é somente para visita.'
    if (!this.profile.tech.includes('rune-100')) return 'Os Contratos Infinitos são liberados pelas Runas de Centena e Milhar, no Grande Grimório.'
    this.syncProfile()
    const run: RunState = { ...createRun(), mode: 'endless', endless: spec }
    this.beginRun(run, spec.seed, CONTRACT_INVENTORY)
    return null
  }

  retryRun(): string | null {
    if (this.run.mode === 'campaign' && this.run.contractId) return this.startContract(this.run.contractId)
    if (this.run.mode === 'endless' && this.run.endless) return this.startEndlessSpec(this.run.endless)
    this.startFree()
    return null
  }

  setSuspended(value: boolean): void {
    if (this.suspended === value) return
    // A finished run stays frozen until the player chooses what to do next.
    if (!value && this.run.status !== 'active') return
    this.suspended = value
    this.lastFrameTime = null
    this.accumulator = 0
    if (value) { this.markDirty(false); void this.saveNow() }
    this.emitSnapshot()
  }

  // Profile --------------------------------------------------------------------

  buyTech(id: string): string | null {
    if(this.readOnly) return 'A exposição é somente para visita.'
    const node = TECH_BY_ID[id]
    if (!node) return 'Melhoria desconhecida.'
    if (this.profile.tech.includes(id)) return 'Você já possui esta melhoria.'
    const previous = previousTech(node)
    if (previous && !this.profile.tech.includes(previous.id)) return `Compre antes: ${previous.name}.`
    if (this.simulation.ether < node.ether) return `Faltam ${Math.ceil(node.ether - this.simulation.ether)} Pontos de Éter.`
    if (this.profile.seals < node.seals) return `Esta melhoria exige ${node.seals} Selo(s) de Perfeição.`
    this.simulation.ether -= node.ether
    this.profile.seals -= node.seals
    this.profile.tech = [...this.profile.tech, id]
    this.applyRules()
    this.markDirty()
    void this.saveNow()
    this.emitSnapshot()
    return null
  }

  recordAnswer(index: number, topic: MathTopic, correct: boolean): void {
    if(this.readOnly) return
    const report = this.run.report
    if (!report || (report.quizAnswered ?? 0) & (1 << index)) return
    this.run = { ...this.run, report: { ...report, quizAnswered: (report.quizAnswered ?? 0) | (1 << index), quizCorrect: (report.quizCorrect ?? 0) | (correct ? 1 << index : 0) } }
    const score = this.profile.math[topic] ?? { correct: 0, total: 0 }
    this.profile.math[topic] = { correct: score.correct + (correct ? 1 : 0), total: score.total + 1 }
    if (correct) this.simulation.ether += 4
    this.markDirty()
    this.emitSnapshot()
  }

  markLessonRead(id: string): void {
    if(this.readOnly) return
    if (this.profile.lessonsRead.includes(id)) return
    this.profile.lessonsRead = [...this.profile.lessonsRead, id]
    this.markDirty(false)
  }

  /** Changing the level mid-contract would move the goalposts, so it waits for a free moment. */
  setDifficulty(id: DifficultyId): string | null {
    if(this.readOnly) return 'A exposição é somente para visita.'
    if (!this.isFree && this.run.status === 'active') return 'Termine ou abandone o contrato atual antes de mudar a complexidade.'
    this.profile.difficulty = id
    this.mathVision = this.isFree ? false : DIFFICULTIES[id].mathVision
    this.applyRules()
    this.markDirty()
    this.emitSnapshot()
    return null
  }

  setMathVision(value: boolean): void {
    this.mathVision = value
    this.syncOverlay()
    this.emitSnapshot()
  }

  setPrefs(preferences: VisualPreferences): void {
    this.visual = preferences
    this.calmPace = preferences.calmPace
    this.renderer.setVisualPreferences(preferences)
    this.syncOverlay()
  }

  // Controls -------------------------------------------------------------------

  regenerate(seed: string): void {
    if(this.readOnly) return
    const normalized = seed.trim().slice(0, 64)
    if (!normalized) {
      this.callbacks.onError('Informe uma seed para gerar o mapa.')
      return
    }
    if (!this.isFree) {
      this.callbacks.onError('A seed só pode ser trocada na Oficina livre.')
      return
    }
    this.renderer.invalidate()
    this.world = new ChunkWorld(normalized, this.simulation.currentSettings.chunkDistance)
    this.simulation.reset(STARTING_INVENTORY)
    this.simulation.ether = this.profile.ether
    this.applyRules()
    this.camera.fit()
    this.hovered = null
    this.paused = false
    this.accumulator = 0
    this.updateCenter()
    this.markDirty()
    void this.saveNow()
    this.emitSnapshot()
  }

  async resetSandbox(): Promise<void> {
    this.startFree()
  }

  setSpeed(speed: SimulationSpeed): void {
    if (speed === 4 && !(this.isFree || this.profile.tech.includes('pulse-simulator'))) {
      this.callbacks.onError('O tempo em 4× vem do Simulador de Pulso, no Grande Grimório (Visão Arcana).')
      speed = 1
    }
    this.simulation.setSpeed(speed)
    this.markDirty()
    this.emitSnapshot()
  }

  setShowCoordinates(show: boolean): void {
    this.simulation.setShowCoordinates(show)
    this.markDirty()
    this.emitSnapshot()
  }

  setChunkDistance(distance: ChunkDistance): void {
    this.simulation.setChunkDistance(distance)
    this.world.setDistance(distance)
    this.markDirty()
    this.emitSnapshot()
  }

  setInputMode(mode: InputMode): void {
    if(this.readOnly&&mode!=='pan'&&mode!=='inspect') return
    this.input.setMode(mode)
    this.renderer.setInputMode(mode)
  }

  setVisualPreferences(preferences: VisualPreferences): void { this.setPrefs(preferences) }

  setBuildSelection(type: StructureType, direction: HexDirection, tier: 1 | 2 | 3 = 1): void {
    this.pendingBuild = { type, direction, tier }
    this.renderer.setBuildSelection(type, direction)
  }

  private edit(operation: string | null | boolean | (()=>string|null|boolean), notice?: string): void {
    if(this.readOnly) return
    const error=typeof operation==='function'?operation():operation
    if (typeof error === 'string') { this.callbacks.onError(error); return }
    if (error === false) return
    if (notice) this.callbacks.onNotice(notice)
    this.markDirty()
    this.emitSnapshot()
  }

  expandAt(cell: Axial): void {
    if(this.readOnly) return
    const error = this.simulation.expandAt(cell)
    this.edit(error, 'Estrutura ampliada. Conecte as esteiras aos bocais nas bordas.')
  }

  rotateAt(cell: Axial): void { this.edit(()=>this.simulation.rotateAt(cell) ? null : false) }
  setGolemMigrationThreshold(cell: Axial, threshold: number): void { this.edit(()=>this.simulation.setGolemMigrationThreshold(cell, threshold) ? null : false) }
  setPrismOutputCount(cell: Axial, count: PrismOutputCount): void { this.edit(()=>this.simulation.setPrismOutputCount(cell, count) ? null : false) }
  setSiloReleaseMultiple(cell: Axial, multiple: number): void { this.edit(()=>this.simulation.setSiloReleaseMultiple(cell, multiple) ? null : false) }
  setGolemBatch(cell: Axial, batch: number): void { this.edit(()=>this.simulation.setGolemBatch(cell, batch) ? null : false) }
  setSmelterLot(cell: Axial, lot: number): void { this.edit(()=>this.simulation.setSmelterLot(cell, lot) ? null : false) }
  setTarget(cell: Axial, target: AlloyId | null): void { this.edit(()=>this.simulation.setTarget(cell, target)) }
  setEnergizerDose(cell: Axial, dose: number): void { this.edit(()=>this.simulation.setEnergizerDose(cell, dose) ? null : false) }
  setTowerPower(cell: Axial, power: number): void { this.edit(()=>this.simulation.setTowerPower(cell, power) ? null : false) }
  setChannel(cell: Axial, colors: ChannelSequence): void { this.edit(()=>this.simulation.setChannel(cell, colors) ? null : false) }
  setCrateSize(cell: Axial, size: 10 | 50 | 100): void { this.edit(()=>this.simulation.setCrateSize(cell, size) ? null : false) }
  setPrismRatio(cell: Axial, ratio: [number, number] | null): void { this.edit(()=>this.simulation.setPrismRatio(cell, ratio)) }
  engraveRune(cell: Axial, level: 0 | 1 | 2 | 3): void { this.edit(()=>this.simulation.engraveRune(cell, level), level ? 'Runa gravada: a operação da máquina agora é multiplicada.' : undefined) }
  setTwin(cell: Axial, twin: boolean): void { this.edit(()=>this.simulation.setTwin(cell, twin)) }
  setAlchemist(cell: Axial, on: boolean): void { this.edit(()=>this.simulation.setAlchemist(cell, on)) }
  repairAt(cell: Axial): void { this.edit(()=>this.simulation.repairAt(cell), 'Máquina consertada.') }
  insertCrystals(cell: Axial, amount: number): void { this.edit(()=>this.simulation.insertCrystals(cell, amount), 'Cristais de Éter inseridos.') }

  focusAt(q:number,r:number,zoom=.75):void {
    this.camera.restore({x:q*CELL_SIZE,y:r*CELL_SIZE,zoom});this.updateCenter();this.emitSnapshot()
  }

  togglePause = (): void => {
    this.paused = !this.paused
    this.lastFrameTime = null
    this.accumulator = 0
    if (this.paused) {
      this.markDirty(false)
      void this.saveNow()
    }
    this.emitSnapshot()
  }

  zoomBy(factor: number): void {
    this.camera.zoomBy(factor)
    this.markDirty(false)
    this.emitSnapshot()
  }

  resetCamera(): void {
    this.camera.fit()
    this.updateCenter()
    this.markDirty()
    this.emitSnapshot()
  }

  get currentRun(): RunState { return this.run }
  get flowFor(): (id: number) => number | null { return (id) => this.simulation.flowPerMinute(id) }
  recoveryBoostAt(cell: Axial): number { return this.simulation.recoveryBoostAt(cell.q, cell.r) }
}
