import { chromium } from 'playwright-core'

const URL = process.argv[2] ?? 'http://localhost:5173/hallow-playground/'
const OUT = '/tmp/hp-e2e'
const assert = (ok, what) => {
  if (!ok) throw new Error(`FAIL: ${what}`)
  console.log(`ok: ${what}`)
}
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell` })
const errors = []
const page = async (opts) => {
  const p = await (await browser.newContext(opts)).newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return p
}
const toScreen = (p, wx, wy) =>
  p.evaluate(([x, y]) => {
    const { cam } = window.__hp
    return { x: innerWidth / 2 + (x - cam.x) * cam.zoom, y: innerHeight / 2 + (y - cam.y) * cam.zoom }
  }, [wx, wy])
const mePos = (p) => p.evaluate(() => {
  const s = window.__hp
  const m = s.players.get(s.me())
  return { x: m.x, y: m.y }
})

const a = await page({ viewport: { width: 1280, height: 800 } })
await a.goto(URL)
await a.locator('.card').nth(1).click()
await a.fill('.name', 'Baangkok')
await a.click('text=Create a playground')
await a.waitForFunction(() => window.__hp?.me())
const code = a.url().split('/').filter(Boolean).pop()
assert(/^[A-Z2-9]{5}$/.test(code), `desktop created playground ${code}`)
await a.screenshot({ path: `${OUT}-a-spawn.png` })

const b = await page({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
await b.goto(`${URL}${code}`)
assert(await b.isVisible(`text=Enter playground ${code}`), 'tablet invite link skips straight to Enter')
await b.fill('.name', 'Her')
await b.click(`text=Enter playground ${code}`)
await b.waitForFunction(() => window.__hp?.me())
await a.waitForFunction(() => window.__hp.players.size === 2)
assert(true, 'desktop sees tablet player')

const before = await mePos(b)
const tap = await toScreen(b, before.x + 250, before.y - 150)
await b.touchscreen.tap(tap.x, tap.y)
await b.waitForTimeout(1500)
const after = await mePos(b)
assert(Math.hypot(after.x - before.x - 250, after.y - before.y + 150) < 5, 'tablet tap-to-walk arrives')
const seen = await a.evaluate(() => [...window.__hp.players.values()].find((p) => p.name === 'Her'))
assert(Math.hypot(seen.x - after.x, seen.y - after.y) < 5, 'desktop sees tablet move to the same spot')

await b.fill('.say-input', 'happy halloween')
await b.click('.say-bar button')
await a.waitForSelector('.log-row:has-text("happy halloween")')
assert(true, 'say shows in the other chat log')
await a.waitForTimeout(200)
await a.screenshot({ path: `${OUT}-a-say.png` })

const patch = await a.evaluate(() => window.__hp.npcs.find((n) => n.id === 'npc-2'))
const ps = await toScreen(a, patch.x, patch.y - 48)
await a.mouse.click(ps.x, ps.y)
await a.waitForSelector('.npc-line', { timeout: 8000 })
assert(true, 'walked to the carving NPC and dialogue opened')
while (await a.isVisible('.dialog button:has-text("Next")')) await a.click('.dialog button:has-text("Next")')
await a.click('text=Carve a pumpkin')
await a.click('.base-pick[data-id="base-3"]')
const box = await a.locator('.carve-canvas').boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2
for (const [dx, dy] of [[-90, -40], [-40, -40], [-65, 0], [-90, -40]]) await a.mouse.click(cx + dx, cy + dy)
for (const [dx, dy] of [[40, -40], [90, -40], [65, 0], [40, -40]]) await a.mouse.click(cx + dx, cy + dy)
for (const [dx, dy] of [[-90, 50], [90, 50], [0, 90], [-90, 50]]) await a.mouse.click(cx + dx, cy + dy)
await a.screenshot({ path: `${OUT}-a-carve.png` })
await a.click('text=Place it here')
await b.waitForFunction(() => window.__hp.pumpkins.length === 1)
const placed = await b.evaluate(() => window.__hp.pumpkins[0].cuts.length)
assert(placed === 3, 'tablet sees the placed pumpkin with 3 cuts')
assert((await b.evaluate(() => window.__hp.pumpkins[0].base)) === 'base-3', 'tablet sees the chosen Pumpkin Base')

const pk = await b.evaluate(() => window.__hp.pumpkins[0])
const pt = await toScreen(b, pk.x - 120, pk.y + 40)
await b.touchscreen.tap(pt.x, pt.y)
await b.waitForTimeout(4000)
await b.screenshot({ path: `${OUT}-b-pumpkin.png` })

const crow = await a.evaluate(() => window.__hp.npcs.find((n) => n.id === 'npc-3'))
for (let i = 0; i < 8 && !(await a.isVisible('.npc-line')); i++) {
  const cs = await toScreen(a, crow.x, crow.y - 48)
  await a.mouse.click(Math.min(1000, Math.max(380, cs.x)), Math.min(650, Math.max(150, cs.y)))
  await a.waitForTimeout(2500)
}
await a.waitForSelector('.npc-line', { timeout: 6000 })
while (await a.isVisible('.dialog button:has-text("Next")')) await a.click('.dialog button:has-text("Next")')
const href = await a.getAttribute('.dialog a.button', 'href')
assert(href === 'https://x.com/meisbk', 'link NPC offers the X link')
await a.click('text=Bye')

await b.reload()
await b.waitForSelector('.name')
assert((await b.inputValue('.name')) === 'Her', 'browser remembers the name after reload')

assert(errors.length === 0, `no page errors ${errors.join(' | ')}`)
await browser.close()
console.log('ALL OK')
