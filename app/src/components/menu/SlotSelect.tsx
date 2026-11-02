import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Clock, Eye, Flame, HardDrive, Lock, Play, Plus, Sparkles, Stamp, Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SlotId } from '@/game/config'
import { DIFFICULTIES } from '@/game/content/difficulty'
import { createSlot, deleteSlot, readSlotSummaries, type NewWorldMode, type SlotSummary } from '@/game/persistence/slots'
import type { DifficultyId } from '@/game/types'
import { DifficultyPicker } from './DifficultyPicker'

function formatPlayTime(ticks: number): string {
  const minutes = Math.floor(ticks / 20 / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function SlotSelect({ onStart, onBack }: { onStart: (slot: SlotId) => void; onBack: () => void }) {
  const [slots, setSlots] = useState<SlotSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<SlotId | null>(null)
  const [deleting, setDeleting] = useState<SlotId | null>(null)
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyId>('artisan')
  const [mode,setMode]=useState<NewWorldMode>('campaign')

  const refresh = useCallback(async () => {
    try { setSlots(await readSlotSummaries()); setError(null) }
    catch (cause) { setSlots([]); setError(cause instanceof Error ? cause.message : 'Não foi possível ler os saves deste navegador.') }
  }, [])
  useEffect(() => {
    let active = true
    readSlotSummaries().then((list) => { if (active) setSlots(list) }).catch((cause: unknown) => {
      if (!active) return
      setSlots([])
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler os saves deste navegador.')
    })
    return () => { active = false }
  }, [])

  const create = async () => {
    if (!creating) return
    try { await createSlot(creating, name || 'Engenheiro', difficulty,mode); const slot = creating; setCreating(null); onStart(slot) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar o save.') }
  }

  const remove = async () => {
    if (!deleting) return
    try { await deleteSlot(deleting) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível apagar o save.') }
    setDeleting(null)
    await refresh()
  }

  return <main className="menu-shell" aria-labelledby="slots-title">
    <div className="menu-inner" style={{ justifyContent: 'flex-start' }}>
      <header className="menu-title">
        <h1 id="slots-title" style={{ fontSize: 'clamp(26px,5vw,44px)' }}>Escolha um save</h1>
        <p>Três mundos pessoais e uma exposição viva protegida</p>
      </header>
      {error && <p role="alert" className="forge-panel max-w-xl p-3 text-sm text-[#efb5a6]">{error}</p>}
      <div className="grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(slots ?? [{ id: 'slot-1', state: 'empty' }, { id: 'slot-2', state: 'empty' }, { id: 'slot-3', state: 'empty' }] as SlotSummary[]).map((slot, index) => {
          const level = slot.difficulty ? DIFFICULTIES[slot.difficulty] : null
          return <section key={slot.id} className="forge-panel slot-card" aria-label={`Save ${index + 1}`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg text-[#e9b969]"><HardDrive className="h-4 w-4" aria-hidden="true" /> Save {index + 1}</h2>
              {level && <span className="pill" style={{ color: level.color }}>{level.name}</span>}
            </div>
            {slot.readOnly?<>
              <span className="pill self-start text-[#a8d8b0]"><Lock className="h-3 w-3"/> Protegido</span>
              <h3 className="text-xl text-[#f4d9a0]">{slot.name}</h3>
              <p className="flex-1 text-sm leading-relaxed text-[#c5b69c]">Uma cidade-fábrica em atividade: extração, fundição, transmutação e longas rotas convergem para os gnomos em (0, 0). Explore e inspecione sem alterar a obra.</p>
              <Button type="button" className="h-12 bg-[#35523b] text-[#e4f3cd] hover:bg-[#42694b]" onClick={()=>onStart(slot.id)}><Eye className="h-4 w-4"/> Visitar exposição</Button>
            </>:slot.state === 'empty' && <>
              <p className="flex-1 text-sm text-[#c5b69c]">Crie uma campanha com objetivos ou uma Oficina livre para experimentar.</p>
              <Button type="button" className="h-12 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]" disabled={slots === null} onClick={() => { setName(''); setDifficulty('artisan');setMode('campaign'); setCreating(slot.id) }}><Plus className="h-4 w-4" /> Novo mundo</Button>
            </>}
            {slot.state === 'corrupt' && <>
              <p className="flex-1 text-sm text-[#efb5a6]">Este save está inválido ou foi criado por uma versão incompatível. Você pode apagá-lo para reutilizar o espaço.</p>
              <Button type="button" variant="outline" className="h-12 border-[#815247] bg-transparent text-[#efb5a6] hover:bg-[#3b2824]" onClick={() => setDeleting(slot.id)}><Trash2 className="h-4 w-4" /> Apagar</Button>
            </>}
            {slot.state === 'ready' && !slot.readOnly && <>
              <div>
                <p className="text-xl text-[#f4d9a0]">{slot.name}</p>
                <p className="text-sm text-[#c5b69c]">{slot.modeLabel}</p>
              </div>
              <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-sm text-[#dfd2b9]">
                <dt className="flex items-center gap-1 text-[#b0a18a]"><Flame className="h-3.5 w-3.5" aria-hidden="true" /> Contratos</dt><dd className="text-right">{slot.completed}/{slot.totalContracts}</dd>
                <dt className="flex items-center gap-1 text-[#b0a18a]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Éter</dt><dd className="text-right">{slot.ether}</dd>
                <dt className="flex items-center gap-1 text-[#b0a18a]"><Stamp className="h-3.5 w-3.5" aria-hidden="true" /> Selos</dt><dd className="text-right">{slot.seals}</dd>
                <dt className="flex items-center gap-1 text-[#b0a18a]"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Tempo</dt><dd className="text-right">{formatPlayTime(slot.playTicks)}</dd>
              </dl>
              <p className="text-xs text-[#8e7f63]">Salvo em {formatDate(slot.savedAt)}</p>
              <div className="flex gap-2">
                <Button type="button" className="h-12 flex-1 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]" onClick={() => onStart(slot.id)}><Play className="h-4 w-4" /> Continuar</Button>
                <Button type="button" variant="outline" className="h-12 w-12 border-[#815247] bg-transparent text-[#efb5a6] hover:bg-[#3b2824]" onClick={() => setDeleting(slot.id)} aria-label={`Apagar o save ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </>}
          </section>
        })}
      </div>
      <div className="menu-stack">
        <button type="button" className="menu-button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Voltar</button>
      </div>

      <Dialog open={creating !== null} onOpenChange={(open) => { if (!open) setCreating(null) }}>
        <DialogContent className="forge-panel max-h-[92dvh] max-w-3xl overflow-y-auto border-[#806b4a] bg-[#25211c] text-[#f4ead4]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#f4d9a0]">Novo mundo</DialogTitle>
            <DialogDescription className="text-[#c5b69c]">{mode==='campaign'?'Escolha a complexidade de acordo com o ano escolar. Ela define dicas, dano das máquinas, tamanho das metas e o estilo das provas.':'A Oficina livre começa em um mundo aberto, com todas as máquinas liberadas e sem metas de contrato.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Modo do mundo" className="grid gap-2 sm:grid-cols-2">
              {(['campaign','free'] as const).map(value=><button key={value} role="radio" aria-checked={mode===value} className="difficulty-card" onClick={()=>setMode(value)}>
                <strong className="text-lg text-[#f1cc8c]">{value==='campaign'?'Campanha':'Oficina livre'}</strong>
                <span className="text-sm text-[#c5b69c]">{value==='campaign'?'Contratos, progressão e desafios matemáticos.':'Mundo aberto, todas as máquinas liberadas e experimentação sem metas.'}</span>
              </button>)}
            </div>
            <div>
              <Label htmlFor="player-name" className="text-[#dfd2b9]">Nome do engenheiro</Label>
              <Input id="player-name" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} placeholder="Engenheiro" className="mt-1 h-11 border-[#766348] bg-[#1b1815] text-[#f4ead4]" />
            </div>
            <div hidden={mode==='free'}>
              <p className="mb-2 text-sm text-[#dfd2b9]">Complexidade da campanha</p>
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]" onClick={() => setCreating(null)}>Cancelar</Button>
            <Button type="button" className="h-11 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]" onClick={() => void create()}>{mode==='campaign'?'Começar a campanha':'Criar Oficina livre'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent className="border-[#665746] bg-[#25211c] text-[#f4ead4]">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este save?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#c5b69c]">O progresso, as melhorias do Grimório e a fábrica deste espaço serão removidos deste navegador. Não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="h-11 bg-[#b76852] text-[#fff4ec] hover:bg-[#ca7962]">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </main>
}
