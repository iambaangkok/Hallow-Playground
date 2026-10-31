import type { Point } from './protocol'

export const MAP_W = 2400
export const MAP_H = 1600
export const SPAWN: Point = { x: 1200, y: 1300 }

export function clampToMap(p: Point): Point {
  return { x: Math.min(MAP_W - 40, Math.max(40, p.x)), y: Math.min(MAP_H - 40, Math.max(80, p.y)) }
}

export function stepToward(from: Point, to: Point, dist: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.hypot(dx, dy)
  if (d <= dist) return { x: to.x, y: to.y }
  return { x: from.x + (dx / d) * dist, y: from.y + (dy / d) * dist }
}
