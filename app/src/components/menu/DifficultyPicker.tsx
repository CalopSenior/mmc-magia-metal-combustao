import { DIFFICULTY_LIST } from '@/game/content/difficulty'
import type { DifficultyId } from '@/game/types'

/** The complexity selector: four levels aligned with the school years in the GDD target audience. */
export function DifficultyPicker({ value, onChange, compact = false }: { value: DifficultyId; onChange: (value: DifficultyId) => void; compact?: boolean }) {
  return <div role="radiogroup" aria-label="Complexidade" className={`grid gap-2 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}
    onKeyDown={(event) => {
      const index = DIFFICULTY_LIST.findIndex((item) => item.id === value)
      const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
      if (!step) return
      event.preventDefault()
      onChange(DIFFICULTY_LIST[(index + step + DIFFICULTY_LIST.length) % DIFFICULTY_LIST.length].id)
    }}>
    {DIFFICULTY_LIST.map((item) => <button key={item.id} type="button" role="radio" aria-checked={value === item.id} tabIndex={value === item.id ? 0 : -1}
      className="difficulty-card" style={{ ['--accent' as string]: item.color }} onClick={() => onChange(item.id)}>
      <span className="flex items-center justify-between gap-2">
        <strong className="text-lg" style={{ color: item.color }}>{item.name}</strong>
        <span className="pill text-xs" style={{ color: item.color }}>{item.grades}</span>
      </span>
      <span className="text-sm text-[#f4d9a0]">{item.tagline}</span>
      <span className="text-xs leading-relaxed text-[#c5b69c]">{item.focus}</span>
      {!compact && <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[#b7a991]">{item.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
    </button>)}
  </div>
}
