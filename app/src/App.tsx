import { useCallback, useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { CreditsScreen } from '@/components/menu/CreditsScreen'
import { MainMenu } from '@/components/menu/MainMenu'
import { SettingsScreen } from '@/components/menu/SettingsScreen'
import { SlotSelect } from '@/components/menu/SlotSelect'
import { PerfOverlay } from '@/components/game/PerfOverlay'
import { DownloadsScreen } from '@/components/menu/DownloadsScreen'
import { HowToPlay } from '@/components/menu/HowToPlay'
import { CodexDialog } from '@/components/game/CodexDialog'
import { createProfile } from '@/game/stats'
import type { CodexTarget } from '@/game/types'
import GameScreen from '@/pages/GameScreen'
import type { SlotId } from '@/game/config'
import { useInterfaceSounds, useMusicScene } from '@/game/audio/useAudio'
import { applyVisualPreferences, readVisualPreferences, type VisualPreferences } from '@/game/visualPreferences'

type Screen = { name: 'menu' } | { name: 'slots' } | { name: 'settings' } | { name: 'credits' } | {name:'help'} | {name:'downloads'} | { name: 'game'; slot: SlotId }
const READER_PROFILE=createProfile('Leitor','artisan',0)

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' })
  const [preferences, setPreferences] = useState<VisualPreferences>(readVisualPreferences)
  const [codexOpen,setCodexOpen]=useState(false),[codexTarget,setCodexTarget]=useState<CodexTarget>({category:'machines',id:'golem'})
  const openCodex=(target?:CodexTarget)=>{if(target)setCodexTarget(target);setCodexOpen(true)}

  useEffect(() => { applyVisualPreferences(preferences) }, [preferences])
  useInterfaceSounds()
  useMusicScene(screen.name === 'game' ? 'factory' : screen.name === 'credits' ? 'credits' : 'menu')
  const updatePreferences = useCallback((patch: Partial<VisualPreferences>) => setPreferences((current) => ({ ...current, ...patch })), [])
  const goMenu = useCallback(() => setScreen({ name: 'menu' }), [])

  return <>
    {screen.name === 'menu' && <MainMenu onPlay={() => setScreen({ name: 'slots' })} onSettings={() => setScreen({ name: 'settings' })} onCredits={() => setScreen({ name: 'credits' })} onCodex={()=>openCodex()} onHelp={()=>setScreen({name:'help'})} onDownloads={()=>setScreen({name:'downloads'})} />}
    {screen.name==='downloads'&&<DownloadsScreen onBack={goMenu}/>}
    {screen.name==='help'&&<HowToPlay onBack={goMenu} onPlay={()=>setScreen({name:'slots'})} onCodex={openCodex}/>}
    {screen.name === 'slots' && <SlotSelect onBack={goMenu} onStart={(slot) => setScreen({ name: 'game', slot })} />}
    {screen.name === 'settings' && <SettingsScreen preferences={preferences} onPreferences={updatePreferences} onBack={goMenu} />}
    {screen.name === 'credits' && <CreditsScreen onBack={goMenu} />}
    {screen.name === 'game' && <GameScreen key={screen.slot} slot={screen.slot} preferences={preferences} onPreferences={updatePreferences} onExit={goMenu} />}
    <CodexDialog open={codexOpen} onOpenChange={setCodexOpen} target={codexTarget} onSelect={setCodexTarget} profile={READER_PROFILE} freeMode onLessonRead={()=>{}}/>
    {preferences.perfOverlay && <PerfOverlay />}
    <Toaster theme="dark" position="top-center" richColors closeButton />
  </>
}
