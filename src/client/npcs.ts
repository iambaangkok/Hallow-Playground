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

export const NPCS: Npc[] = [
  {
    id: 'gatekeeper',
    name: 'Bonesy the Gatekeeper',
    sprite: 'npc-gatekeeper',
    color: '#e9e2d0',
    accent: '#1a1424',
    x: 1050,
    y: 1360,
    lines: ['Welcome to the Hallow Playground!', 'I keep the gate. Want to share this playground, or change who can wander in?'],
    action: { kind: 'gate' },
  },
  {
    id: 'patch',
    name: 'Old Gourd',
    sprite: 'npc-patch',
    color: '#c46a1b',
    accent: '#2b1500',
    x: 1720,
    y: 1050,
    lines: ['Ahh, a visitor to my pumpkin patch.', 'Grab a pumpkin and carve it. Tap the points, tap the first one again to cut.', 'When you are done, set it down for everyone to see.'],
    action: { kind: 'carve' },
  },
  {
    id: 'crow',
    name: 'Kaw the Crow',
    sprite: 'npc-crow',
    color: '#241c33',
    accent: '#ffd23f',
    x: 560,
    y: 560,
    lines: ['Kaw! I carry messages for the one who built this place.', 'The builder posts over on X. Want to fly over and say hi?'],
    action: { kind: 'link', url: 'https://x.com/meisbk', label: 'Visit @meisbk on X' },
  },
  {
    id: 'witch',
    name: 'Moon Witch',
    sprite: 'npc-witch',
    color: '#7bd389',
    accent: '#2a1f3d',
    x: 1880,
    y: 420,
    lines: ['The moon tells me the builder has a home on the web.', 'Shall I open a portal there?'],
    action: { kind: 'link', url: 'https://iambaangkok.github.io/me/', label: "Open the builder's website" },
  },
]
