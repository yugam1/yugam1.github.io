// Shapes shared by the build intro and the component that drives it.

export interface Rect { x: number; y: number; w: number; h: number }

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
