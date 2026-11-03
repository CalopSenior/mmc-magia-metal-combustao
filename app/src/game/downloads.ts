/** Where the installers live: assets of a GitHub Release, so the game itself stays a small web page. */
export const REPOSITORY = 'CalopSenior/mmc-magia-metal-combustao'
export const RELEASE_VERSION = '1.1.0'
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`

export type PlatformId = 'windows' | 'linux' | 'android'

export interface DownloadItem {
  readonly id: string
  readonly platform: PlatformId
  readonly label: string
  readonly detail: string
  readonly file: string
  readonly size: string
}

export const DOWNLOADS: readonly DownloadItem[] = [
  { id: 'windows-setup', platform: 'windows', label: 'Windows 10 e 11 · instalador', detail: 'Instala em uma pasta à escolha, sem pedir administrador.', file: `MMC-Instalador-${RELEASE_VERSION}.exe`, size: '129 MB' },
  { id: 'windows-portable', platform: 'windows', label: 'Windows 10 e 11 · portátil', detail: 'Um único arquivo que roda sem instalar.', file: `MMC-Portatil-${RELEASE_VERSION}.exe`, size: '116 MB' },
  { id: 'linux', platform: 'linux', label: 'Linux x64 · pacote zip', detail: 'Descompacte e rode sh instalar-linux.sh (instala no seu usuário, sem sudo).', file: `MMC-${RELEASE_VERSION}-linux-x64.zip`, size: '133 MB' },
  { id: 'android', platform: 'android', label: 'Android 7.0 ou superior · APK', detail: 'Permita instalar apps de fontes desconhecidas quando o Android pedir.', file: `MMC-${RELEASE_VERSION}-android.apk`, size: '3,5 MB' },
]

export function downloadUrl(item: DownloadItem): string {
  return `${REPOSITORY_URL}/releases/download/v${RELEASE_VERSION}/${item.file}`
}

/** Reads a user-agent string (and the optional client-hints platform) and says which build suits the device. */
export function detectPlatform(userAgent: string, hintedPlatform = ''): PlatformId | null {
  const text = `${userAgent} ${hintedPlatform}`.toLowerCase()
  if (text.includes('android')) return 'android'
  if (/iphone|ipad|ipod|mac os|macintosh|cros/.test(text)) return null
  if (text.includes('windows') || text.includes('win32') || text.includes('win64')) return 'windows'
  if (text.includes('linux') || text.includes('x11')) return 'linux'
  return null
}

export function currentPlatform(): PlatformId | null {
  if (typeof navigator === 'undefined') return null
  const hints = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? ''
  return detectPlatform(navigator.userAgent, hints)
}

/** The build the big button downloads: the installer on Windows, the zip on Linux, the APK on Android. */
export function recommendedFor(platform: PlatformId | null): DownloadItem | null {
  return platform ? DOWNLOADS.find((item) => item.platform === platform) ?? null : null
}

export function startDownload(item: DownloadItem): void {
  const link = document.createElement('a')
  link.href = downloadUrl(item)
  link.download = item.file
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
