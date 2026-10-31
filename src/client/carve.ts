import type { Carving, Cut, Point } from '../shared/protocol'
import { LIMITS } from '../shared/protocol'
import { h } from './dom'
import { DEFAULT_BASE, PUMPKIN_BASES, type PumpkinBaseId } from '../shared/pumpkins'
import { drawCarvedPumpkin, drawPumpkinBody, pumpkinBox } from './draw'

const CLOSE_RADIUS_PX = 26

/** Pick a Pumpkin Base, then pen-tool carve: tap points, tap the first point again to cut. Null on cancel. */
export function openCarver(root: HTMLElement): Promise<Carving | null> {
  return new Promise((resolve) => {
    const cuts: Cut[] = []
    let pen: Point[] = []
    let raf = 0
    let base: PumpkinBaseId = DEFAULT_BASE

    const canvas = h('canvas', { class: 'carve-canvas' })
    const hint = h('p', { class: 'hint' }, 'Tap to place points. Tap the first point again to cut.')
    const done = (result: Carving | null) => {
      cancelAnimationFrame(raf)
      panel.remove()
      resolve(result)
    }
    const undo = () => (pen.length ? pen.pop() : cuts.pop())
    const picks = PUMPKIN_BASES.map((b) => {
      const thumb = h('canvas', { width: 64, height: 64 })
      const btn = h('button', { class: 'base-pick', title: b.label, on: { click: () => choose(b.id) } }, thumb)
      btn.dataset.id = b.id
      return btn
    })
    const choose = (id: PumpkinBaseId) => {
      base = id
      for (const p of picks) p.classList.toggle('picked', p.dataset.id === id)
    }
    choose(base)
    const panel = h(
      'div',
      { class: 'overlay carve' },
      h('h2', {}, 'Carve your pumpkin'),
      h('div', { class: 'row bases' }, ...picks),
      canvas,
      hint,
      h(
        'div',
        { class: 'row' },
        h('button', { on: { click: undo } }, 'Undo'),
        h('button', { on: { click: () => ((pen = []), (cuts.length = 0)) } }, 'Clear'),
        h('button', { on: { click: () => done(null) } }, 'Cancel'),
        h('button', { class: 'primary', on: { click: () => done({ base, cuts }) } }, 'Done'),
      ),
    )
    root.append(panel)

    const geom = () => {
      const size = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.92
      const unit = pumpkinBox(0, 0, 1, base)
      const r = size / Math.max(unit.w, unit.h)
      const cx = canvas.clientWidth / 2
      const cy = canvas.clientHeight / 2
      return { r, cx, cy, ...pumpkinBox(cx, cy, r, base) }
    }

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect()
      const g = geom()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const p = { x: clamp01((px - g.left) / g.w), y: clamp01((py - g.top) / g.h) }
      if (pen.length >= 3) {
        const first = pen[0]
        const dist = Math.hypot(g.left + first.x * g.w - px, g.top + first.y * g.h - py)
        if (dist < CLOSE_RADIUS_PX) {
          if (cuts.length < LIMITS.cutsPerPumpkin) cuts.push(pen)
          pen = []
          return
        }
      }
      if (pen.length < LIMITS.pointsPerCut) pen.push(p)
    })

    const render = () => {
      const dpr = devicePixelRatio || 1
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (canvas.width !== Math.round(W * dpr)) canvas.width = Math.round(W * dpr)
      if (canvas.height !== Math.round(H * dpr)) canvas.height = Math.round(H * dpr)
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const g = geom()
      drawCarvedPumpkin(ctx, g.cx, g.cy, g.r, cuts, base)
      for (const p of picks) {
        const c = p.querySelector('canvas')!.getContext('2d')!
        c.clearRect(0, 0, 64, 64)
        drawPumpkinBody(c, 32, 36, 22, p.dataset.id as PumpkinBaseId)
      }
      if (pen.length) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.setLineDash([8, 6])
        ctx.beginPath()
        pen.forEach((p, i) => (i ? ctx.lineTo(g.left + p.x * g.w, g.top + p.y * g.h) : ctx.moveTo(g.left + p.x * g.w, g.top + p.y * g.h)))
        ctx.stroke()
        ctx.setLineDash([])
        pen.forEach((p, i) => {
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(g.left + p.x * g.w, g.top + p.y * g.h, i === 0 && pen.length >= 3 ? 11 : 6, 0, Math.PI * 2)
          ctx.fill()
        })
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
  })
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
