export type NpcAction =
  | { kind: 'link'; url: string; label: string }
  | { kind: 'carve' }
  | { kind: 'gate' }

export type Npc = {
  id: string
  name: string
  sprite: string
  color: string
  accent: string
  x: number
  y: number
  lines: string[]
  action: NpcAction
}

/** Placeholder NPCs. Names, lines, and art come from the owner. Only `action` and position are wiring. */
export const NPCS: Npc[] = [
  {
    id: 'npc-1',
    name: 'NPC 1',
    sprite: 'npc-1',
    color: '#161616',
    accent: '#ffffff',
    x: 1050,
    y: 1360,
    lines: ['[NPC 1 line]'],
    action: { kind: 'gate' },
  },
  {
    id: 'npc-2',
    name: 'NPC 2',
    sprite: 'npc-2',
    color: '#161616',
    accent: '#ffffff',
    x: 1720,
    y: 1050,
    lines: ['[NPC 2 line]'],
    action: { kind: 'carve' },
  },
  {
    id: 'npc-3',
    name: 'NPC 3',
    sprite: 'npc-3',
    color: '#161616',
    accent: '#ffffff',
    x: 560,
    y: 560,
    lines: ['[NPC 3 line]'],
    action: { kind: 'link', url: 'https://x.com/meisbk', label: 'Open X' },
  },
  {
    id: 'npc-4',
    name: 'NPC 4',
    sprite: 'npc-4',
    color: '#161616',
    accent: '#ffffff',
    x: 1880,
    y: 420,
    lines: ['[NPC 4 line]'],
    action: { kind: 'link', url: 'https://iambaangkok.github.io/me/', label: 'Open website' },
  },
]
