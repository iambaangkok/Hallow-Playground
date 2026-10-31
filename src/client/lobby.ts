import { isPlaygroundCode, LIMITS } from '../shared/protocol'
import { h } from './dom'
import { IDLE_BOB_RATE, WALK_BOB_RATE, drawCharacter } from './draw'
import { createPlayground, listPublic, playgroundExists } from './net'
import { saveProfile, type Profile } from './profile'
import { ROSTER } from './roster'

export type LobbyResult = { profile: Profile; code: string }

/** The Lobby: pick a Character, type a Name, then create or join a Playground. */
export function showLobby(root: HTMLElement, initial: Profile, presetCode: string | null): Promise<LobbyResult> {
  return new Promise((resolve) => {
    const profile = { ...initial }
    const cards: HTMLButtonElement[] = []
    let raf = 0

    const finish = (code: string) => {
      profile.name = nameInput.value.trim().slice(0, LIMITS.name)
      if (!profile.name) {
        nameInput.focus()
        nameInput.classList.add('shake')
        setTimeout(() => nameInput.classList.remove('shake'), 400)
        return
      }
      saveProfile(profile)
      cancelAnimationFrame(raf)
      panel.remove()
      resolve({ profile, code })
    }

    const status = h('p', { class: 'status' })
    const fail = (msg: string) => (status.textContent = msg)

    const roster = h('div', { class: 'roster' })
    for (const c of ROSTER) {
      const canvas = h('canvas', { width: 120, height: 130 })
      const card = h('button', { class: 'card', on: { click: () => pick(c.id) } }, canvas, h('span', {}, c.label))
      card.dataset.id = c.id
      cards.push(card)
      roster.append(card)
    }
    const pick = (id: string) => {
      profile.character = id
      for (const card of cards) card.classList.toggle('picked', card.dataset.id === id)
    }
    pick(profile.character)

    const animate = (now: number) => {
      const t = now / 1000
      for (const card of cards) {
        const ctx = card.querySelector('canvas')!.getContext('2d')!
        const c = ROSTER.find((r) => r.id === card.dataset.id)!
        const picked = c.id === profile.character
        ctx.clearRect(0, 0, 120, 130)
        drawCharacter(ctx, 60, 118, c.id, c, { moving: picked, phase: picked ? t * WALK_BOB_RATE : t * IDLE_BOB_RATE, facing: 1 }, 90)
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    const nameInput = h('input', {
      class: 'name',
      placeholder: 'Your name',
      maxLength: LIMITS.name,
      value: profile.name,
      autocomplete: 'off',
      enterKeyHint: 'go',
    })

    const actions = h('div', { class: 'actions' })
    if (presetCode) {
      actions.append(
        h('button', { class: 'primary', on: { click: () => finish(presetCode) } }, `Enter playground ${presetCode}`),
        h('a', { class: 'link', href: import.meta.env.BASE_URL }, 'or go to the lobby'),
      )
    } else {
      let makePublic = false
      const visibility = h('button', { class: 'toggle', on: { click: () => setVis(!makePublic) } })
      const setVis = (v: boolean) => {
        makePublic = v
        visibility.textContent = v ? 'Public: anyone can find it' : 'Private: only people with the code'
        visibility.classList.toggle('on', v)
      }
      setVis(false)

      const create = h('button', {
        class: 'primary',
        on: {
          click: async () => {
            if (!nameInput.value.trim()) return finish('')
            create.disabled = true
            try {
              finish(await createPlayground(makePublic))
            } catch (e) {
              fail((e as Error).message)
              create.disabled = false
            }
          },
        },
      }, 'Create a playground')

      const codeInput = h('input', { class: 'code', placeholder: 'CODE', maxLength: 5, autocomplete: 'off', autocapitalize: 'characters', enterKeyHint: 'go' })
      const join = async () => {
        const code = codeInput.value.trim().toUpperCase()
        if (!isPlaygroundCode(code)) return fail('A playground code is 5 letters or numbers.')
        if (!(await playgroundExists(code))) return fail(`No playground called ${code}.`)
        finish(code)
      }
      codeInput.addEventListener('keydown', (e) => e.key === 'Enter' && join())

      const publicList = h('div', { class: 'public-list' }, h('p', { class: 'muted' }, 'Looking for public playgrounds...'))
      const refresh = async () => {
        const list = await listPublic()
        publicList.replaceChildren(
          ...(list.length
            ? list.map((p) => h('button', { class: 'public', on: { click: () => finish(p.code) } }, h('b', {}, p.code), ` ${p.players} playing`))
            : [h('p', { class: 'muted' }, 'No public playgrounds right now.')]),
        )
      }
      refresh()

      actions.append(
        h('div', { class: 'row' }, create, visibility),
        h('div', { class: 'row' }, codeInput, h('button', { on: { click: join } }, 'Join')),
        h('div', { class: 'row head' }, h('span', {}, 'Public playgrounds'), h('button', { class: 'small', on: { click: refresh } }, 'Refresh')),
        publicList,
      )
    }

    nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && presetCode && finish(presetCode))

    const panel = h(
      'div',
      { class: 'lobby' },
      h('div', { class: 'lobby-inner' }, h('h1', {}, 'Playground'), h('h2', {}, 'Pick who you are'), roster, nameInput, actions, status),
    )
    root.append(panel)
  })
}
