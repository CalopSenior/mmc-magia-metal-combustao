import { useState } from 'react'
import type { LessonDemo as DemoId } from '@/game/content/lessons'
import { commonMultiples, describeDivision, divisors, divide, factorize, formatFactorization, formatScientific, gcd, isPrime, lcm, multiples, simplifyFraction } from '@/game/math/number'

function Num({ label, value, onChange, min = 1, max = 99 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <label className="flex items-center gap-2 text-sm text-[#dfd2b9]">
    <span>{label}</span>
    <input type="number" inputMode="numeric" min={min} max={max} value={value}
      onChange={(event) => onChange(Math.max(min, Math.min(max, Math.floor(Number(event.target.value) || min))))}
      className="h-10 w-20 border border-[#766348] bg-[#1b1815] px-2 text-[#f4ead4]" />
  </label>
}

function Cells({ values, mark, tone = '#d3a958' }: { values: readonly number[]; mark?: (value: number) => boolean; tone?: string }) {
  return <div className="flex flex-wrap gap-1">
    {values.map((value) => <span key={value} className="grid min-h-8 min-w-8 place-items-center border px-1 text-xs"
      style={mark?.(value) ? { borderColor: tone, background: `${tone}33`, color: '#fff3d0' } : { borderColor: '#4a3c29', color: '#c5b69c' }}>{value}</span>)}
  </div>
}

function Times() {
  const [n, setN] = useState(7)
  return <div className="space-y-2">
    <Num label="Lote (tabuada do)" value={n} onChange={setN} min={2} max={9} />
    <Cells values={Array.from({ length: 10 }, (_, index) => n * (index + 1))} mark={(value) => value % 2 === 0} tone="#7de3da" />
    <p className="text-xs text-[#b0a18a]">{Array.from({ length: 5 }, (_, i) => `${n} × ${i + 1} = ${n * (i + 1)}`).join(' · ')}…</p>
  </div>
}

function Division() {
  const [amount, setAmount] = useState(9)
  const [lot, setLot] = useState(7)
  const { quotient, remainder } = divide(amount, lot)
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3"><Num label="Chegam" value={amount} onChange={setAmount} max={60} /><Num label="Lote" value={lot} onChange={setLot} min={2} max={13} /></div>
    <div className="flex flex-wrap gap-1" aria-hidden="true">
      {Array.from({ length: amount }, (_, index) => <i key={index} className="h-5 w-5 border" style={{ background: index < quotient * lot ? (Math.floor(index / lot) % 2 ? '#c9a45a' : '#e0b76d') : '#b983ff', borderColor: '#1b1815' }} />)}
    </div>
    <p className="text-sm" style={{ color: remainder === 0 ? '#b9ec91' : amount < lot ? '#ffb3a6' : '#ffd37a' }}>
      {describeDivision(amount, lot)} — {remainder === 0 ? 'resto zero: eficiência de 100% e Éter Puro!' : amount < lot ? `Fome de Lote: faltam ${lot - amount}.` : `Entupimento: ${remainder} cristalizam (as peças roxas).`}
    </p>
  </div>
}

function Multiples() {
  const [a, setA] = useState(4)
  const [b, setB] = useState(6)
  const limit = Math.max(lcm(a, b) * 2, 24)
  const common = commonMultiples(a, b, 3)
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3"><Num label="Lote A" value={a} onChange={setA} min={2} max={13} /><Num label="Lote B" value={b} onChange={setB} min={2} max={13} /></div>
    <p className="text-xs text-[#b0a18a]">Múltiplos de {a}:</p>
    <Cells values={multiples(a, limit)} mark={(value) => common.includes(value)} />
    <p className="text-xs text-[#b0a18a]">Múltiplos de {b}:</p>
    <Cells values={multiples(b, limit)} mark={(value) => common.includes(value)} />
    <p className="text-sm text-[#9fe8ff]">MMC({a}, {b}) = {lcm(a, b)} → {lcm(a, b) / a} lote(s) de {a} e {lcm(a, b) / b} lote(s) de {b}.</p>
  </div>
}

function Gcd() {
  const [a, setA] = useState(12)
  const [b, setB] = useState(18)
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3"><Num label="Número A" value={a} onChange={setA} max={120} /><Num label="Número B" value={b} onChange={setB} max={120} /></div>
    <p className="text-xs text-[#b0a18a]">Divisores de {a}:</p><Cells values={divisors(a)} mark={(value) => b % value === 0} />
    <p className="text-xs text-[#b0a18a]">Divisores de {b}:</p><Cells values={divisors(b)} mark={(value) => a % value === 0} />
    <p className="text-sm text-[#9fe8ff]">MDC({a}, {b}) = {gcd(a, b)} · MMC = {lcm(a, b)} · conferindo: {gcd(a, b)} × {lcm(a, b)} = {gcd(a, b) * lcm(a, b)} = {a} × {b}</p>
  </div>
}

function Primes() {
  const [n, setN] = useState(13)
  return <div className="space-y-2">
    <Num label="Teste o número" value={n} onChange={setN} min={1} max={400} />
    <p className="text-sm" style={{ color: isPrime(n) ? '#b9ec91' : '#ffd37a' }}>{isPrime(n) ? `${n} é primo: só tem os divisores 1 e ${n}.` : n < 2 ? '1 não é primo.' : `${n} não é primo: divisores ${divisors(n).join(', ')}.`}</p>
    <p className="text-xs text-[#b0a18a]">Portal Modular: {n >= 2 && (isPrime(n) || n % 12 === 0) ? 'passa' : 'não passa'} (primo ou múltiplo de 12).</p>
    <Cells values={Array.from({ length: 60 }, (_, index) => index + 1)} mark={isPrime} tone="#7ccf6e" />
  </div>
}

function Factor() {
  const [n, setN] = useState(60)
  const [m, setM] = useState(72)
  const fa = new Map(factorize(n)), fb = new Map(factorize(m))
  const primes = [...new Set([...fa.keys(), ...fb.keys()])].sort((x, y) => x - y)
  const mmc = primes.reduce((product, p) => product * p ** Math.max(fa.get(p) ?? 0, fb.get(p) ?? 0), 1)
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3"><Num label="Número A" value={n} onChange={setN} min={2} max={999} /><Num label="Número B" value={m} onChange={setM} min={2} max={999} /></div>
    <p className="text-sm text-[#dfd2b9]">{n} = {formatFactorization(n)}</p>
    <p className="text-sm text-[#dfd2b9]">{m} = {formatFactorization(m)}</p>
    <p className="text-sm text-[#9fe8ff]">MMC (maiores expoentes) = {primes.map((p) => `${p}^${Math.max(fa.get(p) ?? 0, fb.get(p) ?? 0)}`).join(' × ')} = {mmc}</p>
    <p className="text-sm text-[#9fe8ff]">MDC (menores expoentes) = {gcd(n, m)}</p>
  </div>
}

function Power10() {
  const [mantissa, setMantissa] = useState(3.6)
  const [exponent, setExponent] = useState(3)
  const value = Math.round(mantissa * 10 ** exponent)
  return <div className="space-y-2">
    <label className="flex items-center gap-2 text-sm text-[#dfd2b9]">Mantissa
      <input type="range" min="1" max="9.9" step="0.1" value={mantissa} onChange={(event) => setMantissa(Number(event.target.value))} aria-label="Mantissa" className="w-40 accent-[#d3a958]" /> {mantissa.toFixed(1).replace('.', ',')}</label>
    <label className="flex items-center gap-2 text-sm text-[#dfd2b9]">Expoente
      <input type="range" min="0" max="6" step="1" value={exponent} onChange={(event) => setExponent(Number(event.target.value))} aria-label="Expoente" className="w-40 accent-[#d3a958]" /> {exponent}</label>
    <p className="text-lg text-[#ffd37a]">{value.toLocaleString('pt-BR')} = {formatScientific(value)}</p>
    <p className="text-xs text-[#b0a18a]">Runa × {10 ** Math.min(exponent, 3)}: cada Caixa Rúnica vale {(10 ** Math.min(exponent, 3)).toLocaleString('pt-BR')}.</p>
  </div>
}

function Fractions() {
  const [n, setN] = useState(14)
  const [d, setD] = useState(21)
  const [outputs, setOutputs] = useState(3)
  const simple = simplifyFraction(n, d)
  const split = divide(14, outputs)
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-3"><Num label="Numerador" value={n} onChange={setN} max={99} /><Num label="Denominador" value={d} onChange={setD} max={99} /></div>
    <p className="text-sm text-[#9fe8ff]">{n}/{d} = {simple.numerator}/{simple.denominator} (dividindo por MDC {gcd(n, d)})</p>
    <Num label="Saídas do Prisma" value={outputs} onChange={setOutputs} min={2} max={5} />
    <p className="text-sm text-[#dfd2b9]">Um lote de 14 em {outputs} saídas: {describeDivision(14, outputs)} → {split.quotient} em cada, {split.remainder} ficam retidos.</p>
  </div>
}

export function LessonDemoView({ demo }: { demo: DemoId }) {
  return <div className="border border-[#4a3c29] bg-[#1b1815] p-3" data-testid={`demo-${demo}`}>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#e9b969]">Experimente</h4>
    {demo === 'times' && <Times />}
    {demo === 'division' && <Division />}
    {demo === 'multiples' && <Multiples />}
    {demo === 'gcd' && <Gcd />}
    {demo === 'primes' && <Primes />}
    {demo === 'factor' && <Factor />}
    {demo === 'power10' && <Power10 />}
    {demo === 'fractions' && <Fractions />}
  </div>
}
