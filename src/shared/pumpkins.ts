/** Pumpkin Bases ship with the game. Drop `public/pumpkins/<id>.png` to replace a placeholder. */
export const PUMPKIN_BASES = [
  { id: 'base-1', label: 'Base 1', aspect: 0.8 },
  { id: 'base-2', label: 'Base 2', aspect: 1.0 },
  { id: 'base-3', label: 'Base 3', aspect: 1.2 },
  { id: 'base-4', label: 'Base 4', aspect: 0.7 },
] as const

export type PumpkinBaseId = (typeof PUMPKIN_BASES)[number]['id']

export const DEFAULT_BASE: PumpkinBaseId = 'base-1'

export function isPumpkinBase(s: unknown): s is PumpkinBaseId {
  return PUMPKIN_BASES.some((b) => b.id === s)
}
