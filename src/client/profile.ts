import { ROSTER } from './roster'

export type Profile = { name: string; character: string }

const KEY = 'hallow-playground.profile'

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '') as Profile
    if (typeof p.name === 'string' && ROSTER.some((c) => c.id === p.character)) return p
  } catch {}
  return { name: '', character: ROSTER[Math.floor(Math.random() * ROSTER.length)].id }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p))
}
