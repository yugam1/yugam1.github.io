import { useCallback, useEffect, useRef, useState } from 'react'

const VOLUME = 0.5
const FADE_IN_MS = 1500
const FADE_OUT_MS = 2000
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const
// Seconds to dip the volume either side of the jump when a clip loops.
const LOOP_FADE_S = 0.4

// Only play this stretch of the track (in seconds), looping back to `start`.
export interface BgmClip {
  start: number
  end: number
}

// Background music that plays while `active` is true, fading in and out.
// Browsers block sound until the visitor interacts with the page, so if the
// first play() is refused it retries on their first click, tap or key press.
// A missing file just means no music: `available` goes false.
export function useBgm(src: string, active: boolean, clip?: BgmClip) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const fadeTimer = useRef(0)
  const activeRef = useRef(active)
  const looping = useRef(false)
  const [available, setAvailable] = useState(true)
  const [muted, setMuted] = useState(false)

  const fadeTo = useCallback((to: number, ms: number, then?: () => void) => {
    const a = audio.current
    if (!a) return
    window.clearInterval(fadeTimer.current)
    const from = a.volume
    const start = performance.now()
    fadeTimer.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / ms)
      a.volume = from + (to - from) * p
      if (p >= 1) {
        window.clearInterval(fadeTimer.current)
        then?.()
      }
    }, 50)
  }, [])

  useEffect(() => {
    activeRef.current = active
    if (!active) {
      const a = audio.current
      if (a && !a.paused) fadeTo(0, FADE_OUT_MS, () => a.pause())
      return
    }

    const start = clip?.start ?? 0
    const end = clip?.end ?? Infinity
    if (!audio.current) {
      // The #t fragment makes the browser start buffering from the clip.
      const a = new Audio(clip ? `${src}#t=${start}` : src)
      a.loop = !clip
      a.preload = 'auto'
      a.addEventListener('error', () => setAvailable(false))
      audio.current = a
    }
    const a = audio.current
    a.volume = 0
    looping.current = false

    // Loop the clip by hand: dip the volume, jump back to the start, come
    // back up, so the seam isn't a hard cut.
    const watch = window.setInterval(() => {
      if (!clip || a.paused || looping.current) return
      if (a.currentTime < start - 0.5) a.currentTime = start
      if (a.currentTime < end - LOOP_FADE_S && !a.ended) return
      looping.current = true
      fadeTo(0, LOOP_FADE_S * 1000, () => {
        a.currentTime = start
        looping.current = false
        if (a.paused && activeRef.current) a.play().catch(() => {})
        if (activeRef.current) fadeTo(VOLUME, LOOP_FADE_S * 1500)
      })
    }, 100)

    const play = () => {
      if (!activeRef.current) return
      a.play().then(() => fadeTo(VOLUME, FADE_IN_MS), () => {})
    }
    const unlock = () => {
      for (const e of UNLOCK_EVENTS) window.removeEventListener(e, unlock)
      play()
    }

    a.play().then(
      () => fadeTo(VOLUME, FADE_IN_MS),
      () => {
        for (const e of UNLOCK_EVENTS) window.addEventListener(e, unlock, { once: true })
      },
    )
    return () => {
      window.clearInterval(watch)
      for (const e of UNLOCK_EVENTS) window.removeEventListener(e, unlock)
    }
    // Depend on the clip's numbers, not the object, so callers can pass a literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, src, fadeTo, clip?.start, clip?.end])

  useEffect(
    () => () => {
      window.clearInterval(fadeTimer.current)
      audio.current?.pause()
    },
    [],
  )

  const toggleMute = useCallback(() => {
    const a = audio.current
    if (!a) return
    a.muted = !a.muted
    setMuted(a.muted)
    // Clicking the button is itself an interaction, so this also gets past
    // the browser's autoplay block when the music hasn't started yet.
    if (!a.muted && a.paused && activeRef.current) {
      a.play().then(() => fadeTo(VOLUME, FADE_IN_MS), () => {})
    }
  }, [fadeTo])

  return { available, muted, toggleMute }
}
