import type { PlayerView, Pumpkin, ServerMsg } from '../shared/protocol'
import { LIMITS, WALK_SPEED } from '../shared/protocol'
import { DEFAULT_BASE } from '../shared/pumpkins'
import { MAP_H, MAP_W, clampToMap, stepToward } from '../shared/world'
import { openCarver } from './carve'
import { h } from './dom'
import { CHARACTER_H, IDLE_BOB_RATE, WALK_BOB_RATE, drawBubble, drawCarvedPumpkin, drawCharacter, drawHeldPumpkin, drawLabel, drawMap, type Pose } from './draw'
import { connect, type Connection } from './net'
import { NPCS, type Npc } from './npcs'
import type { Profile } from './profile'
import { characterDef } from './roster'

type Body = { x: number; y: number; tx: number; ty: number; pose: Pose }
type Player = PlayerView & Body & { bubble?: { text: string; until: number } }
type NpcState = Npc & { pose: Pose }

const BUBBLE_MS = 6000
const LOG_FADE_MS = 15000
const NPC_REACH = 130
const PUMPKIN_R = 26
const PLACE_AHEAD = 70

export function startGame(root: HTMLElement, canvas: HTMLCanvasElement, profile: Profile, code: string) {
  const ctx = canvas.getContext('2d')!
  const players = new Map<string, Player>()
  const pumpkins: Pumpkin[] = []
  const npcs: NpcState[] = NPCS.map((n) => ({ ...n, pose: { moving: false, phase: Math.random() * Math.PI * 2, facing: n.x > MAP_W / 2 ? -1 : 1 } }))
  let me = ''
  let isPublic = false
  let pendingNpc: NpcState | null = null
  let modalOpen = false
  const cam = { x: MAP_W / 2, y: MAP_H / 2, zoom: 1 }

  const ui = h('div', { class: 'hud' })
  root.append(ui)

  const logList = h('div', { class: 'log-list' })
  const logToggle = h('button', { class: 'log-toggle', on: { click: () => log.classList.toggle('collapsed') } }, 'Chat')
  const log = h('div', { class: 'chat-log' }, logToggle, logList)
  const addLog = (who: string, text: string, kind: 'say' | 'info' = 'say') => {
    const row = h('div', { class: `log-row ${kind}` }, kind === 'say' ? h('b', {}, `${who}: `) : '', text)
    logList.append(row)
    while (logList.children.length > 40) logList.firstElementChild!.remove()
    logList.scrollTop = logList.scrollHeight
    setTimeout(() => row.classList.add('faded'), LOG_FADE_MS)
  }

  const codeBadge = h('button', { class: 'badge', on: { click: () => openGate() } })
  const renderBadge = () => (codeBadge.textContent = `${isPublic ? 'Public' : 'Private'} · ${code}`)
  renderBadge()
  const statusBadge = h('div', { class: 'conn' })

  const sayInput = h('input', { class: 'say-input', placeholder: 'Say something...', maxLength: LIMITS.say, enterKeyHint: 'send', autocomplete: 'off' })
  const say = () => {
    const text = sayInput.value.trim()
    if (!text) return
    conn.send({ t: 'say', text })
    sayInput.value = ''
    sayInput.blur()
  }
  sayInput.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') say()
  })
  const sayBar = h('div', { class: 'say-bar' }, sayInput, h('button', { class: 'primary', on: { click: say } }, 'Say'))

  const placeBtn = h('button', {
    class: 'primary place-btn',
    on: {
      click: () => {
        const mine = players.get(me)
        if (!mine?.holding) return
        const spot = clampToMap({ x: mine.x + mine.pose.facing * PLACE_AHEAD, y: mine.y + 8 })
        conn.send({ t: 'place', x: spot.x, y: spot.y })
      },
    },
  }, 'Place it here')
  const renderPlaceBtn = () => placeBtn.classList.toggle('show', !!players.get(me)?.holding)

  ui.append(log, h('div', { class: 'top-right' }, statusBadge, codeBadge), placeBtn, sayBar)

  const shareUrl = () => `${location.origin}${import.meta.env.BASE_URL}${code}`

  const openModal = (content: HTMLElement) => {
    modalOpen = true
    const close = () => {
      modalOpen = false
      wrap.remove()
    }
    const wrap = h('div', { class: 'overlay dim', on: { click: (e) => e.target === wrap && close() } }, content)
    root.append(wrap)
    return close
  }

  function openGate() {
    const copyBtn = h('button', {
      class: 'primary',
      on: {
        click: async () => {
          const url = shareUrl()
          if (navigator.share) await navigator.share({ title: 'Hallow Playground', url }).catch(() => {})
          else {
            await navigator.clipboard?.writeText(url)
            copyBtn.textContent = 'Link copied!'
          }
        },
      },
    }, 'Share invite link')
    const visBtn = h('button', {
      on: {
        click: () => {
          conn.send({ t: 'visibility', public: !isPublic })
          close()
        },
      },
    }, isPublic ? 'Make it private' : 'Make it public')
    const close = openModal(
      h(
        'div',
        { class: 'dialog' },
        h('h3', {}, 'Playground'),
        h('p', {}, 'Playground code'),
        h('p', { class: 'big-code' }, code),
        h('p', { class: 'muted' }, isPublic ? 'Anyone can find this playground in the lobby.' : 'Only people with the code or link can come in.'),
        h('div', { class: 'row' }, copyBtn, visBtn),
        h('div', { class: 'row' }, h('button', { on: { click: () => close() } }, 'Close'), h('a', { class: 'link', href: import.meta.env.BASE_URL }, 'Leave to lobby')),
      ),
    )
  }

  function talkTo(npc: NpcState) {
    let i = 0
    const text = h('p', { class: 'npc-line' })
    const buttons = h('div', { class: 'row' })
    const box = h('div', { class: 'dialog npc' }, h('h3', {}, npc.name), text, buttons)
    const close = openModal(box)
    const step = () => {
      text.textContent = npc.lines[i]
      buttons.replaceChildren()
      if (i < npc.lines.length - 1) {
        buttons.append(h('button', { class: 'primary', on: { click: () => (i++, step()) } }, 'Next'))
        return
      }
      const a = npc.action
      if (a.kind === 'link') buttons.append(h('a', { class: 'button primary', href: a.url, target: '_blank', rel: 'noopener' }, a.label))
      if (a.kind === 'carve')
        buttons.append(
          h('button', {
            class: 'primary',
            on: {
              click: async () => {
                close()
                modalOpen = true
                const carving = await openCarver(root)
                modalOpen = false
                if (carving) conn.send({ t: 'hold', carving })
              },
            },
          }, 'Carve a pumpkin'),
        )
      if (a.kind === 'gate') buttons.append(h('button', { class: 'primary', on: { click: () => (close(), openGate()) } }, 'Open the gate'))
      buttons.append(h('button', { on: { click: () => close() } }, 'Bye'))
    }
    step()
  }

  const onMessage = (m: ServerMsg) => {
    switch (m.t) {
      case 'welcome': {
        me = m.you
        isPublic = m.public
        renderBadge()
        players.clear()
        for (const p of m.players) players.set(p.id, toPlayer(p))
        pumpkins.splice(0, pumpkins.length, ...m.pumpkins)
        const mine = players.get(me)
        if (mine) Object.assign(cam, { x: mine.x, y: mine.y })
        renderPlaceBtn()
        addLog('', `You are in playground ${m.code}. Tap the ground to walk.`, 'info')
        return
      }
      case 'joined':
        players.set(m.player.id, toPlayer(m.player))
        addLog('', `${m.player.name} arrived.`, 'info')
        return
      case 'left': {
        const p = players.get(m.id)
        if (p) addLog('', `${p.name} left.`, 'info')
        players.delete(m.id)
        return
      }
      case 'walk': {
        const p = players.get(m.id)
        if (!p) return
        if (m.id !== me && Math.hypot(p.x - m.x, p.y - m.y) > 200) Object.assign(p, { x: m.x, y: m.y })
        Object.assign(p, { tx: m.tx, ty: m.ty })
        return
      }
      case 'say': {
        const p = players.get(m.id)
        if (p) p.bubble = { text: m.text, until: performance.now() + BUBBLE_MS }
        addLog(m.name, m.text)
        return
      }
      case 'visibility':
        isPublic = m.public
        renderBadge()
        addLog('', `This playground is now ${m.public ? 'public' : 'private'}.`, 'info')
        return
      case 'holding': {
        const p = players.get(m.id)
        if (p) p.holding = m.carving
        renderPlaceBtn()
        return
      }
      case 'placed':
        pumpkins.push(m.pumpkin)
        addLog('', `${m.pumpkin.by} placed a carved pumpkin.`, 'info')
        return
    }
  }

  const conn: Connection = connect(code, { t: 'join', name: profile.name, character: profile.character }, onMessage, (s) => {
    statusBadge.textContent = s === 'open' ? '' : s === 'reconnecting' ? 'Reconnecting...' : 'Disconnected. Reload to rejoin.'
    statusBadge.classList.toggle('show', s !== 'open')
  })

  const screenToWorld = (sx: number, sy: number) => ({
    x: cam.x + (sx - canvas.clientWidth / 2) / cam.zoom,
    y: cam.y + (sy - canvas.clientHeight / 2) / cam.zoom,
  })

  canvas.addEventListener('pointerdown', (e) => {
    if (modalOpen) return
    sayInput.blur()
    const w = screenToWorld(e.offsetX, e.offsetY)
    const npc = npcs.find((n) => Math.hypot(n.x - w.x, n.y - CHARACTER_H / 2 - w.y) < 60)
    const mine = players.get(me)
    if (!mine) return
    let target = clampToMap(w)
    pendingNpc = null
    if (npc) {
      pendingNpc = npc
      const side = mine.x < npc.x ? -1 : 1
      target = clampToMap({ x: npc.x + side * 80, y: npc.y + 10 })
      if (Math.hypot(mine.x - npc.x, mine.y - npc.y) < NPC_REACH) {
        pendingNpc = null
        talkTo(npc)
        return
      }
    }
    mine.tx = target.x
    mine.ty = target.y
    conn.send({ t: 'walk', x: target.x, y: target.y })
  })

  window.addEventListener('keydown', (e) => {
    if (modalOpen || document.activeElement === sayInput) return
    if (e.key === 'Enter' || e.key === 't') {
      e.preventDefault()
      sayInput.focus()
    }
  })

  if (import.meta.env.DEV) Object.assign(window, { __hp: { players, pumpkins, cam, me: () => me, npcs } })

  let last = performance.now()
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    for (const p of players.values()) advance(p, dt)
    for (const n of npcs) n.pose.phase += dt * IDLE_BOB_RATE
    const mine = players.get(me)
    if (mine && pendingNpc && Math.hypot(mine.x - pendingNpc.x, mine.y - pendingNpc.y) < NPC_REACH && !mine.pose.moving) {
      const npc = pendingNpc
      pendingNpc = null
      mine.pose.facing = npc.x > mine.x ? 1 : -1
      talkTo(npc)
    }

    const dpr = devicePixelRatio || 1
    const W = canvas.clientWidth
    const H = canvas.clientHeight
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
    }
    cam.zoom = Math.max(0.5, Math.min(1.3, Math.min(W, H) / 680))
    if (mine) {
      cam.x += (mine.x - cam.x) * Math.min(1, dt * 4)
      cam.y += (mine.y - CHARACTER_H / 2 - cam.y) * Math.min(1, dt * 4)
    }
    const halfW = W / 2 / cam.zoom
    const halfH = H / 2 / cam.zoom
    cam.x = halfW * 2 >= MAP_W ? MAP_W / 2 : Math.min(MAP_W - halfW, Math.max(halfW, cam.x))
    cam.y = halfH * 2 >= MAP_H ? MAP_H / 2 : Math.min(MAP_H - halfH, Math.max(halfH, cam.y))

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
    ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (W / 2 - cam.x * cam.zoom), dpr * (H / 2 - cam.y * cam.zoom))
    drawMap(ctx)

    type Drawable = { y: number; draw: () => void }
    const scene: Drawable[] = []
    for (const pk of pumpkins) scene.push({ y: pk.y, draw: () => drawCarvedPumpkin(ctx, pk.x, pk.y - PUMPKIN_R * 0.85, PUMPKIN_R, pk.cuts, pk.base ?? DEFAULT_BASE) })
    for (const n of npcs)
      scene.push({
        y: n.y,
        draw: () => {
          drawCharacter(ctx, n.x, n.y, n.sprite, n, n.pose)
        },
      })
    for (const p of players.values())
      scene.push({
        y: p.y,
        draw: () => {
          drawCharacter(ctx, p.x, p.y, p.character, characterDef(p.character), p.pose)
          if (p.holding) drawHeldPumpkin(ctx, p.x, p.y, p.pose, p.holding)
        },
      })
    scene.sort((a, b) => a.y - b.y).forEach((d) => d.draw())
    for (const n of npcs) drawLabel(ctx, n.x, n.y + 26, n.name)
    for (const p of players.values()) drawLabel(ctx, p.x, p.y + 26, p.id === me ? `${p.name} (you)` : p.name)

    for (const p of players.values()) {
      if (!p.bubble) continue
      const left = p.bubble.until - now
      if (left <= 0) p.bubble = undefined
      else drawBubble(ctx, p.x, p.y - CHARACTER_H - 10, p.bubble.text, Math.min(1, left / 600))
    }

    if (mine && mine.pose.moving) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(mine.tx, mine.ty, 18, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function toPlayer(v: PlayerView): Player {
  return { ...v, pose: { moving: false, phase: 0, facing: v.tx < v.x ? -1 : 1 } }
}

function advance(b: Body, dt: number) {
  const dist = Math.hypot(b.tx - b.x, b.ty - b.y)
  const moving = dist > 0.5
  if (moving) {
    if (Math.abs(b.tx - b.x) > 2) b.pose.facing = b.tx > b.x ? 1 : -1
    const next = stepToward(b, { x: b.tx, y: b.ty }, WALK_SPEED * dt)
    b.x = next.x
    b.y = next.y
    b.pose.phase += dt * WALK_BOB_RATE
  } else if (b.pose.moving) b.pose.phase = 0
  else b.pose.phase += dt * IDLE_BOB_RATE
  b.pose.moving = moving
}
