import type { Cut } from '../shared/protocol'
import { DEFAULT_BASE, PUMPKIN_BASES, type PumpkinBaseId } from '../shared/pumpkins'
import { MAP_H, MAP_W } from '../shared/world'
import { spriteFor } from './roster'

export const CHARACTER_H = 96

type Place = { kind: 'house' | 'stall' | 'tree' | 'grave' | 'patch'; x: number; y: number; w: number; h: number; color: string; label?: string }

/** Placeholder scenery until the hand-drawn Map arrives at public/map.png. */
const PLACES: Place[] = [
  { kind: 'house', x: 260, y: 230, w: 260, h: 200, color: '#4b2f5e', label: 'Crooked House' },
  { kind: 'house', x: 1000, y: 140, w: 320, h: 230, color: '#3a2d4f', label: 'Haunted Manor' },
  { kind: 'house', x: 2000, y: 760, w: 240, h: 190, color: '#5a2f3d', label: "Witch's Hut" },
  { kind: 'stall', x: 760, y: 820, w: 200, h: 120, color: '#9b3d2f', label: 'Candy Stall' },
  { kind: 'stall', x: 1260, y: 820, w: 200, h: 120, color: '#2f6b5b', label: 'Potion Stall' },
  { kind: 'patch', x: 1560, y: 1100, w: 420, h: 300, color: '#3d2a14', label: 'Pumpkin Patch' },
  { kind: 'grave', x: 180, y: 1100, w: 380, h: 300, color: '#2c2a36', label: 'Graveyard' },
  ...[180, 700, 1500, 1700, 2250, 90, 2300, 900, 600].map((x, i): Place => ({
    kind: 'tree',
    x,
    y: [700, 260, 300, 160, 300, 500, 1300, 1480, 1500][i],
    w: 90,
    h: 140,
    color: '#1d1527',
  })),
]

let mapImage: HTMLImageElement | null = null
{
  const img = new Image()
  img.onload = () => (mapImage = img)
  img.src = `${import.meta.env.BASE_URL}map.png`
}

export function drawMap(ctx: CanvasRenderingContext2D, t: number) {
  if (mapImage) {
    ctx.drawImage(mapImage, 0, 0, MAP_W, MAP_H)
    return
  }
  const g = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, 200, MAP_W / 2, MAP_H / 2, MAP_W * 0.7)
  g.addColorStop(0, '#2e4030')
  g.addColorStop(1, '#17201a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, MAP_W, MAP_H)

  ctx.strokeStyle = '#4a4252'
  ctx.lineWidth = 90
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(1200, MAP_H)
  ctx.lineTo(1200, 1000)
  ctx.lineTo(500, 700)
  ctx.lineTo(400, 450)
  ctx.moveTo(1200, 1000)
  ctx.lineTo(1160, 420)
  ctx.moveTo(1200, 1000)
  ctx.lineTo(1900, 900)
  ctx.lineTo(1950, 500)
  ctx.moveTo(1200, 1000)
  ctx.lineTo(1750, 1200)
  ctx.moveTo(1200, 1000)
  ctx.lineTo(450, 1220)
  ctx.stroke()

  ctx.strokeStyle = '#2a2230'
  ctx.lineWidth = 14
  ctx.strokeRect(20, 20, MAP_W - 40, MAP_H - 40)

  for (const p of PLACES) drawPlace(ctx, p, t)
}

function drawPlace(ctx: CanvasRenderingContext2D, p: Place, t: number) {
  ctx.save()
  switch (p.kind) {
    case 'tree': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + p.h / 2, p.w / 2, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = p.color
      ctx.lineWidth = 16
      ctx.beginPath()
      ctx.moveTo(p.x, p.y + p.h / 2)
      ctx.lineTo(p.x, p.y - p.h / 2)
      ctx.moveTo(p.x, p.y - 10)
      ctx.lineTo(p.x - 40, p.y - 50)
      ctx.moveTo(p.x, p.y - 30)
      ctx.lineTo(p.x + 44, p.y - 70)
      ctx.stroke()
      break
    }
    case 'patch': {
      ctx.fillStyle = p.color
      roundRect(ctx, p.x, p.y, p.w, p.h, 30)
      ctx.fill()
      for (let i = 0; i < 9; i++) {
        const px = p.x + 60 + (i % 3) * 140
        const py = p.y + 60 + Math.floor(i / 3) * 90
        drawPumpkinBody(ctx, px, py, 26)
      }
      break
    }
    case 'grave': {
      ctx.fillStyle = p.color
      roundRect(ctx, p.x, p.y, p.w, p.h, 20)
      ctx.fill()
      ctx.fillStyle = '#6d6878'
      for (let i = 0; i < 6; i++) {
        const gx = p.x + 50 + (i % 3) * 120
        const gy = p.y + 70 + Math.floor(i / 3) * 120
        roundRect(ctx, gx, gy, 46, 60, 18)
        ctx.fill()
      }
      break
    }
    default: {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      roundRect(ctx, p.x + 10, p.y + 16, p.w, p.h, 12)
      ctx.fill()
      ctx.fillStyle = p.color
      roundRect(ctx, p.x, p.y, p.w, p.h, 12)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.moveTo(p.x - 14, p.y + p.h * 0.35)
      ctx.lineTo(p.x + p.w / 2, p.y - 40)
      ctx.lineTo(p.x + p.w + 14, p.y + p.h * 0.35)
      ctx.closePath()
      ctx.fill()
      const flicker = 0.75 + 0.25 * Math.sin(t * 7 + p.x)
      ctx.fillStyle = `rgba(255, 200, 80, ${flicker})`
      if (p.kind === 'house') {
        ctx.fillRect(p.x + p.w * 0.2, p.y + p.h * 0.45, 34, 34)
        ctx.fillRect(p.x + p.w * 0.7, p.y + p.h * 0.45, 34, 34)
      } else {
        ctx.fillRect(p.x + 14, p.y + p.h - 36, p.w - 28, 12)
      }
    }
  }
  if (p.label) {
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,240,220,0.75)'
    ctx.fillText(p.label, p.x + (p.kind === 'tree' ? 0 : p.w / 2), p.y + p.h + 34)
  }
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export type Pose = { moving: boolean; phase: number; facing: 1 | -1 }

/** Bob: the drawing bounces as one piece and flips to face its direction. */
export function bobOffset(pose: Pose, t: number): { lift: number; squash: number } {
  if (pose.moving) {
    const s = Math.abs(Math.sin(pose.phase))
    return { lift: s * 16, squash: 1 - (1 - s) * 0.08 }
  }
  return { lift: 0, squash: 1 + Math.sin(t * 2.2) * 0.015 }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: string,
  colors: { color: string; accent: string },
  pose: Pose,
  t: number,
  size = CHARACTER_H,
) {
  const { lift, squash } = bobOffset(pose, t)
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x, y, size * 0.32 * (1 - lift / 60), size * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.translate(x, y - lift)
  ctx.scale(pose.facing / squash, squash)
  const img = spriteFor(sprite)
  if (img) {
    const h = size
    const w = (img.width / img.height) * h
    ctx.drawImage(img, -w / 2, -h, w, h)
  } else {
    drawPlaceholder(ctx, size, colors)
  }
  ctx.restore()
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, size: number, c: { color: string; accent: string }) {
  const w = size * 0.8
  const h = size
  ctx.fillStyle = c.color
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-w / 2, -6)
  ctx.lineTo(-w / 2, -h + w / 2)
  ctx.arc(0, -h + w / 2, w / 2, Math.PI, 0)
  ctx.lineTo(w / 2, -6)
  ctx.quadraticCurveTo(w / 4, 6, 0, -6)
  ctx.quadraticCurveTo(-w / 4, 6, -w / 2, -6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.ellipse(-w * 0.05, -h * 0.62, size * 0.06, size * 0.09, 0, 0, Math.PI * 2)
  ctx.ellipse(w * 0.25, -h * 0.62, size * 0.06, size * 0.09, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#fff6e8') {
  ctx.save()
  ctx.font = '600 18px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(10,6,16,0.85)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
}

export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = '500 18px system-ui, sans-serif'
  const lines = wrap(ctx, text, 220)
  const lh = 22
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24
  const h = lines.length * lh + 14
  const bx = x - w / 2
  const by = y - h - 14
  ctx.fillStyle = '#fff8ec'
  ctx.strokeStyle = '#2a1f3d'
  ctx.lineWidth = 3
  roundRect(ctx, bx, by, w, h, 14)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 8, by + h - 1)
  ctx.lineTo(x, by + h + 12)
  ctx.lineTo(x + 8, by + h - 1)
  ctx.fill()
  ctx.fillStyle = '#2a1f3d'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, x, by + 8 + i * lh))
  ctx.restore()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      out.push(line)
      line = word
    } else line = next
  }
  if (line) out.push(line)
  return out.slice(0, 5)
}

const baseImages = new Map<PumpkinBaseId, HTMLImageElement>()
for (const b of PUMPKIN_BASES) {
  const img = new Image()
  img.onload = () => baseImages.set(b.id, img)
  img.src = `${import.meta.env.BASE_URL}pumpkins/${b.id}.png`
}

const baseDef = (id: PumpkinBaseId) => PUMPKIN_BASES.find((b) => b.id === id) ?? PUMPKIN_BASES[0]

/** The rectangle Cuts are measured in: the base drawing's bounds, or the placeholder's. */
export function pumpkinBox(x: number, y: number, r: number, base: PumpkinBaseId) {
  const img = baseImages.get(base)
  const w = r * 2.1
  const h = img ? (w * img.height) / img.width : w * baseDef(base).aspect
  return { left: x - w / 2, top: y - h / 2, w, h }
}

export function drawPumpkinBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, base: PumpkinBaseId = DEFAULT_BASE) {
  const b = pumpkinBox(x, y, r, base)
  const img = baseImages.get(base)
  if (img) {
    ctx.drawImage(img, b.left, b.top, b.w, b.h)
    return
  }
  const def = baseDef(base)
  const ry = b.h / 2
  ctx.save()
  ctx.fillStyle = '#5a3a12'
  ctx.fillRect(x - r * 0.1, b.top - r * 0.2, r * 0.2, r * 0.35)
  for (const [dx, sx, shade] of [
    [-0.45, 0.6, def.side],
    [0.45, 0.6, def.side],
    [0, 0.62, def.mid],
  ] as const) {
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.ellipse(x + dx * r, y, r * sx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** A carved Pumpkin: body plus each Cut filled with candle light. Cuts are 0..1 across the pumpkin's box. */
export function drawCarvedPumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, cuts: Cut[], t: number, base: PumpkinBaseId) {
  const flicker = 0.85 + 0.15 * Math.sin(t * 9 + x) * Math.sin(t * 5.3 + y)
  ctx.save()
  if (cuts.length) {
    const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.4)
    halo.addColorStop(0, `rgba(255, 170, 60, ${0.35 * flicker})`)
    halo.addColorStop(1, 'rgba(255, 170, 60, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8)
  }
  drawPumpkinBody(ctx, x, y, r, base)
  const { left, top, w, h } = pumpkinBox(x, y, r, base)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r)
  glow.addColorStop(0, `rgba(255, 245, 170, ${flicker})`)
  glow.addColorStop(1, `rgba(255, 150, 30, ${flicker})`)
  ctx.fillStyle = glow
  ctx.strokeStyle = '#7a3a08'
  ctx.lineWidth = Math.max(1, r * 0.03)
  for (const cut of cuts) {
    ctx.beginPath()
    cut.forEach((p, i) => (i ? ctx.lineTo(left + p.x * w, top + p.y * h) : ctx.moveTo(left + p.x * w, top + p.y * h)))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}
