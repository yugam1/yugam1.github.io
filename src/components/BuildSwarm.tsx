import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { startSwarm, type SwarmControl, type SwarmStats } from '../swarm/engine'
import { useBgm } from '../hooks/useBgm'

// Drop the track at public/audio/bgm.mp3. It plays while the page is being
// built and fades out when the build finishes or is skipped.
const BGM_SRC = `${import.meta.env.BASE_URL}audio/bgm.mp3`
// The part of the track to loop, in seconds: from the drop (22.2s) for 11
// bars at 80 BPM, so the loop lands back on the beat.
const BGM_CLIP = { start: 1, end: 55.2 }

// Plays on every load, reloads included. ?build=off never plays it and
// ?build=1 always does; otherwise it's skipped for reduced-motion users and
// crawlers (who should index the real page, not a hidden one).
function shouldBuild(): boolean {
  const flag = new URLSearchParams(window.location.search).get('build')
  if (flag === 'off' || flag === '0') return false
  if (flag === '1' || flag === 'on') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return !/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)
}

export default function BuildSwarm() {
  const control = useRef<SwarmControl | null>(null)
  const [stats, setStats] = useState<SwarmStats | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const run = useCallback(() => {
    control.current?.destroy()
    const root = document.getElementById('root')
    if (!root) return
    control.current = startSwarm(root, setStats)
  }, [])

  // Layout effect: hide the page before the browser ever paints it.
  useLayoutEffect(() => {
    if (!shouldBuild()) return
    // A reload would otherwise restore the old scroll position, and the
    // build would start mid-page. Always build from the top.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, behavior: 'instant' })
    run()
    return () => {
      control.current?.destroy()
      control.current = null
    }
  }, [run])

  const finished = !!stats?.finished
  const bgm = useBgm(BGM_SRC, !!stats && !finished && !dismissed, BGM_CLIP)

  useEffect(() => {
    if (!finished) return
    const id = setTimeout(() => setDismissed(true), 6000)
    return () => clearTimeout(id)
  }, [finished])

  const skip = useCallback(() => {
    control.current?.skip()
    setDismissed(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  const replay = () => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setDismissed(false)
    setStats(null)
    run()
  }

  if (!stats || dismissed) return null

  const pct = stats.total ? (stats.done / stats.total) * 100 : 100

  return (
    <div
      data-build="skip"
      role="status"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-full border border-white/10 bg-[#111118]/90 backdrop-blur px-4 py-2 text-[12px] text-gray-300 shadow-lg shadow-black/40 whitespace-nowrap"
    >
      <div className="flex -space-x-1.5">
        {stats.agents.slice(0, 5).map(a => (
          <span
            key={a.name}
            title={a.name}
            className="w-5 h-5 rounded-full border-2 border-[#111118] text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: a.color }}
          >
            {a.name[0]}
          </span>
        ))}
      </div>
      {finished ? (
        <span>
          Built by <b className="text-white">{stats.agents.length}</b> agents in{' '}
          <b className="text-white">{stats.seconds.toFixed(1)}s</b>
        </span>
      ) : (
        <span>
          <b className="text-white">{stats.agents.length}</b> agents ·{' '}
          <b className="text-white tabular-nums">{stats.done}</b> / {stats.total} layers
        </span>
      )}
      <span className="hidden sm:block w-20 h-1 rounded-full bg-white/10 overflow-hidden">
        <span className="block h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </span>
      {bgm.available && !finished && (
        <button
          onClick={bgm.toggleMute}
          aria-label={bgm.muted ? 'Unmute music' : 'Mute music'}
          className="rounded-full p-1.5 text-gray-300 hover:text-white hover:bg-white/10"
        >
          {bgm.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}
      {finished ? (
        <button onClick={replay} className="rounded-full bg-white/10 hover:bg-white/20 px-3 py-1 text-white">
          Replay
        </button>
      ) : (
        <button
          onClick={skip}
          className="rounded-full bg-accent hover:bg-accent/80 px-3 py-1 text-white"
        >
          Skip
        </button>
      )}
    </div>
  )
}
