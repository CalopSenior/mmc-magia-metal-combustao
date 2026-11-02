import type { Profile, DifficultyId, RunState, RunStats } from './types'

export function emptyStats(): RunStats {
  return {
    perfectCycles: 0, hungerEvents: 0, clogEvents: 0, absorbedEvents: 0, damageTaken: 0,
    monstersSlain: 0, machinesBuilt: 0, peakMachines: 0, pureEther: 0, fusions: 0, repairs: 0,
  }
}

export function createProfile(name: string, difficulty: DifficultyId, ether: number): Profile {
  return {
    name, difficulty, ether, seals: 0, tech: [], campaign: {}, endless: {}, discovered: [], math: {},
    lessonsRead: [], playTicks: 0, createdAt: new Date().toISOString(),
  }
}

export function createRun(): RunState {
  return { mode: 'free', contractId: null, status: 'active', endless: null, stats: emptyStats(), report: null }
}
