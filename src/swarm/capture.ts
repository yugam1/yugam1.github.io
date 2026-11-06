// Walks the rendered page and turns it into an ordered list of build tasks:
// boxes (anything with a visible background/border/shadow), text blocks and
// media. Parents always come before their children, so a card is drawn
// before the text inside it is typed.

export type TaskKind = 'box' | 'text' | 'media'

export interface Task {
  el: HTMLElement
  kind: TaskKind
  box: boolean // drag out a frame first
  text: boolean // then type the contents
  parent: number // nearest ancestor task, or -1
  chars: number
  // Cached document-space bounds, refreshed while building.
  top: number
  bottom: number
  left: number
  right: number
  state: 0 | 1 | 2 // pending, in progress, done
  prevClip: string
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME'])
const MEDIA_TAGS = new Set(['IMG', 'SVG', 'VIDEO', 'CANVAS', 'PICTURE'])
const MAX_TASKS = 600

function alpha(color: string): number {
  if (!color || color === 'transparent') return 0
  const m = color.match(/\(([^)]+)\)/)
  if (!m) return 1
  const parts = m[1].split(/[\s,/]+/).filter(Boolean)
  return parts.length > 3 ? parseFloat(parts[3]) : 1
}

function hasBoxStyle(cs: CSSStyleDeclaration): boolean {
  if (alpha(cs.backgroundColor) > 0.02) return true
  if (cs.backgroundImage && cs.backgroundImage !== 'none') return true
  if (cs.boxShadow && cs.boxShadow !== 'none') return true
  if (cs.backdropFilter && cs.backdropFilter !== 'none') return true
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    const w = parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`))
    if (w > 0 && alpha(cs.getPropertyValue(`border-${side.toLowerCase()}-color`)) > 0.05) return true
  }
  return false
}

const tagOf = (el: Element) => el.tagName.toUpperCase()

// True when everything inside `el` flows as plain inline content, i.e. it
// reads as one block of text rather than a layout of separate pieces.
function isInlineOnly(el: Element): boolean {
  for (const child of Array.from(el.children)) {
    const tag = tagOf(child)
    if (SKIP_TAGS.has(tag)) continue
    const cs = getComputedStyle(child)
    if (cs.display === 'none') continue
    if (!cs.display.startsWith('inline')) return false
    if (MEDIA_TAGS.has(tag)) continue
    if (hasBoxStyle(cs)) return false
    if (!isInlineOnly(child)) return false
  }
  return true
}

export function captureTasks(root: Element): Task[] {
  const tasks: Task[] = []
  const sx = window.scrollX
  const sy = window.scrollY

  function add(el: Element, kind: TaskKind, box: boolean, text: boolean, parent: number, r: DOMRect) {
    const h = el as HTMLElement
    tasks.push({
      el: h,
      kind,
      box,
      text,
      parent,
      chars: text ? (h.textContent || '').trim().length : 0,
      top: r.top + sy,
      bottom: r.bottom + sy,
      left: r.left + sx,
      right: r.right + sx,
      state: 0,
      prevClip: h.style.clipPath,
    })
    return tasks.length - 1
  }

  function walk(el: Element, parent: number) {
    for (const child of Array.from(el.children)) {
      if (tasks.length >= MAX_TASKS) return
      const tag = tagOf(child)
      const hint = child.getAttribute('data-build')
      if (SKIP_TAGS.has(tag) || hint === 'skip') continue
      const cs = getComputedStyle(child)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      if (cs.position === 'sticky') continue

      const r = child.getBoundingClientRect()
      const sized = r.width > 1 && r.height > 1

      if (MEDIA_TAGS.has(tag)) {
        if (sized || tag === 'IMG') add(child, 'media', true, false, parent, r)
        continue
      }

      const boxy = sized && hasBoxStyle(cs)
      const isText =
        hint === 'text' || (!!(child.textContent || '').trim() && isInlineOnly(child))
      if (isText && sized) {
        add(child, 'text', boxy, true, parent, r)
        continue
      }

      walk(child, boxy ? add(child, 'box', true, false, parent, r) : parent)
    }
  }

  walk(root, -1)
  return tasks
}

export function refreshBounds(task: Task) {
  const r = task.el.getBoundingClientRect()
  task.top = r.top + window.scrollY
  task.bottom = r.bottom + window.scrollY
  task.left = r.left + window.scrollX
  task.right = r.right + window.scrollX
}
