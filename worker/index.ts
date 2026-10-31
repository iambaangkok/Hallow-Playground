import { DurableObject } from 'cloudflare:workers'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  LIMITS,
  WALK_SPEED,
  isPlaygroundCode,
  parseClientMsg,
  type Carving,
  type PlayerView,
  type PublicPlayground,
  type Pumpkin,
  type ServerMsg,
} from '../src/shared/protocol'
import { SPAWN, clampToMap, stepToward } from '../src/shared/world'

interface Env {
  ASSETS: Fetcher
  PLAYGROUND: DurableObjectNamespace<PlaygroundRoom>
  DIRECTORY: DurableObjectNamespace<Directory>
}

const API = '/hallow-playground/api'

type Walk = { fx: number; fy: number; tx: number; ty: number; at: number }
type Seat = { id: string; name: string; character: string; walk: Walk }

function positionAt(w: Walk, now: number) {
  return stepToward({ x: w.fx, y: w.fy }, { x: w.tx, y: w.ty }, ((now - w.at) / 1000) * WALK_SPEED)
}

function view(s: Seat, now: number, holding: Carving | null = null): PlayerView {
  const p = positionAt(s.walk, now)
  return { id: s.id, name: s.name, character: s.character, x: p.x, y: p.y, tx: s.walk.tx, ty: s.walk.ty, holding }
}

/** Held Carvings live in storage, not the socket attachment, which is capped at 2 KB. */
const heldKey = (id: string) => `held:${id}`

export class PlaygroundRoom extends DurableObject<Env> {
  async init(code: string, isPublic: boolean): Promise<void> {
    await this.ctx.storage.put({ code, public: isPublic })
  }

  async exists(): Promise<boolean> {
    return (await this.ctx.storage.get<string>('code')) !== undefined
  }

  async fetch(req: Request): Promise<Response> {
    if (!(await this.exists())) return new Response('no such playground', { status: 404 })
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 })
    if (this.seats().length >= LIMITS.playersPerPlayground) return new Response('playground full', { status: 409 })
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  private seats(): { ws: WebSocket; seat: Seat }[] {
    return this.ctx
      .getWebSockets()
      .map((ws) => ({ ws, seat: ws.deserializeAttachment() as Seat | null }))
      .filter((x): x is { ws: WebSocket; seat: Seat } => x.seat !== null)
  }

  private broadcast(msg: ServerMsg, except?: WebSocket) {
    const data = JSON.stringify(msg)
    for (const { ws } of this.seats()) {
      if (ws === except) continue
      try {
        ws.send(data)
      } catch {}
    }
  }

  private async pumpkins(): Promise<Pumpkin[]> {
    const map = await this.ctx.storage.list<Pumpkin>({ prefix: 'pumpkin:' })
    return [...map.values()]
  }

  private async report() {
    const code = await this.ctx.storage.get<string>('code')
    const isPublic = (await this.ctx.storage.get<boolean>('public')) ?? false
    if (!code) return
    const dir = this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('all'))
    await dir.update(code, isPublic, this.seats().length)
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const msg = parseClientMsg(raw)
    if (!msg) return
    const now = Date.now()
    const seat = ws.deserializeAttachment() as Seat | null

    if (msg.t === 'join') {
      if (seat) return
      const id = crypto.randomUUID().slice(0, 8)
      const jitter = () => (Math.random() - 0.5) * 120
      const start = clampToMap({ x: SPAWN.x + jitter(), y: SPAWN.y + jitter() })
      const fresh: Seat = { id, name: msg.name, character: msg.character, walk: { fx: start.x, fy: start.y, tx: start.x, ty: start.y, at: now } }
      ws.serializeAttachment(fresh)
      const others = this.seats().filter((s) => s.ws !== ws)
      const welcome: ServerMsg = {
        t: 'welcome',
        you: id,
        code: (await this.ctx.storage.get<string>('code')) ?? '',
        public: (await this.ctx.storage.get<boolean>('public')) ?? false,
        players: [
          view(fresh, now),
          ...(await Promise.all(others.map(async (s) => view(s.seat, now, (await this.ctx.storage.get<Carving>(heldKey(s.seat.id))) ?? null)))),
        ],
        pumpkins: await this.pumpkins(),
      }
      ws.send(JSON.stringify(welcome))
      this.broadcast({ t: 'joined', player: view(fresh, now) }, ws)
      await this.report()
      return
    }
    if (!seat) return

    switch (msg.t) {
      case 'walk': {
        const from = positionAt(seat.walk, now)
        const to = clampToMap(msg)
        seat.walk = { fx: from.x, fy: from.y, tx: to.x, ty: to.y, at: now }
        ws.serializeAttachment(seat)
        this.broadcast({ t: 'walk', id: seat.id, x: from.x, y: from.y, tx: to.x, ty: to.y })
        return
      }
      case 'say':
        this.broadcast({ t: 'say', id: seat.id, name: seat.name, text: msg.text })
        return
      case 'visibility':
        await this.ctx.storage.put('public', msg.public)
        this.broadcast({ t: 'visibility', public: msg.public })
        await this.report()
        return
      case 'hold':
        await this.ctx.storage.put(heldKey(seat.id), msg.carving)
        this.broadcast({ t: 'holding', id: seat.id, carving: msg.carving })
        return
      case 'place': {
        const held = await this.ctx.storage.get<Carving>(heldKey(seat.id))
        if (!held) return
        const existing = await this.ctx.storage.list({ prefix: 'pumpkin:' })
        if (existing.size >= LIMITS.pumpkinsPerPlayground) return
        const spot = clampToMap(msg)
        const pumpkin: Pumpkin = { ...held, id: `${now.toString(36)}${crypto.randomUUID().slice(0, 4)}`, x: spot.x, y: spot.y, by: seat.name, at: now }
        await this.ctx.storage.put(`pumpkin:${pumpkin.id}`, pumpkin)
        await this.ctx.storage.delete(heldKey(seat.id))
        this.broadcast({ t: 'holding', id: seat.id, carving: null })
        this.broadcast({ t: 'placed', pumpkin })
        return
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.leave(ws)
  }

  async webSocketError(ws: WebSocket) {
    await this.leave(ws)
  }

  private async leave(ws: WebSocket) {
    const seat = ws.deserializeAttachment() as Seat | null
    ws.serializeAttachment(null)
    try {
      ws.close(1000, 'bye')
    } catch {}
    if (seat) {
      await this.ctx.storage.delete(heldKey(seat.id))
      this.broadcast({ t: 'left', id: seat.id }, ws)
    }
    await this.report()
  }
}

type Listing = { public: boolean; players: number; at: number }

export class Directory extends DurableObject<Env> {
  async update(code: string, isPublic: boolean, players: number): Promise<void> {
    if (!isPublic || players === 0) await this.ctx.storage.delete(code)
    else await this.ctx.storage.put<Listing>(code, { public: isPublic, players, at: Date.now() })
  }

  async list(): Promise<PublicPlayground[]> {
    const stale = Date.now() - 6 * 60 * 60 * 1000
    const all = await this.ctx.storage.list<Listing>()
    return [...all.entries()]
      .filter(([, l]) => l.at > stale)
      .map(([code, l]) => ({ code, players: l.players }))
      .sort((a, b) => b.players - a.players)
      .slice(0, 30)
  }
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.startsWith(API)) return env.ASSETS.fetch(req)
    const parts = url.pathname.slice(API.length).split('/').filter(Boolean)

    if (parts[0] === 'public' && req.method === 'GET') {
      return json(await env.DIRECTORY.get(env.DIRECTORY.idFromName('all')).list())
    }

    if (parts[0] === 'playgrounds' && parts.length === 1 && req.method === 'POST') {
      const body = (await req.json().catch(() => ({}))) as { public?: unknown }
      for (let i = 0; i < 5; i++) {
        const code = newCode()
        const stub = env.PLAYGROUND.get(env.PLAYGROUND.idFromName(code))
        if (await stub.exists()) continue
        await stub.init(code, body.public === true)
        return json({ code })
      }
      return json({ error: 'try again' }, 503)
    }

    if (parts[0] === 'playgrounds' && parts[1]) {
      const code = parts[1].toUpperCase()
      if (!isPlaygroundCode(code)) return json({ error: 'bad code' }, 400)
      const stub = env.PLAYGROUND.get(env.PLAYGROUND.idFromName(code))
      if (parts[2] === 'ws') return stub.fetch(req)
      return (await stub.exists()) ? json({ code }) : json({ error: 'not found' }, 404)
    }

    return json({ error: 'not found' }, 404)
  },
} satisfies ExportedHandler<Env>
