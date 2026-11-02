import { describe, expect, it } from 'vitest'
import { DOWNLOADS, detectPlatform, downloadUrl, recommendedFor } from './downloads'

describe('downloads', () => {
  it('escolhe a versão certa para cada dispositivo', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows')
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux')
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (X11; CrOS x86_64)')).toBeNull()
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBeNull()
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBeNull()
  })
  it('recomenda o instalador no Windows, o zip no Linux e o APK no Android', () => {
    expect(recommendedFor('windows')?.file).toMatch(/Instalador.*\.exe$/)
    expect(recommendedFor('linux')?.file).toMatch(/\.zip$/)
    expect(recommendedFor('android')?.file).toMatch(/\.apk$/)
    expect(recommendedFor(null)).toBeNull()
  })
  it('todos os links apontam para o release do repositório', () => {
    for (const item of DOWNLOADS) expect(downloadUrl(item)).toMatch(/^https:\/\/github\.com\/CalopSenior\/mmc-magia-metal-combustao\/releases\/download\/v[\d.]+\/MMC-/)
  })
})
