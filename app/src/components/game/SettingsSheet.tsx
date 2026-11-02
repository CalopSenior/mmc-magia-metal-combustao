import { useRef, type ChangeEvent, type FormEvent } from 'react'
import { Database, Download, Gauge, Keyboard, Map, RotateCcw, Save, Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { ChunkDistance, EngineSnapshot, SaveStatus, SimulationSpeed } from '@/game/types'
import type { VisualPreferences } from '@/game/visualPreferences'
import { AccessibilitySettings } from './AccessibilitySettings'
import { AudioSettings } from './AudioSettings'

interface SettingsSheetProps {
  readOnly?:boolean
  preferences: VisualPreferences
  onPreferences: (patch: Partial<VisualPreferences>) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: EngineSnapshot
  seed: string
  onSeedChange: (seed: string) => void
  onRegenerate: () => void
  onSpeed: (speed: SimulationSpeed) => void
  onShowCoordinates: (show: boolean) => void
  onChunkDistance: (distance: ChunkDistance) => void
  onSave: () => void
  onExport: () => void
  onImport: (file: File) => void
  onReset: () => void
  saveStatus: SaveStatus
  offlineReady: boolean
  freeMode: boolean
}

const SAVE_LABELS: Record<SaveStatus, string> = {
  loading: 'Lendo banco local',
  dirty: 'Alterações pendentes',
  saving: 'Gravando no IndexedDB',
  saved: 'Save local sincronizado',
  error: 'Falha na persistência local',
}

export function SettingsSheet({
  preferences,
  onPreferences,
  open,
  onOpenChange,
  snapshot,
  seed,
  onSeedChange,
  onRegenerate,
  onSpeed,
  onShowCoordinates,
  onChunkDistance,
  onSave,
  onExport,
  onImport,
  onReset,
  saveStatus,
  offlineReady,
  freeMode,
  readOnly=false,
}: SettingsSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const submitSeed = (event: FormEvent) => {
    event.preventDefault()
    onRegenerate()
  }

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImport(file)
    event.target.value = ''
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="forge-panel settings-panel w-[94vw] max-w-md border-[#63543d] bg-[#25211c] p-0 text-[#f4ead4] sm:w-full short-landscape:!w-[26rem] short-landscape:max-w-[80vw]">
        <SheetHeader className="border-b border-[#4a3c29] px-5 py-5 pr-14 text-left short-landscape:py-3">
          <SheetTitle className="font-display text-xl text-[#f4d9a0]">Ajustes da oficina</SheetTitle>
          <SheetDescription className="text-[#c5b69c] short-landscape:hidden">
            Configuração da fábrica, do relógio e do save deste espaço.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-8 short-landscape:space-y-4 short-landscape:pb-4">
          <AudioSettings />
          <div className="border-t border-[#4a3c29]" />
          <AccessibilitySettings preferences={preferences} onChange={onPreferences} />
          <section className="space-y-4" aria-labelledby="simulation-settings">
            <div className="flex items-center gap-2 text-[#e9b969]">
              <Gauge className="h-4 w-4" />
              <h2 id="simulation-settings" className="text-sm font-semibold uppercase tracking-wider">Simulação</h2>
            </div>
            <div>
              <Label className="mb-2 block text-[#dfd2b9]">Velocidade do relógio</Label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 4] as const).map((speed) => (
                  <Button
                    key={speed}
                    type="button"
                    variant={snapshot.speed === speed ? 'default' : 'outline'}
                    onClick={() => onSpeed(speed)}
                    aria-pressed={snapshot.speed === speed}
                    className={snapshot.speed === speed ? 'h-11 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]' : 'h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]'}
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-4">
              <Label htmlFor="coordinates-switch" className="cursor-pointer text-[#dfd2b9]">Coordenadas das células</Label>
              <Switch
                id="coordinates-switch"
                checked={snapshot.showCoordinates}
                onCheckedChange={onShowCoordinates}
                aria-label="Exibir coordenadas das células"
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-[#4a3c29] pt-5" aria-labelledby="map-settings">
            <div className="flex items-center gap-2 text-[#e9b969]">
              <Map className="h-4 w-4" />
              <h2 id="map-settings" className="text-sm font-semibold uppercase tracking-wider">Mapa procedural</h2>
            </div>
            {!readOnly&&<form onSubmit={submitSeed} className="space-y-3">
              <Label htmlFor="map-seed" className="text-[#dfd2b9]">Seed determinística</Label>
              <Input
                id="map-seed"
                value={seed}
                onChange={(event) => onSeedChange(event.target.value)}
                maxLength={64}
                required
                className="h-11 border-[#766348] bg-[#1b1815] text-[#f4ead4] placeholder:text-[#b0a18a]"
                placeholder="Ex.: DRAGON-DORSAL-01"
              />
              <Button type="submit" disabled={!freeMode} className="h-11 w-full bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]">
                Gerar mundo nesta seed
              </Button>
              {!freeMode && <p className="text-xs text-[#b7a991]">Mapas de contrato têm semente fixa. Abra a Oficina livre para escolher uma seed.</p>}
            </form>}
            <div>
              <Label className="mb-2 block text-[#dfd2b9]">Distância de geração em chunks</Label>
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((distance) => (
                  <Button
                    key={distance}
                    type="button"
                    variant={snapshot.chunkDistance === distance ? 'default' : 'outline'}
                    onClick={() => onChunkDistance(distance)}
                    aria-pressed={snapshot.chunkDistance === distance}
                    aria-label={`Distância ${distance}: até ${(distance * 2 + 1) ** 2} chunks carregados`}
                    className={snapshot.chunkDistance === distance ? 'h-11 bg-[#d3a958] text-[#1b211d] hover:bg-[#e3bd70]' : 'h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]'}
                  >
                    {distance}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#b7a991]">
                Chunks de 8×8 ao redor da célula central da câmera. {snapshot.loadedChunks} carregados agora; o bioma não muda nos limites do chunk.
              </p>
            </div>
          </section>

          {readOnly?<p className="border border-[#7c7652] p-3 text-sm text-[#d8dfb6]">Exposição protegida. A visita não pode construir, reconfigurar, importar, apagar ou sobrescrever a fábrica. Ao voltar, você encontra novamente o estado preparado.</p>:<section className="space-y-3 border-t border-[#4a3c29] pt-5" aria-labelledby="save-settings">
            <div className="flex items-center gap-2 text-[#e9b969]">
              <Database className="h-4 w-4" />
              <h2 id="save-settings" className="text-sm font-semibold uppercase tracking-wider">Dados locais</h2>
            </div>
            <p className="text-sm leading-relaxed text-[#c5b69c]">
              {SAVE_LABELS[saveStatus]} · {offlineReady ? 'cache offline pronto' : 'preparando cache offline'}.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={onSave} className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]">
                <Save className="h-4 w-4" /> Salvar
              </Button>
              <Button type="button" variant="outline" onClick={onExport} className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]">
                <Download className="h-4 w-4" /> Exportar
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="col-span-2 h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]">
                <Upload className="h-4 w-4" /> Importar save JSON
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={chooseFile} className="hidden" aria-label="Arquivo de save para importar" />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="h-11 w-full border-[#815247] bg-transparent text-[#efb5a6] hover:bg-[#3b2824]">
                  <RotateCcw className="h-4 w-4" /> Reiniciar a Oficina livre
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-[#665746] bg-[#25211c] text-[#f4ead4]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reiniciar a Oficina livre?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#c5b69c]">
                    Isto abandona a corrida atual (contrato ou oficina) e abre uma Oficina livre limpa. O perfil, o Grimório e os contratos concluídos continuam salvos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11 border-[#766348] bg-transparent text-[#dce6df] hover:bg-[#3b3124]">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onReset} className="h-11 bg-[#b76852] text-[#fff4ec] hover:bg-[#ca7962]">Reiniciar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs leading-relaxed text-[#b7a991]">
              A fábrica pausa quando a aba fica oculta ou o app é fechado. Os dados ficam somente neste navegador; limpar os dados do site os apaga.
            </p>
          </section>}

          <section className="space-y-3 border-t border-[#4a3c29] pt-5" aria-labelledby="controls-help">
            <div className="flex items-center gap-2 text-[#e9b969]">
              <Keyboard className="h-4 w-4" />
              <h2 id="controls-help" className="text-sm font-semibold uppercase tracking-wider">Controles e diagnóstico</h2>
            </div>
            <p className="text-sm leading-relaxed text-[#c5b69c]">
              Arraste para mover · pinça ou roda para zoom. B: construir · I: examinar · V: mover · G: contorno da malha · R: girar · F: centralizar. Com o mapa em foco, WASD/setas deslocam a câmera e Enter aplica a ferramenta na mira central. +/−: zoom · Espaço: pausar · Esc: sair da ferramenta. Ctrl + clique abre o Códice.
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-[#1b1815] p-3 font-mono text-xs text-[#d0c3aa]">
              <dt>FPS</dt><dd className="text-right">{snapshot.fps}</dd>
              <dt>DPR</dt><dd className="text-right">{snapshot.dpr.toFixed(2)}</dd>
              <dt>Chunks</dt><dd className="text-right">{snapshot.loadedChunks} / {(snapshot.chunkDistance * 2 + 1) ** 2}</dd>
              <dt>Células em cache</dt><dd className="text-right">{snapshot.cellCount.toLocaleString('pt-BR')}</dd>
              <dt>Chunk atual</dt><dd className="text-right">{Math.floor(snapshot.centerCell.q / 8)},{Math.floor(snapshot.centerCell.r / 8)}</dd>
              <dt>Tick</dt><dd className="text-right">{snapshot.tick.toLocaleString('pt-BR')}</dd>
              <dt>Zoom</dt><dd className="text-right">{snapshot.camera.zoom.toFixed(2)}x</dd>
              <dt>Passo</dt><dd className="text-right">50 ms</dd>
            </dl>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
