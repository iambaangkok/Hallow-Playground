/** Pumpkin Bases ship with the game. Drop `public/pumpkins/<id>.png` to replace a placeholder. */
export const PUMPKIN_BASES = [
  { id: 'classic', label: 'Classic', side: '#d9661a', mid: '#ff8a1f', aspect: 1.7 / 2.1 },
  { id: 'tall', label: 'Tall', side: '#c9561a', mid: '#f47a1a', aspect: 1.25 },
  { id: 'ghost', label: 'Ghost', side: '#d8d2c4', mid: '#f3efe4', aspect: 0.75 },
  { id: 'warty', label: 'Warty', side: '#5f8a3a', mid: '#7aa84a', aspect: 0.9 },
] as const

export type PumpkinBaseId = (typeof PUMPKIN_BASES)[number]['id']

export const DEFAULT_BASE: PumpkinBaseId = 'classic'

export function isPumpkinBase(s: unknown): s is PumpkinBaseId {
  return PUMPKIN_BASES.some((b) => b.id === s)
}
