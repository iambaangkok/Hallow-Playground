const base = process.argv[2] ?? 'http://localhost:8790/playground/api'
const assert = (ok, what) => {
  if (!ok) throw new Error(`FAIL: ${what}`)
  console.log(`ok: ${what}`)
}

function client(code, name) {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/playgrounds/${code}/ws`)
  const inbox = []
  const waiters = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    inbox.push(m)
    for (const w of [...waiters]) if (w.pred(m)) (waiters.splice(waiters.indexOf(w), 1), w.res(m))
  }
  const next = (pred, ms = 3000) =>
    new Promise((res, rej) => {
      const hit = inbox.find(pred)
      if (hit) return res(hit)
      waiters.push({ pred, res })
      setTimeout(() => rej(new Error(`timeout waiting in ${name}`)), ms)
    })
  const send = (m) => ws.send(JSON.stringify(m))
  const open = new Promise((r) => (ws.onopen = r))
  return { ws, next, send, open }
}

const created = await (await fetch(`${base}/playgrounds`, { method: 'POST', body: JSON.stringify({ public: true }) })).json()
assert(/^[A-Z2-9]{5}$/.test(created.code), `created playground ${created.code}`)
assert((await fetch(`${base}/playgrounds/ZZZZZ`)).status === 404, 'unknown code is 404')

const a = client(created.code, 'a')
await a.open
a.send({ t: 'join', name: 'Baangkok', character: 'character-1' })
const wa = await a.next((m) => m.t === 'welcome')
assert(wa.code === created.code && wa.players.length === 1, 'first player welcomed alone')

const b = client(created.code, 'b')
await b.open
b.send({ t: 'join', name: 'Her', character: 'character-2' })
const wb = await b.next((m) => m.t === 'welcome')
assert(wb.players.length === 2, 'second player sees both')
await a.next((m) => m.t === 'joined' && m.player.name === 'Her')
assert(true, 'first player told about second')

const list = await (await fetch(`${base}/public`)).json()
assert(list.some((p) => p.code === created.code && p.players === 2), 'public list shows 2 players')

b.send({ t: 'walk', x: 500, y: 600 })
const walk = await a.next((m) => m.t === 'walk' && m.tx === 500)
assert(walk.id === wb.you, 'walk relayed')

a.send({ t: 'say', text: 'boo' })
assert((await b.next((m) => m.t === 'say')).text === 'boo', 'say relayed')

a.send({ t: 'place', x: 900, y: 900 })
a.send({ t: 'hold', carving: { base: 'base-2', cuts: [[{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.35, y: 0.4 }]] } })
const held = await b.next((m) => m.t === 'holding' && m.carving)
assert(held.carving.base === 'base-2', 'holding a carved pumpkin is relayed')
const late = client(created.code, 'late')
await late.open
late.send({ t: 'join', name: 'Peek', character: 'character-4' })
const wl = await late.next((m) => m.t === 'welcome')
assert(wl.players.some((p) => p.holding?.cuts.length === 1), 'a late joiner sees what others hold')
assert(wl.pumpkins.length === 0, 'place without holding did nothing')
late.ws.close()
a.send({ t: 'place', x: 900, y: 900 })
assert((await b.next((m) => m.t === 'placed')).pumpkin.cuts.length === 1, 'pumpkin placed and relayed')
assert((await b.next((m) => m.t === 'holding' && m.carving === null)).id === wa.you, 'hands are empty after placing')

b.ws.close()
await a.next((m) => m.t === 'left')
assert(true, 'leave relayed')
a.ws.close()
await new Promise((r) => setTimeout(r, 300))

const c = client(created.code, 'c')
await c.open
c.send({ t: 'join', name: 'Later', character: 'character-3' })
const wc = await c.next((m) => m.t === 'welcome')
assert(wc.pumpkins.length === 1, 'pumpkin persists after everyone left')
c.ws.close()
console.log('ALL OK')
process.exit(0)
