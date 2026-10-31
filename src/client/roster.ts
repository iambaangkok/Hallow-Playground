export type CharacterDef = { id: string; label: string; color: string; accent: string }

/** The Roster. Drop `public/characters/<id>.png` to replace a placeholder with a drawing. */
export const ROSTER: CharacterDef[] = [
  { id: 'character-1', label: 'Character 1', color: '#161616', accent: '#ffffff' },
  { id: 'character-2', label: 'Character 2', color: '#161616', accent: '#ffffff' },
  { id: 'character-3', label: 'Character 3', color: '#161616', accent: '#ffffff' },
  { id: 'character-4', label: 'Character 4', color: '#161616', accent: '#ffffff' },
  { id: 'character-5', label: 'Character 5', color: '#161616', accent: '#ffffff' },
  { id: 'character-6', label: 'Character 6', color: '#161616', accent: '#ffffff' },
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
