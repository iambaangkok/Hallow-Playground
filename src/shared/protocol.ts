import { DEFAULT_BASE, isPumpkinBase, type PumpkinBaseId } from './pumpkins'

export type Point = { x: number; y: number }

/** A Cut is a closed straight-edged polygon in pumpkin-local 0..1 coordinates. */
export type Cut = Point[]

/** What the carver produces: a Pumpkin Base plus its Cuts. A Player holds one until placing it. */
export type Carving = { base: PumpkinBaseId; cuts: Cut[] }

export type Pumpkin = Carving & { id: string; x: number; y: number; by: string; at: number }

export type PlayerView = {
  id: string
  name: string
  character: string
  x: number
  y: number
  tx: number
  ty: number
  holding: Carving | null
}

export type ClientMsg =
  | { t: 'join'; name: string; character: string }
  | { t: 'walk'; x: number; y: number }
  | { t: 'say'; text: string }
  | { t: 'visibility'; public: boolean }
  | { t: 'hold'; carving: Carving }
  | { t: 'place'; x: number; y: number }

export type ServerMsg =
  | { t: 'welcome'; you: string; code: string; public: boolean; players: PlayerView[]; pumpkins: Pumpkin[] }
  | { t: 'joined'; player: PlayerView }
  | { t: 'left'; id: string }
  | { t: 'walk'; id: string; x: number; y: number; tx: number; ty: number }
  | { t: 'say'; id: string; name: string; text: string }
  | { t: 'visibility'; public: boolean }
  | { t: 'holding'; id: string; carving: Carving | null }
  | { t: 'placed'; pumpkin: Pumpkin }

export type PublicPlayground = { code: string; players: number }

export const LIMITS = {
  name: 16,
  say: 140,
  cutsPerPumpkin: 40,
  pointsPerCut: 48,
  pumpkinsPerPlayground: 300,
  playersPerPlayground: 12,
} as const

export const WALK_SPEED = 260

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 5

export function isPlaygroundCode(s: string): boolean {
  return s.length === CODE_LENGTH && [...s].every((c) => CODE_ALPHABET.includes(c))
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const str = (v: unknown): v is string => typeof v === 'string'

function parseCut(v: unknown): Cut | null {
  if (!Array.isArray(v) || v.length < 3 || v.length > LIMITS.pointsPerCut) return null
  const pts: Cut = []
  for (const p of v) {
    if (!p || !num(p.x) || !num(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null
    pts.push({ x: p.x, y: p.y })
  }
  return pts
}

export function parseClientMsg(raw: unknown): ClientMsg | null {
  let m: any
  try {
    m = typeof raw === 'string' ? JSON.parse(raw) : null
  } catch {
    return null
  }
  if (!m || typeof m !== 'object') return null
  switch (m.t) {
    case 'join':
      if (!str(m.name) || !str(m.character)) return null
      return { t: 'join', name: m.name.trim().slice(0, LIMITS.name) || 'Player', character: m.character.slice(0, 32) }
    case 'walk':
      return num(m.x) && num(m.y) ? { t: 'walk', x: m.x, y: m.y } : null
    case 'say': {
      if (!str(m.text)) return null
      const text = m.text.trim().slice(0, LIMITS.say)
      return text ? { t: 'say', text } : null
    }
    case 'visibility':
      return typeof m.public === 'boolean' ? { t: 'visibility', public: m.public } : null
    case 'hold': {
      const c = m.carving
      if (!c || !Array.isArray(c.cuts) || c.cuts.length > LIMITS.cutsPerPumpkin) return null
      const cuts: Cut[] = []
      for (const raw of c.cuts) {
        const cut = parseCut(raw)
        if (!cut) return null
        cuts.push(cut)
      }
      return { t: 'hold', carving: { base: isPumpkinBase(c.base) ? c.base : DEFAULT_BASE, cuts } }
    }
    case 'place':
      return num(m.x) && num(m.y) ? { t: 'place', x: m.x, y: m.y } : null
    default:
      return null
  }
}
