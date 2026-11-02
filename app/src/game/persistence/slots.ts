import { DEFAULT_CAMERA, DEFAULT_SEED, DEFAULT_SETTINGS, DEMO_SLOT_ID, LEGACY_SAVE_ID, SLOT_IDS, type SlotId } from '../config'
import { CONTRACTS } from '../content/contracts'
import { DIFFICULTIES } from '../content/difficulty'
import { EXHIBITION_NAME } from '../content/exhibition'
import { CONTRACT_INVENTORY, STARTING_INVENTORY, createInitialFactoryState } from '../content/structures'
import { createProfile, createRun } from '../stats'
import type { DifficultyId, SaveSnapshot } from '../types'
import { deleteSaveRecord, readSaveRecord, writeSaveRecord } from './database'
import { validateSave } from './save'

export interface SlotSummary {
  readonly readOnly?:boolean
  readonly id: SlotId
  readonly state: 'empty' | 'ready' | 'corrupt'
  readonly name?: string
  readonly difficulty?: DifficultyId
  readonly savedAt?: string
  readonly completed: number
  readonly totalContracts: number
  readonly playTicks: number
  readonly ether: number
  readonly seals: number
  readonly modeLabel?: string
}

export type NewWorldMode='campaign'|'free'
export function createNewSnapshot(slot: SlotId, name: string, difficulty: DifficultyId,mode:NewWorldMode='campaign'): SaveSnapshot {
  if(slot===DEMO_SLOT_ID) throw new Error('O quarto slot é uma exposição protegida.')
  const first=CONTRACTS[0]
  return {
    oreLayout:'veins',
    schemaVersion: 7,
    id: slot,
    savedAt: new Date().toISOString(),
    seed: mode==='campaign'?first.seed:DEFAULT_SEED,
    tick: 0,
    selected: null,
    camera: DEFAULT_CAMERA,
    settings: DEFAULT_SETTINGS,
    factory: createInitialFactoryState(mode==='campaign'?CONTRACT_INVENTORY:STARTING_INVENTORY),
    profile: createProfile(name.trim().slice(0, 24) || 'Engenheiro', difficulty, DIFFICULTIES[difficulty].startEther),
    run: mode==='campaign'?{...createRun(),mode:'campaign',contractId:first.id}:createRun(),
  }
}

function modeLabel(snapshot: SaveSnapshot): string {
  const run = snapshot.run
  if (run.mode === 'free') return 'Oficina livre'
  if (run.mode === 'endless') return 'Contrato infinito'
  const contract = CONTRACTS.find((candidate) => candidate.id === run.contractId)
  return contract ? `Contrato ${contract.order}: ${contract.name}` : 'Campanha'
}

/** A save made before slots existed is carried into slot 1 exactly once. */
export async function importLegacySave(): Promise<void> {
  const legacy = await readSaveRecord(LEGACY_SAVE_ID)
  if (legacy === undefined) return
  const existing = await readSaveRecord(SLOT_IDS[0])
  if (existing === undefined) {
    const snapshot = validateSave(legacy)
    if (snapshot) await writeSaveRecord({ ...snapshot, id: SLOT_IDS[0] })
  }
  await deleteSaveRecord(LEGACY_SAVE_ID)
}

export async function readSlotSummaries(): Promise<SlotSummary[]> {
  try { await importLegacySave() } catch { /* A broken legacy record must not hide the three slots. */ }
  const summaries: SlotSummary[] = []
  for (const id of SLOT_IDS) {
    const base = { id, completed: 0, totalContracts: CONTRACTS.length, playTicks: 0, ether: 0, seals: 0 }
    try {
      const record = await readSaveRecord(id)
      if (record === undefined) { summaries.push({ ...base, state: 'empty' }); continue }
      const snapshot = validateSave(record)
      if (!snapshot) { summaries.push({ ...base, state: 'corrupt' }); continue }
      const { profile } = snapshot
      summaries.push({
        ...base, state: 'ready', name: profile.name, difficulty: profile.difficulty, savedAt: snapshot.savedAt,
        completed: Object.values(profile.campaign).filter((record) => record.completed).length,
        playTicks: profile.playTicks, ether: Math.floor(profile.ether), seals: profile.seals, modeLabel: modeLabel(snapshot),
      })
    } catch {
      summaries.push({ ...base, state: 'corrupt' })
    }
  }
  summaries.push({id:DEMO_SLOT_ID,state:'ready',readOnly:true,name:EXHIBITION_NAME,modeLabel:'Exposição viva do Pibid · somente visita',completed:0,totalContracts:CONTRACTS.length,playTicks:0,ether:0,seals:0})
  return summaries
}

export async function createSlot(slot: SlotId, name: string, difficulty: DifficultyId,mode:NewWorldMode='campaign'): Promise<void> {
  await writeSaveRecord(createNewSnapshot(slot, name, difficulty,mode))
}

export async function deleteSlot(slot: SlotId): Promise<void> {
  await deleteSaveRecord(slot)
}

export async function readSlotSnapshot(slot: SlotId): Promise<SaveSnapshot | null> {
  const record = await readSaveRecord(slot)
  return record === undefined ? null : validateSave(record)
}
