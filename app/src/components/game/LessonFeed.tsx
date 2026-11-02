import { ChevronDown, ChevronUp, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { useCompactLandscape } from '@/hooks/use-compact-landscape'

export interface LessonEntry { id: number; text: string }

function tone(text: string): string {
  if (/perfeito|perfeita|Resto zero|absorveu|reciclada/i.test(text)) return '#b9ec91'
  if (/Fome|Entupimento|Colapso|Ricochete|recusou|quebrou/i.test(text)) return '#ffb3a6'
  return '#f4e7c4'
}

/** "Diário do Engenheiro": every machine error or success comes with the division that explains it. */
export function LessonFeed({ entries }: { entries: readonly LessonEntry[] }) {
  const compact=useCompactLandscape()
  const [choice,setChoice]=useState<boolean|null>(null)
  const open=choice ?? !compact
  if (entries.length === 0) return null
  const shown = open ? entries.slice(-5) : entries.slice(-1)
  return <section className="forge-panel lesson-feed" data-expanded={open} aria-label="Diário do Engenheiro" data-testid="lesson-feed">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm text-[#e9b969]"><GraduationCap className="h-4 w-4" aria-hidden="true" /> Diário do Engenheiro</h2>
      <button type="button" onClick={() => setChoice(!open)} className="grid h-8 w-8 place-items-center text-[#d0c3aa]" aria-expanded={open} aria-label={open ? 'Recolher o diário' : 'Expandir o diário'}>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
    </div>
    <ul className="mt-1 space-y-1" hidden={compact && !open} aria-live="polite">
      {shown.map((entry) => <li key={entry.id} className="text-[13px] leading-snug" style={{ color: tone(entry.text) }}>{entry.text}</li>)}
    </ul>
  </section>
}
