// Multi-cursor build intro. Hides every captured piece of the page, then a
// team of cursors rebuilds it like people working in a design tool: a
// crosshair drags out each frame (the real element appears under the drag),
// an I-beam types text in, and images get a placeholder until they land. All
// selection chrome shares one colour; only the cursors are individual.
//
// The view tours down the page on its own, moving on once the current screen
// is nearly built. Any wheel, touch or scroll key hands control back to the
// visitor, after which the build simply follows their scrolling.

import { captureTasks, refreshBounds, type Task } from './capture'
import { ICONS, IMAGE_ICON, SCROLL_KEYS, clamp, div, easeInOut, easeOut, measureLines, type Line, type Tool } from './visuals'

const NAMES = ['Pixel', 'Byte', 'Kern', 'Flex', 'Grid', 'Hex', 'Lint', 'Node', 'Hook', 'Prop', 'Vec', 'Span']
const COLORS = ['#6366f1', '#22d3ee', '#ec4899', '#10b981', '#f59e0b', '#a855f7', '#f43f5e', '#14b8a6', '#3b82f6', '#eab308', '#8b5cf6', '#f97316']

type Phase = 'sleep' | 'idle' | 'travel' | 'drag' | 'type' | 'leave' | 'gone'

interface Rect { x: number; y: number; w: number; h: number }

interface TypeLayout { lines: Line[]; total: number }

interface Agent {
  name: string
  color: string
  node: HTMLDivElement
  tool: Tool | null
  x: number
  y: number
  phase: Phase
  next: Phase
  t0: number
  dur: number
  fx: number; fy: number; tx: number; ty: number; cx: number; cy: number
  task: number
  rect: Rect
  lastClaim: number
  frame: HTMLDivElement | null
  frameDx: number // frame offset from the element, for text frames that hug the words
  frameDy: number
  size: HTMLSpanElement | null
  caret: HTMLDivElement | null
  layout: TypeLayout | null
}

export interface SwarmStats {
  agents: { name: string; color: string }[]
  done: number
  total: number
  finished: boolean
  seconds: number
}

export interface SwarmControl {
  skip(): void
  destroy(): void
}

export function startSwarm(root: Element, onStats: (s: SwarmStats) => void): SwarmControl {
  const tasks: Task[] = captureTasks(root)
  const vw = window.innerWidth
  const vh = window.innerHeight
  let done = 0
  for (const t of tasks) {
    // Page-sized backdrops (e.g. the hero section) aren't "drawn"; they are
    // the canvas everything else is drawn on.
    if (t.kind === 'box' && (t.right - t.left) * (t.bottom - t.top) > vw * vh * 0.45) {
      t.state = 2
      done++
    } else {
      t.el.setAttribute('data-sw', 'h')
    }
  }

  const layer = div('sw-layer')
  const world = div('sw-world')
  layer.appendChild(world)
  document.body.appendChild(layer)

  const start = performance.now()
  const agents: Agent[] = []
  const count = clamp(Math.round(vw / 140), 5, NAMES.length)
  // Everyone starts together in the middle of the screen and fans out.
  const ox = window.scrollX + vw / 2
  const oy = window.scrollY + vh / 2
  for (let i = 0; i < count; i++) {
    const node = div('sw-cursor')
    world.appendChild(node)
    agents.push({
      name: NAMES[i], color: COLORS[i], node, tool: null,
      x: ox + (Math.random() - 0.5) * 24, y: oy + (Math.random() - 0.5) * 24,
      phase: 'sleep', next: 'idle', t0: start + 150 + i * 60, dur: 0,
      fx: ox, fy: oy, tx: ox, ty: oy, cx: ox, cy: oy,
      task: -1, rect: { x: 0, y: 0, w: 0, h: 0 }, lastClaim: 0,
      frame: null, frameDx: 0, frameDy: 0, size: null, caret: null, layout: null,
    })
  }

  let finishedAt = 0
  let lastStats = -Infinity
  let lastRefresh = start
  let raf = 0
  let alive = true
  let touring = true
  let tourMoving = false
  let tourWaitFrom = 0

  const stopTour = () => { touring = false }
  const onKey = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) stopTour() }
  window.addEventListener('wheel', stopTour, { passive: true })
  window.addEventListener('touchstart', stopTour, { passive: true })
  window.addEventListener('keydown', onKey)

  function emit(now: number, force = false) {
    if (!force && now - lastStats < 100) return
    lastStats = now
    onStats({
      agents: agents.map(a => ({ name: a.name, color: a.color })),
      done,
      total: tasks.length,
      finished: finishedAt > 0,
      seconds: ((finishedAt || now) - start) / 1000,
    })
  }

  const viewTop = () => window.scrollY - 80
  const viewBottom = () => window.scrollY + window.innerHeight * 0.92

  function isReady(t: Task, vt: number, vb: number) {
    return t.state === 0 && (t.parent < 0 || tasks[t.parent].state === 2) && t.bottom > vt && t.top < vb
  }

  function setTool(a: Agent, tool: Tool) {
    if (a.tool === tool) return
    a.tool = tool
    a.node.innerHTML = ICONS[tool](a.color)
  }

  function travel(a: Agent, now: number, tx: number, ty: number, next: Phase, idle = false) {
    const dist = Math.hypot(tx - a.x, ty - a.y)
    a.fx = a.x
    a.fy = a.y
    a.tx = tx
    a.ty = ty
    // Bend the path a little so cursors don't move like robots.
    const bend = (Math.random() - 0.5) * dist * 0.3
    const nx = dist ? -(ty - a.y) / dist : 0
    const ny = dist ? (tx - a.x) / dist : 0
    a.cx = (a.x + tx) / 2 + nx * bend
    a.cy = (a.y + ty) / 2 + ny * bend
    a.dur = idle ? 900 + Math.random() * 700 : clamp(260 + dist * 0.4, 260, 850)
    a.t0 = now
    a.phase = 'travel'
    a.next = next
    setTool(a, next === 'drag' ? 'cross' : next === 'type' ? 'text' : 'arrow')
  }

  function claim(a: Agent, now: number): boolean {
    a.lastClaim = now
    const vt = viewTop()
    const vb = viewBottom()
    let best = -1
    let bestScore = Infinity
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      if (!isReady(t, vt, vb)) continue
      const d = Math.hypot((t.left + t.right) / 2 - a.x, t.top - a.y)
      const score = t.top + d * 0.35
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
    if (best < 0) return false
    const t = tasks[best]
    t.state = 1
    const r = t.el.getBoundingClientRect()
    a.rect = { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
    a.task = best
    travel(a, now, a.rect.x, a.rect.y, t.box ? 'drag' : 'type')
    return true
  }

  // No work in view: hover near where the build is happening, not off in a
  // corner, the way idle collaborators watch over someone's shoulder.
  function park(a: Agent, now: number) {
    let fx = window.scrollX + vw / 2
    let fy = window.scrollY + window.innerHeight * 0.6
    let best = Infinity
    for (const t of tasks) {
      if (t.state !== 2 && t.top < best && t.bottom > window.scrollY) {
        best = t.top
        fx = (t.left + t.right) / 2
        fy = t.top
      }
    }
    const minY = window.scrollY + 40
    const maxY = window.scrollY + window.innerHeight - 90
    travel(a, now, fx + (Math.random() - 0.5) * 320, clamp(fy + (Math.random() - 0.3) * 160, minY, maxY), 'idle', true)
  }

  function makeFrame(a: Agent, kind: 'box' | 'text' | 'media', hug?: Rect) {
    const f = div(`sw-frame sw-${kind}`)
    const r = hug ?? a.rect
    a.frameDx = r.x - a.rect.x
    a.frameDy = r.y - a.rect.y
    f.style.left = `${r.x}px`
    f.style.top = `${r.y}px`
    if (kind === 'text') {
      f.style.width = `${r.w}px`
      f.style.height = `${r.h}px`
    } else {
      for (const corner of ['tl', 'tr', 'bl', 'br']) {
        const h = document.createElement('span')
        h.className = `sw-handle sw-${corner}`
        f.appendChild(h)
      }
      const size = document.createElement('span')
      size.className = 'sw-size'
      f.appendChild(size)
      a.size = size
      if (kind === 'media') f.insertAdjacentHTML('beforeend', `<span class="sw-placeholder">${IMAGE_ICON}</span>`)
    }
    world.appendChild(f)
    a.frame = f
  }

  function beginDrag(a: Agent, now: number) {
    const t = tasks[a.task]
    makeFrame(a, t.kind === 'media' ? 'media' : 'box')
    // Boxes appear under the drag; media waits behind its placeholder.
    if (t.kind !== 'media') {
      t.el.style.clipPath = 'inset(0 100% 100% 0)'
      t.el.removeAttribute('data-sw')
    }
    a.phase = 'drag'
    a.t0 = now
    a.dur = clamp(320 + Math.sqrt(a.rect.w * a.rect.h) * 0.9, 320, 1000)
  }

  function beginType(a: Agent, now: number) {
    const t = tasks[a.task]
    const box = t.el.getBoundingClientRect()
    a.rect = { x: box.left + window.scrollX, y: box.top + window.scrollY, w: box.width, h: box.height }
    const lines = measureLines(t.el, box)
    a.layout = { lines, total: lines.reduce((n, l) => n + (l.x1 - l.x0), 0) }
    if (a.frame) {
      a.frame.remove()
      a.size = null
    }
    if (t.box) {
      makeFrame(a, 'text')
    } else {
      const x0 = Math.min(...lines.map(l => l.x0))
      const x1 = Math.max(...lines.map(l => l.x1))
      const y0 = lines[0].y0
      const y1 = lines[lines.length - 1].y1
      makeFrame(a, 'text', { x: a.rect.x + x0 - 2, y: a.rect.y + y0, w: x1 - x0 + 4, h: y1 - y0 })
    }
    const caret = div('sw-caret')
    world.appendChild(caret)
    a.caret = caret
    t.el.style.clipPath = 'inset(0 100% 100% 0)'
    t.el.removeAttribute('data-sw')
    setTool(a, 'text')
    a.phase = 'type'
    a.t0 = now
    a.dur = clamp(t.chars * 22, 300, 1400)
  }

  // Content can still be sliding in from its own entrance animation, so keep
  // the frame glued to wherever the element is right now.
  function track(a: Agent, t: Task) {
    const r = t.el.getBoundingClientRect()
    a.rect.x = r.left + window.scrollX
    a.rect.y = r.top + window.scrollY
    if (a.frame) {
      a.frame.style.left = `${a.rect.x + a.frameDx}px`
      a.frame.style.top = `${a.rect.y + a.frameDy}px`
    }
  }

  function finish(a: Agent) {
    const t = tasks[a.task]
    t.el.style.clipPath = t.prevClip
    t.el.removeAttribute('data-sw')
    t.state = 2
    done++
    const f = a.frame
    if (f) {
      f.classList.add('sw-fade')
      setTimeout(() => f.remove(), 300)
    }
    a.caret?.remove()
    a.frame = a.size = a.caret = null
    a.layout = null
    a.task = -1
    a.phase = 'idle'
    a.lastClaim = 0
    setTool(a, 'arrow')
  }

  function step(a: Agent, now: number) {
    const p = a.dur > 0 ? clamp((now - a.t0) / a.dur, 0, 1) : 1
    const t = a.task >= 0 ? tasks[a.task] : null
    if (t && !t.el.isConnected) {
      finish(a)
      return
    }

    switch (a.phase) {
      case 'sleep':
        setTool(a, 'arrow')
        if (now >= a.t0) a.phase = 'idle'
        break

      case 'idle':
        if (now - a.lastClaim > 120 && !claim(a, now)) park(a, now)
        break

      case 'travel': {
        const e = easeInOut(p)
        const u = 1 - e
        a.x = u * u * a.fx + 2 * u * e * a.cx + e * e * a.tx
        a.y = u * u * a.fy + 2 * u * e * a.cy + e * e * a.ty
        if (!t && now - a.lastClaim > 150 && claim(a, now)) break
        if (p >= 1) {
          if (a.next === 'drag') beginDrag(a, now)
          else if (a.next === 'type') beginType(a, now)
          else a.phase = a.next
        }
        break
      }

      case 'drag': {
        if (!t || !a.frame) break
        track(a, t)
        const e = easeOut(p)
        const { w, h } = a.rect
        const cw = w * e
        const ch = h * e
        a.x = a.rect.x + cw
        a.y = a.rect.y + ch
        a.frame.style.width = `${cw}px`
        a.frame.style.height = `${ch}px`
        if (a.size) a.size.textContent = `${Math.round(cw)} × ${Math.round(ch)}`
        if (t.kind !== 'media') t.el.style.clipPath = `inset(0 ${w - cw}px ${h - ch}px 0)`
        if (p >= 1) {
          if (t.text) beginType(a, now)
          else finish(a)
        }
        break
      }

      case 'type': {
        if (!t || !a.layout || !a.caret) break
        track(a, t)
        const { lines, total } = a.layout
        const { w } = a.rect
        // Walk the typed width along the lines to find the current one.
        let left = p * total
        let i = 0
        while (i < lines.length - 1 && left > lines[i].x1 - lines[i].x0) {
          left -= lines[i].x1 - lines[i].x0
          i++
        }
        const line = lines[i]
        const x = p >= 1 ? w : Math.min(line.x1, line.x0 + left)
        const top = i === 0 ? 0 : line.y0
        t.el.style.clipPath = `polygon(0 0, ${w}px 0, ${w}px ${top}px, ${x}px ${top}px, ${x}px ${line.y1}px, 0 ${line.y1}px)`
        const caretX = a.rect.x + Math.min(x, line.x1)
        const caretY = a.rect.y + line.y0
        const lh = line.y1 - line.y0
        a.caret.style.height = `${lh}px`
        a.caret.style.transform = `translate3d(${caretX}px, ${caretY}px, 0)`
        a.x += (caretX + 8 - a.x) * 0.4
        a.y += (caretY + lh / 2 - a.y) * 0.4
        if (p >= 1) finish(a)
        break
      }

      case 'leave':
        if (p >= 1) {
          a.phase = 'gone'
          a.node.remove()
        } else {
          const e = easeInOut(p)
          a.x = a.fx + (a.tx - a.fx) * e
          a.y = a.fy + (a.ty - a.fy) * e
        }
        break
    }
  }

  // Scroll on toward the next unbuilt part once the current screen is
  // mostly done, after a beat so the finished screen can be seen. Never
  // scrolls back up, and never fights the visitor.
  function tour(now: number) {
    let frontier = Infinity
    for (const t of tasks) if (t.state !== 2 && t.top < frontier) frontier = t.top
    if (!isFinite(frontier)) return
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const target = Math.min(frontier - window.innerHeight * 0.55, maxScroll)
    const gap = target - window.scrollY
    if (!tourMoving) {
      if (gap < 40) {
        tourWaitFrom = 0
        return
      }
      tourWaitFrom ||= now
      if (now - tourWaitFrom < 700) return
      tourMoving = true
    }
    const delta = Math.min(gap * 0.06, 10)
    if (delta > 0.5) window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' })
    else {
      tourMoving = false
      tourWaitFrom = 0
    }
  }

  function teardown() {
    alive = false
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', stopTour)
    window.removeEventListener('touchstart', stopTour)
    window.removeEventListener('keydown', onKey)
    for (const t of tasks) {
      t.el.removeAttribute('data-sw')
      if (t.state !== 2) t.el.style.clipPath = t.prevClip
    }
    layer.remove()
  }

  function frame(now: number) {
    if (!alive) return

    // Batch layout reads before any writes this frame.
    if (now - lastRefresh > 800) {
      lastRefresh = now
      for (const t of tasks) if (t.state === 0) refreshBounds(t)
    }
    if (touring && !finishedAt) tour(now)
    world.style.transform = `translate3d(${-window.scrollX}px, ${-window.scrollY}px, 0)`

    const vt = viewTop()
    for (const t of tasks) {
      if (t.state === 0 && t.bottom < vt) {
        // Scrolled past before anyone got to it: just show it, so the visitor
        // never scrolls back up into a hole.
        t.el.removeAttribute('data-sw')
        t.state = 2
        done++
      }
    }

    for (const a of agents) {
      if (a.phase === 'gone') continue
      step(a, now)
      a.node.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`
    }

    if (!finishedAt && done >= tasks.length) {
      finishedAt = now
      for (const a of agents) {
        setTool(a, 'arrow')
        a.fx = a.x
        a.fy = a.y
        a.tx = a.x + (Math.random() - 0.5) * 200
        a.ty = window.scrollY + window.innerHeight + 60
        a.t0 = now + Math.random() * 250
        a.dur = 800
        a.phase = 'leave'
      }
      emit(now, true)
      setTimeout(teardown, 1100)
    }

    emit(now)
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)

  return {
    skip() {
      if (!alive) return
      if (!finishedAt) {
        finishedAt = performance.now()
        done = tasks.length
      }
      teardown()
      emit(performance.now(), true)
    },
    destroy() {
      if (alive) teardown()
    },
  }
}
