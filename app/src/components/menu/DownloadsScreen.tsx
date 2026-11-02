import { ArrowLeft, Download, Github } from 'lucide-react'
import { DOWNLOADS, REPOSITORY_URL, currentPlatform, recommendedFor, startDownload, type PlatformId } from '@/game/downloads'

const NAMES: Record<PlatformId, string> = { windows: 'Windows', linux: 'Linux', android: 'Android' }

export function DownloadsScreen({ onBack }: { onBack: () => void }) {
  const platform = currentPlatform(), best = recommendedFor(platform)
  return <main className="menu-shell downloads-screen"><div className="menu-inner">
    <header className="menu-title"><h1>Downloads</h1><p>Leve o M.M.C. para o seu dispositivo</p></header>
    <section className="forge-panel downloads-panel" aria-label="Download recomendado">
      {best
        ? <>
          <p>Detectamos <strong>{NAMES[best.platform]}</strong>. O botão baixa a versão certa para este aparelho.</p>
          <button type="button" className="menu-button primary downloads-main" onClick={() => startDownload(best)}><Download aria-hidden="true" /> Baixar para {NAMES[best.platform]} <small>{best.size}</small></button>
        </>
        : <p>Não há instalador para este dispositivo (macOS, iOS e Chromebook). Você pode jogar direto no navegador ou escolher uma das versões abaixo para outro aparelho.</p>}
    </section>
    <section className="downloads-list" aria-label="Todas as versões">
      {DOWNLOADS.map((item) => <article key={item.id} className="forge-panel">
        <div><h2>{item.label}</h2><p>{item.detail}</p></div>
        <button type="button" className="menu-button" onClick={() => startDownload(item)} aria-label={`Baixar ${item.label}`}><Download aria-hidden="true" /> {item.size}</button>
      </article>)}
    </section>
    <nav className="how-footer" aria-label="Sair de Downloads">
      <button type="button" className="menu-button" onClick={onBack}><ArrowLeft aria-hidden="true" />Voltar</button>
      <a className="menu-button" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true" />Código no GitHub</a>
    </nav>
  </div></main>
}
