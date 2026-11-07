// Cursor icons, text measurement and small helpers for the build intro.

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'])

export function div(className: string): HTMLDivElement {
  const d = document.createElement('div')
  d.className = className
  return d
}

export type Tool = 'arrow' | 'cross' | 'text'

// Each icon is offset so its hotspot sits exactly on the cursor position.
export const ICONS: Record<Tool, (c: string) => string> = {
  arrow: c =>
    `<svg width="18" height="20" viewBox="0 0 18 20" style="left:-1px;top:-1px"><path d="M1.5 1.5v15l4.1-3.7 2.8 5.8 2.6-1.2-2.7-5.7 5.7-.3z" fill="${c}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  cross: c =>
    `<svg width="20" height="20" viewBox="0 0 20 20" style="left:-10px;top:-10px"><path d="M10 2v16M2 10h16" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><path d="M10 2v16M2 10h16" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  text: c =>
    `<svg width="12" height="20" viewBox="0 0 12 20" style="left:-6px;top:-10px"><path d="M2 2h8M2 18h8M6 2v16" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M2 2h8M2 18h8M6 2v16" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/></svg>`,
}

export const IMAGE_ICON =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>'

// One rendered line of text, relative to the element's top-left corner.
export interface Line { x0: number; x1: number; y0: number; y1: number }

// Measure the text as actually rendered, line by line, so the frame hugs
// the words and the caret runs along each line, centred text included.
export function measureLines(el: HTMLElement, box: DOMRect): Line[] {
  const range = document.createRange()
  range.selectNodeContents(el)
  const lines: Line[] = []
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 1 || r.height < 1) continue
    const y0 = r.top - box.top
    const y1 = r.bottom - box.top
    const line = lines.find(l => Math.min(l.y1, y1) - Math.max(l.y0, y0) > (y1 - y0) / 2)
    if (line) {
      line.x0 = Math.min(line.x0, r.left - box.left)
      line.x1 = Math.max(line.x1, r.right - box.left)
      line.y0 = Math.min(line.y0, y0)
      line.y1 = Math.max(line.y1, y1)
    } else {
      lines.push({ x0: r.left - box.left, x1: r.right - box.left, y0, y1 })
    }
  }
  lines.sort((p, q) => p.y0 - q.y0)
  return lines.length ? lines : [{ x0: 0, x1: box.width, y0: 0, y1: box.height }]
}

// A box's own look (fill, border, corners), without its contents, so a frame
// can be drawn without its text showing before it's typed.
const GHOST_PROPS = [
  'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'backdrop-filter',
]

export function ghostOf(el: HTMLElement, w: number, h: number): HTMLDivElement {
  const cs = getComputedStyle(el)
  const g = div('sw-ghost')
  for (const p of GHOST_PROPS) g.style.setProperty(p, cs.getPropertyValue(p))
  g.style.width = `${w}px`
  g.style.height = `${h}px`
  return g
}

// Clip paths for typing: the element shows everything typed so far, and its
// ghost (if any) shows exactly the rest of the box, so nothing doubles up.
export function typedClips(lines: Line[], total: number, p: number, w: number, h: number) {
  let left = p * total
  let i = 0
  while (i < lines.length - 1 && left > lines[i].x1 - lines[i].x0) {
    left -= lines[i].x1 - lines[i].x0
    i++
  }
  const line = lines[i]
  const x = p >= 1 ? w : Math.min(line.x1, line.x0 + left)
  const top = i === 0 ? 0 : line.y0
  const b = line.y1
  return {
    line,
    x,
    typed: `polygon(0 0, ${w}px 0, ${w}px ${top}px, ${x}px ${top}px, ${x}px ${b}px, 0 ${b}px)`,
    rest: `polygon(${x}px ${top}px, ${w}px ${top}px, ${w}px ${h}px, 0 ${h}px, 0 ${b}px, ${x}px ${b}px)`,
  }
}
