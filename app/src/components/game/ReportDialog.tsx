import { useMemo, useState } from 'react'
import { CheckCircle2, Skull, Sparkles, Stamp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { GameEngine } from '@/game/boot'
import { CONTRACT_BY_ID } from '@/game/content/contracts'
import { DIFFICULTIES, TOPIC_LABELS } from '@/game/content/difficulty'
import { checkAnswer, makeContractQuiz, type QuizQuestion } from '@/game/content/quiz'
import type { EngineSnapshot } from '@/game/types'

function formatTicks(ticks: number): string {
  const seconds = Math.round(ticks / 20)
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
}

function Question({ question, index, engine, answered, correct }: { question: QuizQuestion; index: number; engine: GameEngine | null; answered: boolean; correct: boolean }) {
  const [value, setValue] = useState('')
  const [local, setResult] = useState<'right' | 'wrong' | null>(null)
  const result = local ?? (answered ? (correct ? 'right' : 'wrong') : null)
  const submit = (raw: string) => {
    if (result) return
    const correct = checkAnswer(question, Number(raw.replace(/\./g, '').replace(',', '.')))
    setResult(correct ? 'right' : 'wrong')
    engine?.recordAnswer(index, question.topic, correct)
  }
  return <li className="border border-[#4a3c29] bg-[#1b1815] p-3">
    <p className="text-sm text-[#f4d9a0]"><span className="pill mr-2 text-xs text-[#9fe8ff]">{TOPIC_LABELS[question.topic]}</span>{index + 1}. {question.prompt}</p>
    {question.choices ? <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Alternativas">
      {question.choices.map((choice) => <button key={choice} type="button" disabled={result !== null} onClick={() => { setValue(String(choice)); submit(String(choice)) }}
        className={`min-h-11 border text-sm ${result && choice === question.answer ? 'border-[#8fcf8c] bg-[#1f2d1f] text-[#b9ec91]' : result && String(choice) === value ? 'border-[#e0523f] text-[#ffb3a6]' : 'border-[#63543d] text-[#dfd2b9] hover:bg-[#3b3124]'}`}>{choice.toLocaleString('pt-BR')}</button>)}
    </div> : <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); submit(value) }}>
      <Input inputMode="decimal" value={value} disabled={result !== null} onChange={(event) => setValue(event.target.value)} aria-label={`Resposta da questão ${index + 1}`} className="h-11 max-w-40 border-[#766348] bg-[#25211c] text-[#f4ead4]" />
      <Button type="submit" disabled={result !== null || value.trim() === ''} className="h-11 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]">Responder</Button>
    </form>}
    {result && <p role="status" className={`mt-2 flex items-start gap-2 text-sm ${result === 'right' ? 'text-[#b9ec91]' : 'text-[#ffb3a6]'}`}>
      {result === 'right' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{result === 'right' ? 'Correto! +4 Éter. ' : `A resposta era ${question.answer.toLocaleString('pt-BR')}. `}{question.explanation}</span>
    </p>}
  </li>
}

export function ReportDialog({ snapshot, engine, hubOpen, onHub, onRetry }: { snapshot: EngineSnapshot; engine: GameEngine | null; hubOpen: boolean; onHub: () => void; onRetry: () => void }) {
  const { run, profile } = snapshot
  const finished = run.mode !== 'free' && run.status !== 'active'
  const open = finished && !hubOpen
  const contract = run.contractId ? CONTRACT_BY_ID[run.contractId] : null
  const difficulty = DIFFICULTIES[profile.difficulty]
  const topics = contract?.topics ?? difficulty.topics
  const quiz = useMemo(() => makeContractQuiz(topics, profile.difficulty, `${run.contractId ?? run.endless?.key}:${profile.campaign[run.contractId ?? '']?.attempts ?? 0}:${run.report?.ticks ?? 0}`),
    [topics, profile.difficulty, run.contractId, run.endless?.key, profile.campaign, run.report?.ticks])
  const stats = run.stats
  const cycles = stats.perfectCycles + stats.hungerEvents + stats.clogEvents
  const perfectShare = cycles ? Math.round((stats.perfectCycles / cycles) * 100) : 100
  const won = run.status === 'complete'

  return <Dialog open={open} onOpenChange={() => undefined}>
    <DialogContent showCloseButton={false} className="forge-panel max-h-[94dvh] max-w-3xl overflow-y-auto overflow-x-hidden border-[#806b4a] bg-[#25211c] text-[#f4ead4]" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl text-[#f4d9a0]">{won ? <CheckCircle2 className="h-6 w-6 text-[#8fcf8c]" aria-hidden="true" /> : <Skull className="h-6 w-6 text-[#e0523f]" aria-hidden="true" />}{won ? 'Contrato cumprido!' : 'A fábrica entrou em colapso'}</DialogTitle>
        <DialogDescription className="text-[#c5b69c]">{contract?.name ?? 'Contrato infinito'} · {difficulty.name}</DialogDescription>
      </DialogHeader>

      {won && run.report && <div className="space-y-2">
        <p className="flex flex-wrap items-center gap-3 text-lg text-[#f4d9a0]">
          <span className="flex items-center gap-1"><Sparkles className="h-5 w-5 text-[#9fe8ff]" aria-hidden="true" /> +{run.report.etherReward} Éter</span>
          {run.report.sealed && <span className="flex items-center gap-1 text-[#f2c876]"><Stamp className="h-5 w-5" aria-hidden="true" /> Selo de Perfeição!</span>}
          {run.report.newBest && <span className="pill text-xs text-[#9fe8ff]">novo recorde</span>}
        </p>
        <p className="text-sm text-[#c5b69c]">Tempo: {formatTicks(run.report.ticks)}{contract ? ` (referência ${formatTicks(contract.par)})` : ''}. O Éter cresce quando você termina antes da referência.</p>
      </div>}
      {!won && <p className="text-sm text-[#efb5a6]">Máquinas quebradas e monstros deixaram a estabilidade abaixo de 10% por tempo demais. Releia os avisos do Diário do Engenheiro: cada erro mostra a conta (quantidade ÷ lote) que o causou.</p>}

      <section aria-label="Relatório matemático" className="border border-[#4a3c29] bg-[#1b1815] p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e9b969]">Relatório da fábrica</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[#dfd2b9] sm:grid-cols-3">
          <div><dt className="text-[#b0a18a]">Ciclos perfeitos (resto 0)</dt><dd className="text-[#b9ec91]">{stats.perfectCycles} ({perfectShare}%)</dd></div>
          <div><dt className="text-[#b0a18a]">Fome de Lote (faltou)</dt><dd>{stats.hungerEvents}</dd></div>
          <div><dt className="text-[#b0a18a]">Entupimentos (sobrou)</dt><dd>{stats.clogEvents}</dd></div>
          <div><dt className="text-[#b0a18a]">Fusões</dt><dd>{stats.fusions}</dd></div>
          <div><dt className="text-[#b0a18a]">Monstros derrotados</dt><dd>{stats.monstersSlain}</dd></div>
          <div><dt className="text-[#b0a18a]">Dano sofrido</dt><dd>{Math.round(stats.damageTaken)}</dd></div>
          <div><dt className="text-[#b0a18a]">Consertos</dt><dd>{stats.repairs}</dd></div>
          <div><dt className="text-[#b0a18a]">Éter Puro ganho</dt><dd>{Math.round(stats.pureEther)}</dd></div>
          <div><dt className="text-[#b0a18a]">Máquinas no fim</dt><dd>{snapshot.structureCount}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-[#9fe8ff]">{perfectShare === 100 ? 'Nenhum erro de lote: é exatamente isso que o Selo de Perfeição pede.' : `Cada ciclo errado é uma divisão com resto. Procure ${stats.hungerEvents > stats.clogEvents ? 'lotes menores que o apetite da máquina' : 'lotes que não são múltiplos do apetite'} na próxima vez.`}</p>
      </section>

      {won && <section aria-label="Prova da Guilda">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#e9b969]">Prova da Guilda — vale +4 Éter por acerto</h3>
        <ol className="space-y-2">{quiz.map((question, index) => <Question key={`${index}-${question.prompt}`} question={question} index={index} engine={engine} answered={((run.report?.quizAnswered ?? 0) & (1 << index)) !== 0} correct={((run.report?.quizCorrect ?? 0) & (1 << index)) !== 0} />)}</ol>
      </section>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-12 flex-1 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]" onClick={onHub}>{won ? 'Escolher o próximo contrato' : 'Voltar ao quartel'}</Button>
        <Button type="button" variant="outline" className="h-12 flex-1 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]" onClick={onRetry}>{won ? 'Jogar este contrato de novo' : 'Tentar de novo'}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
