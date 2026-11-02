import { ArrowLeft, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COORDINATOR, PRACTISED_TOPICS, SUPERVISOR, SUPPORTERS, TEAM, type Person } from '@/game/content/credits'
import { structureMatrix } from '@/game/content/orientedMatrices'
import { structurePalette } from '@/game/content/pixelMatrices'
import { PORTRAIT_ART } from '@/game/content/portraitArt'
import { CreditsBackdrop } from './CreditsBackdrop'
import { PixelArt } from './PixelArt'

const SCROLL_SPEED = 38
const IDLE_BEFORE_RESUME_MS = 2500

const CHARACTERS = '123456789abcdefghijklmnopqrstuvwxyz'

function decode(id: string) {
  const art = PORTRAIT_ART[id]
  return { palette: art.palette, matrix: art.rows.map((row) => Array.from(row, (char) => (char === '.' ? 0 : CHARACTERS.indexOf(char) + 1))) }
}

function Portrait({ person }: { person: Person }) {
  const { matrix, palette } = useMemo(() => decode(person.id), [person])
  return <span className="credits-frame" role="img" aria-label={`Retrato de ${person.name} como artífice do M.M.C.`}><PixelArt matrix={matrix} palette={palette} scale={1} /></span>
}

function Name({ person }: { person: Person }) {
  return <span className="credits-name"><strong>{person.first}</strong><span>{person.rest}</span></span>
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function CreditsScreen({ onBack }: { onBack: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [reduced] = useState(prefersReducedMotion)
  const [paused, setPaused] = useState(reduced)
  const pausedRef = useRef(paused)
  const idleUntil = useRef(0)
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    let frame = 0, last: number | null = null, position = element.scrollTop
    const touch = () => { idleUntil.current = performance.now() + IDLE_BEFORE_RESUME_MS; position = element.scrollTop }
    const loop = (timestamp: number) => {
      frame = requestAnimationFrame(loop)
      const delta = last === null ? 0 : Math.min(100, timestamp - last)
      last = timestamp
      if (pausedRef.current || timestamp < idleUntil.current || document.hidden) { position = element.scrollTop; return }
      position += SCROLL_SPEED * delta / 1000
      element.scrollTop = position
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') { event.preventDefault(); onBack(); return }
      if (event.key === ' ') { event.preventDefault(); setPaused((value) => !value); return }
      const step = event.key === 'ArrowDown' ? 72 : event.key === 'ArrowUp' ? -72 : event.key === 'PageDown' ? element.clientHeight * 0.85 : event.key === 'PageUp' ? -element.clientHeight * 0.85 : 0
      if (step) { event.preventDefault(); touch(); element.scrollBy({ top: step, behavior: 'smooth' }) }
    }
    element.addEventListener('wheel', touch, { passive: true })
    element.addEventListener('touchstart', touch, { passive: true })
    element.addEventListener('pointerdown', touch, { passive: true })
    window.addEventListener('keydown', onKey)
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('wheel', touch); element.removeEventListener('touchstart', touch); element.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', onKey)
    }
  }, [onBack])

  const golem = useMemo(() => structureMatrix('golem', 0), [])
  const golemPalette = useMemo(() => structurePalette('golem', true), [])

  return <main className="credits-shell" aria-labelledby="credits-title">
    <CreditsBackdrop still={reduced} />
    <div className="credits-veil" aria-hidden="true" />
    <div className="credits-toolbar">
      <button type="button" className="menu-button" onClick={onBack} autoFocus><ArrowLeft aria-hidden="true" /> Voltar</button>
      <button type="button" className="menu-button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Retomar a rolagem' : 'Pausar a rolagem'}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </button>
    </div>
    <div className="credits-scroll" ref={scroller} tabIndex={0} aria-label="Créditos do jogo">
      <header className="credits-hero">
        <div className="rune" aria-hidden="true">ᛗ</div>
        <h1 id="credits-title">Magia &amp; Metal &amp; Combustão</h1>
        <p className="credits-sub">M.M.C. — a fábrica do Resto Zero</p>
        <p className="credits-line">Jogo educativo de Matemática sobre MMC e divisão com resto</p>
        <p className="credits-line">Desenvolvimento próprio durante o projeto PIBID 2024–2026</p>
        <hr className="credits-rule" />
      </header>

      <section aria-labelledby="credits-team">
        <h2 id="credits-team">Idealizado e realizado por:</h2>
        <ul className="credits-grid">
          {TEAM.map((person) => <li key={person.name}><figure><Portrait person={person} /><figcaption><Name person={person} /></figcaption></figure></li>)}
        </ul>
      </section>

      <section aria-labelledby="credits-super">
        <h2 id="credits-super">Sob supervisão de:</h2>
        <figure className="credits-wide"><Portrait person={SUPERVISOR} /><figcaption><Name person={SUPERVISOR} /><small>Professora do Colégio Getúlio Vargas</small></figcaption></figure>
      </section>

      <section aria-labelledby="credits-coord">
        <h2 id="credits-coord">Sob coordenação:</h2>
        <figure className="credits-wide"><Portrait person={COORDINATOR} /><figcaption><Name person={COORDINATOR} /><small>Coordenadora do PIBID Matemática, IFRJ Campus Volta Redonda</small></figcaption></figure>
      </section>

      <section aria-labelledby="credits-support">
        <h2 id="credits-support">Com apoio de</h2>
        <ul className="credits-plates">
          {SUPPORTERS.map((supporter) => <li key={supporter.id}>
            <span className="credits-plate"><PixelArt matrix={supporter.matrix} palette={supporter.palette} scale={supporter.id === 'ifrj' ? 9 : 7} />
              <span className="credits-plate-text">{supporter.id === 'ifrj' ? <><b>INSTITUTO FEDERAL</b><i>Rio de Janeiro</i></> : supporter.id === 'fevre' ? <><b>FEVRE</b><i>Colégio Getúlio Vargas</i></> : <b className="pibid">Pibid</b>}</span>
            </span>
            <span className="sr-only">{supporter.name}</span>
          </li>)}
        </ul>
      </section>

      <section aria-labelledby="credits-learned">
        <h2 id="credits-learned">O que você praticou</h2>
        <ul className="credits-topics">
          {PRACTISED_TOPICS.map((topic) => <li key={topic.title}><strong>{topic.title}</strong><span>{topic.line}</span></li>)}
        </ul>
      </section>

      <footer className="credits-end">
        <PixelArt matrix={golem} palette={golemPalette} scale={7} />
        <p className="credits-thanks">Obrigado por jogar!</p>
        <p className="credits-version">Núcleo 0.6 · Motor próprio: Canvas 2D, sem bibliotecas de jogo</p>
      </footer>
      <p className="credits-hint" aria-hidden="true">↑↓ rolar · Espaço pausa · Enter/Esc voltar</p>
    </div>
  </main>
}
