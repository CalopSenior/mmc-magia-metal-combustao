import { useState } from 'react'
import { Eye, Lock } from 'lucide-react'
import { ORE_LIST } from '@/game/content/ores'
import { glyphCharacter, resourceGlyph } from '@/game/content/resources'
import { lcm, multiples } from '@/game/math/number'
import type { OreId } from '@/game/types'

const LOT_ORES = ORE_LIST.filter((ore) => typeof ore.baseLot === 'number')

/**
 * Oráculo do MMC: two rulers of multiples. It never prints the answer — the student clicks a number and gets feedback,
 * which is the "ponto de encontro" hunt of GDD 8 (Ramo 4, nível 2).
 */
export function OracleView({ unlocked }: { unlocked: boolean }) {
  const [first, setFirst] = useState<OreId>('rusted-copper')
  const [second, setSecond] = useState<OreId>('fossil-coal')
  const [guess, setGuess] = useState<number | null>(null)
  const lotA = LOT_ORES.find((ore) => ore.id === first)!.baseLot as number
  const lotB = LOT_ORES.find((ore) => ore.id === second)!.baseLot as number
  const limit = Math.min(lotA * lotB, 150)
  const rowA = multiples(lotA, Math.max(limit, lotA * 8)).slice(0, 14)
  const rowB = multiples(lotB, Math.max(limit, lotB * 8)).slice(0, 14)

  if (!unlocked) return <div className="mx-auto max-w-lg space-y-2 p-8 text-center">
    <Lock className="mx-auto h-8 w-8 text-[#e0a46b]" aria-hidden="true" />
    <h3 className="text-xl text-[#f4d9a0]">Oráculo do MMC</h3>
    <p className="text-sm text-[#c5b69c]">Adquira o Oráculo do MMC no Grande Grimório (Ramo 4, Visão Arcana, nível 2) para ver as réguas de múltiplos de dois minérios.</p>
  </div>

  const feedback = guess === null ? null
    : guess % lotA === 0 && guess % lotB === 0
      ? guess === lcm(lotA, lotB) ? { tone: '#b9ec91', text: `${guess} é o ponto de encontro: o menor múltiplo comum de ${lotA} e ${lotB}.` }
        : { tone: '#ffd37a', text: `${guess} é múltiplo de ${lotA} e de ${lotB}, mas existe um menor. Continue procurando!` }
      : { tone: '#ffb3a6', text: `${guess} não é múltiplo de ${guess % lotA ? lotA : lotB}${guess % lotA && guess % lotB ? ` nem de ${lotB}` : ''} (${guess} ÷ ${guess % lotA ? lotA : lotB} deixa resto ${guess % (guess % lotA ? lotA : lotB)}).` }

  const select = (value: OreId, set: (id: OreId) => void, label: string) => <label className="flex items-center gap-2 text-sm text-[#dfd2b9]">
    <span>{label}</span>
    <select value={value} onChange={(event) => { set(event.target.value as OreId); setGuess(null) }} className="h-10 border border-[#766348] bg-[#1b1815] px-2 text-[#f4ead4]">
      {LOT_ORES.map((ore) => <option key={ore.id} value={ore.id}>{glyphCharacter(resourceGlyph(ore.id))} {ore.shortName} (lote {ore.baseLot as number})</option>)}
    </select>
  </label>

  const ruler = (row: number[], lot: number, name: string) => <div>
    <p className="mb-1 text-xs text-[#b0a18a]">Múltiplos de {lot} — {name}</p>
    <div className="flex flex-wrap gap-1">
      {row.map((value) => <button key={value} type="button" onClick={() => setGuess(value)} aria-pressed={guess === value}
        className={`grid min-h-9 min-w-10 place-items-center border px-1 text-xs ${guess === value ? 'border-[#e9b969] bg-[#4a3c29] text-[#fff3d0]' : 'border-[#4a3c29] text-[#c5b69c] hover:bg-[#3b3124]'}`}>{value}</button>)}
    </div>
  </div>

  return <div className="space-y-3 p-4 sm:p-6">
    <h3 className="flex items-center gap-2 text-xl text-[#f4d9a0]"><Eye className="h-5 w-5 text-[#9fe8ff]" aria-hidden="true" /> Oráculo do MMC</h3>
    <p className="text-sm text-[#c5b69c]">Escolha dois minérios e clique nos números das réguas para procurar o ponto onde os dois lotes se encontram. O Oráculo avisa se o número serve, mas não entrega a resposta.</p>
    <div className="flex flex-wrap gap-4">{select(first, setFirst, 'Minério A')}{select(second, setSecond, 'Minério B')}</div>
    {ruler(rowA, lotA, LOT_ORES.find((ore) => ore.id === first)!.name)}
    {ruler(rowB, lotB, LOT_ORES.find((ore) => ore.id === second)!.name)}
    <p role="status" className="min-h-6 text-sm" style={{ color: feedback?.tone ?? '#c5b69c' }}>{feedback?.text ?? 'Clique em um número para testar.'}</p>
  </div>
}
