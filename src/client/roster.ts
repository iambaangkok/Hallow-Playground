export type CharacterDef = { id: string; label: string; color: string; accent: string }

/** The Roster. Drop `public/characters/<id>.png` to replace a placeholder with a drawing. */
export const ROSTER: CharacterDef[] = [
  { id: 'ghost', label: 'Ghost', color: '#f1ecff', accent: '#2a1f3d' },
  { id: 'cat', label: 'Black Cat', color: '#2b2238', accent: '#ffd23f' },
  { id: 'pumpkin', label: 'Pumpkin', color: '#ff8a1f', accent: '#3b1d00' },
  { id: 'witch', label: 'Witch', color: '#7bd389', accent: '#2a1f3d' },
  { id: 'skull', label: 'Skull', color: '#e9e2d0', accent: '#1a1424' },
  { id: 'bat', label: 'Bat', color: '#8a5cf6', accent: '#ffe9f0' },
]

export const characterDef = (id: string): CharacterDef => ROSTER.find((c) => c.id === id) ?? ROSTER[0]

const images = new Map<string, HTMLImageElement | null>()

/** Returns the drawing once loaded, or null while loading or when there is no drawing yet. */
export function spriteFor(id: string): HTMLImageElement | null {
  if (!images.has(id)) {
    images.set(id, null)
    const img = new Image()
    img.onload = () => images.set(id, img)
    img.src = `${import.meta.env.BASE_URL}characters/${id}.png`
  }
  return images.get(id) ?? null
}
