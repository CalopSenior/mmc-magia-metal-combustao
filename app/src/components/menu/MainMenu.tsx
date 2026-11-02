import { useEffect, useRef } from 'react'
import { BookOpen,Download,GraduationCap,Play, ScrollText, Settings2 } from 'lucide-react'

const EMBERS = Array.from({ length: 18 }, (_, index) => ({ left: `${(index * 53) % 100}%`, delay: `${(index * 1.7) % 9}s`, duration: `${7 + (index % 5)}s` }))

export function MainMenu({ onPlay, onSettings, onCredits,onCodex,onHelp,onDownloads }: { onPlay: () => void; onSettings: () => void; onCredits: () => void;onCodex:()=>void;onHelp:()=>void;onDownloads:()=>void }) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => { first.current?.focus({ preventScroll: true }) }, [])
  return <main className="menu-shell" aria-labelledby="game-title">
    <div className="menu-embers" aria-hidden="true">
      {EMBERS.map((ember, index) => <i key={index} style={{ left: ember.left, animationDelay: ember.delay, animationDuration: ember.duration }} />)}
    </div>
    <div className="menu-inner">
      <header className="menu-title">
        <div className="rune" aria-hidden="true">ᛗ</div>
        <h1 id="game-title">M.M.C.</h1>
        <p>Magia · Metal · Combustão</p>
      </header>
      <nav className="menu-stack" aria-label="Menu principal">
        <button ref={first} type="button" className="menu-button primary" onClick={onPlay}><Play aria-hidden="true" /> Jogar</button>
        <button type="button" className="menu-button" onClick={onCodex}><BookOpen aria-hidden="true"/> Códice</button>
        <button type="button" className="menu-button" onClick={onHelp}><GraduationCap aria-hidden="true"/> Como jogar</button>
        <button type="button" className="menu-button" onClick={onDownloads}><Download aria-hidden="true"/> Downloads</button>
        <button type="button" className="menu-button" onClick={onSettings}><Settings2 aria-hidden="true" /> Configurações</button>
        <button type="button" className="menu-button" onClick={onCredits}><ScrollText aria-hidden="true" /> Créditos</button>
      </nav>
      <p className="menu-footer">Automação industrial-mágica para aprender tabuada, MMC e MDC.<br />Os saves ficam somente neste navegador.</p>
    </div>
  </main>
}
