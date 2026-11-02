import { BookOpen } from 'lucide-react'
import { DifficultyPicker } from '@/components/menu/DifficultyPicker'
import type { GameEngine } from '@/game/boot'
import { CONTRACTS } from '@/game/content/contracts'
import { DIFFICULTIES, TOPIC_LABELS } from '@/game/content/difficulty'
import { LESSONS } from '@/game/content/lessons'
import { ALLOYS, resourceName } from '@/game/content/resources'
import { RECIPES } from '@/game/content/structures'
import type { AlloyId, CodexTarget, EngineSnapshot, MathTopic } from '@/game/types'

function formatPlayTime(ticks: number): string {
  const minutes = Math.floor(ticks / 20 / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`
}

/** Caderno do Aluno: the learning record, readable by a student or a teacher. */
export function Notebook({ snapshot, engine, onOpenCodex, onError }: { snapshot: EngineSnapshot; engine: GameEngine | null; onOpenCodex: (target?: CodexTarget) => void; onError: (message: string) => void }) {
  const { profile, run } = snapshot
  const topics = Object.keys(TOPIC_LABELS) as MathTopic[]
  const completed = CONTRACTS.filter((contract) => profile.campaign[contract.id]?.completed).length
  const sealed = Object.values(profile.campaign).filter((record) => record.sealed).length
  const alloys = Object.values(ALLOYS).filter((alloy) => alloy.tier > 0)
  const level = DIFFICULTIES[profile.difficulty]
  const locked = run.mode !== 'free' && run.status === 'active'
  return <div className="grid gap-4 lg:grid-cols-2">
    <section className="space-y-2 border border-[#4a3c29] bg-[#1b1815] p-4" aria-label="Resumo">
      <h3 className="text-lg text-[#e9b969]">{profile.name}</h3>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-[#dfd2b9]">
        <dt>Contratos concluídos</dt><dd className="text-right">{completed}/{CONTRACTS.length}</dd>
        <dt>Selos de Perfeição</dt><dd className="text-right">{sealed} contrato(s)</dd>
        <dt>Aulas lidas</dt><dd className="text-right">{profile.lessonsRead.length}/{LESSONS.length}</dd>
        <dt>Proporções descobertas</dt><dd className="text-right">{profile.discovered.length}/{alloys.length}</dd>
        <dt>Tempo de jogo</dt><dd className="text-right">{formatPlayTime(profile.playTicks)}</dd>
      </dl>
      <button type="button" className="mt-2 flex min-h-10 items-center gap-2 border border-[#806b4a] px-3 text-sm text-[#f4d9a0] hover:bg-[#3b3124]" onClick={() => onOpenCodex({ category: 'lessons', id: 'tabuada' })}><BookOpen className="h-4 w-4" aria-hidden="true" /> Abrir as aulas</button>
    </section>

    <section className="space-y-2 border border-[#4a3c29] bg-[#1b1815] p-4" aria-label="Desempenho por tema">
      <h3 className="text-lg text-[#e9b969]">Desempenho nas provas por tema</h3>
      <p className="text-xs text-[#b0a18a]">Cada contrato termina com uma Prova da Guilda. Os acertos aparecem aqui.</p>
      <ul className="space-y-2">
        {topics.map((topic) => {
          const score = profile.math[topic]
          const percent = score && score.total ? Math.round((score.correct / score.total) * 100) : null
          return <li key={topic}>
            <div className="flex justify-between text-sm text-[#dfd2b9]"><span>{TOPIC_LABELS[topic]}</span><span>{score && score.total ? `${score.correct}/${score.total} · ${percent}%` : 'sem provas'}</span></div>
            <div className="bar" role="progressbar" aria-label={`Acertos em ${TOPIC_LABELS[topic]}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? 0}><i style={{ width: `${percent ?? 0}%`, background: (percent ?? 0) >= 70 ? '#7ccf6e' : '#e5b347' }} /></div>
          </li>
        })}
      </ul>
    </section>

    <section className="space-y-2 border border-[#4a3c29] bg-[#1b1815] p-4 lg:col-span-2" aria-label="Complexidade">
      <h3 className="text-lg text-[#e9b969]">Complexidade: {level.name} ({level.grades})</h3>
      <p className="text-xs text-[#b0a18a]">{locked ? 'Termine ou abandone o contrato atual para trocar de nível.' : 'A troca vale a partir do próximo contrato.'}</p>
      <fieldset disabled={locked} className={locked ? 'pointer-events-none opacity-60' : ''}>
        <DifficultyPicker compact value={profile.difficulty} onChange={(next) => { const error = engine?.setDifficulty(next); if (error) onError(error) }} />
      </fieldset>
    </section>

    <section className="space-y-2 border border-[#4a3c29] bg-[#1b1815] p-4 lg:col-span-2" aria-label="Proporções descobertas">
      <h3 className="text-lg text-[#e9b969]">Histórico de proporções descobertas</h3>
      {profile.discovered.length === 0 ? <p className="text-sm text-[#c5b69c]">Conclua uma fusão para registrar a primeira proporção.</p> : <ul className="grid gap-1 sm:grid-cols-2">
        {profile.discovered.map((id) => {
          const recipe = RECIPES[id as AlloyId]
          if (!recipe) return null
          return <li key={id}><button type="button" className="w-full border border-[#4a3c29] px-2 py-1 text-left text-sm text-[#dfd2b9] hover:bg-[#3b3124]" onClick={() => onOpenCodex({ category: 'alloys', id: id as AlloyId })}>
            <strong className="text-[#f4d9a0]">{resourceName(recipe.id)}</strong> · {Object.entries(recipe.inputs).map(([resource, amount]) => `${amount} ${resourceName(resource as never)}`).join(' + ')}
          </button></li>
        })}
      </ul>}
    </section>
  </div>
}
