import { describe, expect, it } from 'vitest'
import { DEFAULT_SEED, SAVE_ID } from '../config'
import { createInitialFactoryState } from '../content/structures'
import { createProfile, createRun } from '../stats'
import type { SaveSnapshot, Structure, V4SaveSnapshot } from '../types'
import { parseSaveText, serializeSave, validateSave } from './save'
import { createNewSnapshot } from './slots'

const profile = createProfile('Teste', 'artisan', 30)
const run = createRun()

const snapshot: SaveSnapshot = {
  schemaVersion: 7,
  id: SAVE_ID,
  savedAt: '2026-10-30T12:00:00.000Z',
  seed: DEFAULT_SEED,
  tick: 120,
  selected: { q: 1, r: -1 },
  camera: { x: 12, y: -8, zoom: 1.2 },
  settings: { speed: 2, showCoordinates: false, chunkDistance: 3 },
  factory: createInitialFactoryState(),
  profile,
  run,
}

/** The same world as it was saved before profiles and runs existed. */
const { profile: _profile, run: _run, ...savedBase } = snapshot
void _profile; void _run
const legacyBase = { ...savedBase, factory: { structures: [] as Structure[], inventory: snapshot.factory.inventory, deposits: {}, nextStructureId: 1 } }

const golem: Structure = {
  id: 1,
  type: 'golem',
  q: 0,
  r: 0,
  direction: 0,
  inputs: {},
  output: { resource: 'rusted-copper', amount: 2 },
  recipe: null,
  progress: 0,
  createdTick: 10,
  workTicks: 14,
  sourceResource: 'rusted-copper',
  migrationPath: [{ q: 1, r: 0 }],
  migrationProgress: 3,
  migrationThreshold: 50,
  laneOutputs: [],
  prismOutputCount: 2,
  siloReleaseMultiple: 2,
}

describe('persistência versionada', () => {
  it('preserva a volta de um transportador sem invalidar remessas de saves anteriores',()=>{
    const shipment={from:1,to:2,resource:'rusted-copper' as const,amount:50,departedAt:10,arriveAt:110}
    const legacy={...snapshot,factory:{...snapshot.factory,shipments:[shipment]}}
    expect(parseSaveText(serializeSave(legacy)).factory.shipments).toEqual([shipment])
    const returning={...shipment,deliveredAt:115}
    expect(parseSaveText(serializeSave({...snapshot,factory:{...snapshot.factory,shipments:[returning]}})).factory.shipments).toEqual([returning])
  })
  it('salva o gerador novo e aceita saves anteriores sem reinterpretar suas jazidas',()=>{
    const fresh=createNewSnapshot('slot-2','Novos veios','artisan')
    expect(fresh.oreLayout).toBe('veins')
    expect(parseSaveText(serializeSave(fresh)).oreLayout).toBe('veins')
    expect(parseSaveText(serializeSave({...snapshot,oreLayout:'legacy'})).oreLayout).toBe('legacy')
    expect(validateSave(snapshot)?.oreLayout).toBeUndefined()
    expect(validateSave({...snapshot,oreLayout:'random-per-cell'})).toBeNull()
  })
  const forge: Structure = { ...golem, type:'furnace', q:0, r:0, size:3, migrationPath:[], migrationProgress:0, sourceResource:null, workTicks:0, inputs:{'bloody-iron':3} }

  it('preserva ocupação 3×3 e buffers ao exportar um save v6', () => {
    const enlarged: SaveSnapshot = { ...snapshot, factory:{...snapshot.factory,structures:[forge],nextStructureId:2} }
    expect(parseSaveText(serializeSave(enlarged))).toEqual(enlarged)
  })

  it('rejeita sobreposição dentro do corpo da máquina e dimensões incompatíveis', () => {
    const overlapping = { ...golem, type:'conveyor', id:2, q:2, r:2, migrationPath:[] }
    expect(validateSave({ ...snapshot, factory:{...snapshot.factory,structures:[forge,overlapping],nextStructureId:3} })).toBeNull()
    expect(validateSave({ ...snapshot, factory:{...snapshot.factory,structures:[{...forge,type:'conveyor'}],nextStructureId:2} })).toBeNull()
  })

  it('amplia Forjas isoladas de saves v5, preservando o estoque e o trabalho acumulado', () => {
    const { size:_size,...legacyForge } = forge; void _size
    const migrated = validateSave({ ...legacyBase,schemaVersion:5,factory:{...legacyBase.factory,structures:[legacyForge],nextStructureId:2} })!
    expect(migrated.schemaVersion).toBe(7)
    expect(migrated.factory.structures[0]).toEqual({...forge,size:3})
    expect(migrated.factory.inventory).toEqual(snapshot.factory.inventory)
  })

  it('mantém Forjas compactas em fábricas antigas densas sem mover as esteiras', () => {
    const { size:_size,...legacyForge } = forge; void _size
    const belt = {...golem,type:'conveyor',id:2,q:1,r:0,migrationPath:[]}
    const migrated = validateSave({ ...legacyBase,schemaVersion:5,factory:{...legacyBase.factory,structures:[legacyForge,belt],nextStructureId:3} })!
    expect(migrated.factory.structures[0]).toEqual({...legacyForge,size:1})
    expect(migrated.factory.structures[1]).toEqual(belt)
  })

  it('preserva a câmera no zoom mínimo de radar ao exportar e importar', () => {
    const radar = { ...snapshot, camera: { x: -1024, y: 2048, zoom: 0.08 } }
    expect(parseSaveText(serializeSave(radar))).toEqual(radar)
  })
  it('valida e serializa um save v6 sem perder dados da fábrica', () => {
    const withFactory: SaveSnapshot = {
      ...snapshot,
      factory: {
        ...snapshot.factory,
        structures: [golem],
        deposits: { '0,0': 3.125 },
        nextStructureId: 2,
      },
    }
    expect(parseSaveText(serializeSave(withFactory))).toEqual(withFactory)
  })

  it('preserva configurações e buffers das estruturas logísticas', () => {
    const prism: Structure = {
      ...golem,
      type: 'prism',
      output: null,
      inputs: { 'rusted-copper': 2 },
      laneOutputs: [
        { resource: 'rusted-copper', amount: 3 },
        { resource: 'fossil-coal', amount: 2 },
        null,
      ],
      prismOutputCount: 3,
      siloReleaseMultiple: 7,
      migrationPath: [],
      migrationProgress: 0,
      migrationThreshold: 0,
      sourceResource: null,
      workTicks: 0,
    }
    const withLogistics: SaveSnapshot = {
      ...snapshot,
      factory: {
        ...snapshot.factory,
        structures: [prism],
        nextStructureId: 2,
      },
    }

    expect(parseSaveText(serializeSave(withLogistics))).toEqual(withLogistics)
  })

  it('migra um save v4 aplicando os padrões logísticos', () => {
    const {
      laneOutputs: _laneOutputs,
      prismOutputCount: _prismOutputCount,
      siloReleaseMultiple: _siloReleaseMultiple,
      ...v4Structure
    } = golem
    void _laneOutputs
    void _prismOutputCount
    void _siloReleaseMultiple
    const v4: V4SaveSnapshot = {
      ...legacyBase,
      schemaVersion: 4,
      factory: { ...legacyBase.factory, structures: [v4Structure as V4SaveSnapshot['factory']['structures'][number]] },
    }

    const migrated = validateSave(v4)
    expect(migrated?.schemaVersion).toBe(7)
    expect(migrated?.factory.structures[0].laneOutputs).toEqual([])
    expect(migrated?.factory.structures[0].prismOutputCount).toBe(2)
    expect(migrated?.factory.structures[0].siloReleaseMultiple).toBe(2)
    expect(migrated?.factory.structures[0].migrationThreshold).toBe(50)
  })

  it('migra um save v3 com configuração automática padrão do Golem', () => {
    const {
      laneOutputs: _laneOutputs,
      prismOutputCount: _prismOutputCount,
      siloReleaseMultiple: _siloReleaseMultiple,
      migrationPath: _migrationPath,
      migrationProgress: _migrationProgress,
      migrationThreshold: _migrationThreshold,
      ...v3Structure
    } = golem
    void _laneOutputs
    void _prismOutputCount
    void _siloReleaseMultiple
    void _migrationPath
    void _migrationProgress
    void _migrationThreshold
    const v3 = {
      ...legacyBase,
      schemaVersion: 3,
      factory: { ...legacyBase.factory, structures: [v3Structure] },
    }

    const migrated = validateSave(v3)
    expect(migrated?.schemaVersion).toBe(7)
    expect(migrated?.factory.structures[0].migrationPath).toEqual([])
    expect(migrated?.factory.structures[0].migrationThreshold).toBe(0)
    expect(migrated?.factory.structures[0].laneOutputs).toEqual([])
  })

  it('migra um save v2 aplicando a fábrica inicial sem apagar o mundo', () => {
    const { factory: _factory, ...expectedBase } = legacyBase
    void _factory
    const v2 = { ...expectedBase, schemaVersion: 2 }
    expect(validateSave(v2)).toMatchObject({
      ...expectedBase,
      schemaVersion: 7,
      factory: createInitialFactoryState(),
    })
  })

  it('migra um save v1 preservando o mundo e aplicando distância e fábrica iniciais', () => {
    const { factory: _factory, ...expectedBase } = legacyBase
    void _factory
    const legacy = {
      ...expectedBase,
      schemaVersion: 1,
      settings: { speed: 2, showCoordinates: false },
    }
    expect(validateSave(legacy)).toMatchObject({
      ...expectedBase,
      schemaVersion: 7,
      settings: { speed: 2, showCoordinates: false, chunkDistance: 2 },
      factory: createInitialFactoryState(),
    })
  })

  it('migra um save v6 (oficina livre) para v7 com perfil e corrida novos', () => {
    const migrated = validateSave({ ...legacyBase, schemaVersion: 6 })!
    expect(migrated.schemaVersion).toBe(7)
    expect(migrated.run.mode).toBe('free')
    expect(migrated.profile.tech).toEqual([])
    expect(migrated.factory.delivered).toEqual({})
  })

  it('aceita os campos de regras de contrato e rejeita valores impossíveis', () => {
    const smelter: Structure = { ...golem, type: 'smelter', output: null, sourceResource: null, workTicks: 0, migrationPath: [], hp: 40, lot: 4, rune: 1, bursts: { 'rusted-copper': { count: 3, last: 10 } }, crystals: { 'rusted-copper': 1 } }
    const withRules: SaveSnapshot = { ...snapshot, factory: { ...snapshot.factory, structures: [smelter], nextStructureId: 2 } }
    expect(parseSaveText(serializeSave(withRules))).toEqual(withRules)
    expect(validateSave({ ...withRules, factory: { ...withRules.factory, structures: [{ ...smelter, lot: 12 }] } })).toBeNull()
  })

  it('rejeita schemas incompatíveis e valores fora dos limites', () => {
    expect(validateSave({ ...snapshot, schemaVersion: 99 })).toBeNull()
    expect(validateSave({
      ...snapshot,
      settings: { ...snapshot.settings, chunkDistance: 8 },
    })).toBeNull()
    expect(validateSave({
      ...snapshot,
      camera: { ...snapshot.camera, zoom: 20 },
    })).toBeNull()
    expect(validateSave({
      ...snapshot,
      factory: { ...snapshot.factory, structures: [{ id: 1 }] },
    })).toBeNull()
    expect(validateSave({
      ...snapshot,
      factory: {
        ...snapshot.factory,
        structures: [{ ...golem, siloReleaseMultiple: 14 }],
      },
    })).toBeNull()
    expect(() => parseSaveText('{"save":false}')).toThrow()
  })
})
