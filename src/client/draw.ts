import type { Cut } from '../shared/protocol'
import { DEFAULT_BASE, PUMPKIN_BASES, type PumpkinBaseId } from '../shared/pumpkins'
import { MAP_H, MAP_W } from '../shared/world'
import { spriteFor } from './roster'

export const CHARACTER_H = 96

type Place = { x: number; y: number; w: number; h: number; label: string }

/** Neutral placeholder boxes until the owner's Map arrives at public/map.png. */
const PLACES: Place[] = [
  { x: 260, y: 230, w: 260, h: 200, label: 'House 1' },
  { x: 1000, y: 140, w: 320, h: 230, label: 'House 2' },
  { x: 2000, y: 760, w: 240, h: 190, label: 'House 3' },
  { x: 760, y: 820, w: 200, h: 120, label: 'Vendor 1' },
  { x: 1260, y: 820, w: 200, h: 120, label: 'Vendor 2' },
  { x: 1560, y: 1100, w: 420, h: 300, label: 'Carving spot' },
]

let mapImage: HTMLImageElement | null = null
{
  const img = new Image()
  img.onload = () => (mapImage = img)
  img.src = `${import.meta.env.BASE_URL}map.png`
}

export function drawMap(ctx: CanvasRenderingContext2D) {
  if (mapImage) {
    ctx.drawImage(mapImage, 0, 0, MAP_W, MAP_H)
    return
  }
  ctx.fillStyle = '#161616'
  ctx.fillRect(0, 0, MAP_W, MAP_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let x = 0; x <= MAP_W; x += 100) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, MAP_H)
  }
  for (let y = 0; y <= MAP_H; y += 100) {
    ctx.moveTo(0, y)
    ctx.lineTo(MAP_W, y)
  }
  ctx.stroke()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4
  ctx.strokeRect(20, 20, MAP_W - 40, MAP_H - 40)

  for (const p of PLACES) drawPlace(ctx, p)
}

function drawPlace(ctx: CanvasRenderingContext2D, p: Place) {
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.strokeRect(p.x, p.y, p.w, p.h)
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(p.label, p.x + p.w / 2, p.y + p.h / 2)
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export type Pose = { moving: boolean; phase: number; facing: 1 | -1 }

/** Bob: the drawing bounces as one piece and flips to face its direction. */
export function bobOffset(pose: Pose): { lift: number; squash: number } {
  if (pose.moving) {
    const s = Math.abs(Math.sin(pose.phase))
    return { lift: s * 16, squash: 1 - (1 - s) * 0.08 }
  }
  return { lift: 0, squash: 1 }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: string,
  colors: { color: string; accent: string },
  pose: Pose,
  size = CHARACTER_H,
) {
  const { lift, squash } = bobOffset(pose)
  ctx.save()
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

/** Neutral box with a facing arrow, standing in for the owner's drawing. */
function drawPlaceholder(ctx: CanvasRenderingContext2D, size: number, c: { color: string; accent: string }) {
  const w = size * 0.8
  ctx.fillStyle = c.color
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 3
  roundRect(ctx, -w / 2, -size, w, size, 10)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.moveTo(w * 0.3, -size * 0.6)
  ctx.lineTo(w * 0.05, -size * 0.72)
  ctx.lineTo(w * 0.05, -size * 0.48)
  ctx.closePath()
  ctx.fill()
}

export function drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#ffffff') {
  ctx.save()
  ctx.font = '600 18px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#161616'
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
  ctx.fillStyle = '#161616'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  roundRect(ctx, bx, by, w, h, 14)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 8, by + h)
  ctx.lineTo(x, by + h + 12)
  ctx.lineTo(x + 8, by + h)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
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
  ctx.save()
  ctx.fillStyle = '#161616'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(2, r * 0.05)
  ctx.beginPath()
  ctx.ellipse(x, y, b.w / 2, b.h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** A carved Pumpkin: the base with each Cut filled in. Cuts are 0..1 across the base's box. */
export function drawCarvedPumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, cuts: Cut[], base: PumpkinBaseId) {
  drawPumpkinBody(ctx, x, y, r, base)
  const { left, top, w, h } = pumpkinBox(x, y, r, base)
  ctx.save()
  ctx.fillStyle = '#ffffff'
  for (const cut of cuts) {
    ctx.beginPath()
    cut.forEach((p, i) => (i ? ctx.lineTo(left + p.x * w, top + p.y * h) : ctx.moveTo(left + p.x * w, top + p.y * h)))
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
