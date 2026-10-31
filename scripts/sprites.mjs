#!/usr/bin/env node
/**
 * Cut hand-drawn sprites out of phone photos of paper.
 *
 *   node scripts/sprites.mjs look <photo> [--grid 200] [--box x,y,w,h]   preview with a full-res coordinate grid
 *   node scripts/sprites.mjs detect <photo>                               numbered boxes around ink blobs
 *   node scripts/sprites.mjs cut [id...]                                  export PNGs from assets/sprites.json
 *
 * Every command prints the image it wrote, so an agent can Read it and iterate on the manifest.
 * Coordinates are always full-resolution pixels of the photo after EXIF rotation.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import sharp from 'sharp'

const MANIFEST = 'assets/sprites.json'
const RAW = 'assets/raw'
const PREVIEWS = '.scratch/sprites'

const [cmd, ...rest] = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? rest[i + 1] : fallback
}
const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'))
const photoPath = (p) => (p.includes('/') ? p : join(RAW, p))

async function load(path, region) {
  let img = sharp(photoPath(path)).rotate()
  if (region) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    img = sharp(data, { raw: info }).extract({ left: region[0], top: region[1], width: region[2], height: region[3] })
  }
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

/** Paper is lit unevenly, so model it as a plane per channel fitted to the bright border pixels. */
function paperModel({ data, w, h }) {
  const pts = []
  const band = Math.max(3, Math.round(Math.min(w, h) * 0.01))
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue
      const i = (y * w + x) * 3
      pts.push([x, y, data[i], data[i + 1], data[i + 2]])
    }
  const lum = (p) => p[2] + p[3] + p[4]
  pts.sort((a, b) => lum(b) - lum(a))
  const bright = pts.slice(0, Math.max(10, Math.floor(pts.length * 0.6)))
  return [0, 1, 2].map((c) => fitPlane(bright.map((p) => [p[0], p[1], p[2 + c]])))
}

function fitPlane(pts) {
  let n = 0, sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0
  for (const [x, y, z] of pts) {
    n++, (sx += x), (sy += y), (sz += z), (sxx += x * x), (syy += y * y), (sxy += x * y), (sxz += x * z), (syz += y * z)
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]]
  const b = [sxz, syz, sz]
  const s = solve3(A, b)
  if (!s) return () => sz / n
  return (x, y) => s[0] * x + s[1] * y + s[2]
}

function solve3(A, b) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const d = det(A)
  if (Math.abs(d) < 1e-9) return null
  return [0, 1, 2].map((k) => det(A.map((row, r) => row.map((v, c) => (c === k ? b[r] : v)))) / d)
}

/** How far a pixel is from paper: darker than the paper, or more colorful than it. */
function inkScore(img, paper) {
  const { data, w, h } = img
  const score = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
      const pr = paper[0](x, y), pg = paper[1](x, y), pb = paper[2](x, y)
      const dark = (pr + pg + pb - r - g - b) / 3
      const chroma = Math.max(r, g, b) - Math.min(r, g, b) - (Math.max(pr, pg, pb) - Math.min(pr, pg, pb))
      score[i] = Math.max(dark, chroma * 1.2)
    }
  return score
}

function components(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  const out = []
  const stack = []
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s] >= 0) continue
    const c = { id: out.length, area: 0, x0: w, y0: h, x1: 0, y1: 0 }
    label[s] = c.id
    stack.push(s)
    while (stack.length) {
      const i = stack.pop()
      const x = i % w, y = (i / w) | 0
      c.area++
      if (x < c.x0) c.x0 = x
      if (x > c.x1) c.x1 = x
      if (y < c.y0) c.y0 = y
      if (y > c.y1) c.y1 = y
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1])
        if (j >= 0 && mask[j] && label[j] < 0) (label[j] = c.id), stack.push(j)
    }
    out.push(c)
  }
  return { label, comps: out }
}

/** Chamfer distance to the nearest set pixel. */
function distance(mask, w, h) {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF
  const A = 1, D = Math.SQRT2
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + A)
      if (y > 0) {
        v = Math.min(v, d[i - w] + A)
        if (x > 0) v = Math.min(v, d[i - w - 1] + D)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D)
      }
      d[i] = v
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + A)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + A)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D)
        if (x > 0) v = Math.min(v, d[i + w - 1] + D)
      }
      d[i] = v
    }
  return d
}

const dilate = (mask, w, h, r) => distance(mask, w, h).map((v) => (v <= r ? 1 : 0))
const erode = (mask, w, h, r) => distance(mask.map((v) => (v ? 0 : 1)), w, h).map((v) => (v > r ? 1 : 0))

/** Dilate then erode on a padded canvas, so the crop edge doesn't stop the erosion. */
function close(mask, w, h, r) {
  const p = Math.ceil(r) + 2, W = w + 2 * p, H = h + 2 * p
  const big = new Uint8Array(W * H)
  for (let y = 0; y < h; y++) big.set(mask.subarray(y * w, y * w + w), (y + p) * W + p)
  const closed = erode(dilate(big, W, H, r), W, H, r)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = closed[(y + p) * W + x + p] | mask[y * w + x]
  return out
}

/** Paper fully enclosed by ink is part of the drawing (white faces, bodies). */
function fillHoles(mask, w, h) {
  const outside = new Uint8Array(w * h)
  const stack = []
  const seed = (i) => !mask[i] && !outside[i] && ((outside[i] = 1), stack.push(i))
  for (let x = 0; x < w; x++) seed(x), seed((h - 1) * w + x)
  for (let y = 0; y < h; y++) seed(y * w), seed(y * w + w - 1)
  while (stack.length) {
    const i = stack.pop()
    const x = i % w, y = (i / w) | 0
    if (x > 0) seed(i - 1)
    if (x < w - 1) seed(i + 1)
    if (y > 0) seed(i - w)
    if (y < h - 1) seed(i + w)
  }
  return outside.map((v) => (v ? 0 : 1))
}

function hull(mask, w, h) {
  const pts = []
  for (let y = 0; y < h; y++) {
    let a = -1, b = -1
    for (let x = 0; x < w; x++) if (mask[y * w + x]) (a < 0 && (a = x)), (b = x)
    if (a >= 0) pts.push([a, y], [b, y])
  }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower = [], upper = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop()
    lower.push(p)
  }
  for (const p of pts.toReversed()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop()
    upper.push(p)
  }
  const poly = lower.slice(0, -1).concat(upper.slice(0, -1))
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let inside = poly.length >= 3
      for (let k = 0; k < poly.length && inside; k++) if (cross(poly[k], poly[(k + 1) % poly.length], [x, y]) < 0) inside = false
      if (inside || mask[y * w + x]) out[y * w + x] = 1
    }
  return out
}

function smooth(t) {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

async function cutSprite(s, defaults) {
  const o = { ...defaults, ...s }
  const img = await load(o.photo, o.box)
  const { w, h, data } = img
  const paper = paperModel(img)
  const score = inkScore(img, paper)
  const [lo, hi] = o.threshold
  let mask = score.map((v) => (v > (lo + hi) / 2 ? 1 : 0))

  const { label, comps } = components(mask, w, h)
  const keep = new Set(comps.filter((c) => c.area >= o.minSpeck).map((c) => c.id))
  mask = mask.map((_, i) => (keep.has(label[i]) ? 1 : 0))

  let solid = mask
  const fill = o.fill
  if (fill === 'hull') solid = hull(mask, w, h)
  else {
    if (fill?.close) solid = close(mask, w, h, fill.close)
    if (fill !== 'none') solid = fillHoles(solid, w, h)
  }
  const near = dilate(mask, w, h, 2)

  const out = Buffer.alloc(w * h * 4)
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const a = solid[i] ? 1 : near[i] ? smooth((score[i] - lo) / (hi - lo)) : 0
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round((data[i * 3 + c] / paper[c](x, y)) * 255))
      out[i * 4 + 3] = Math.round(a * 255)
      if (a > 0.1) (x < x0 && (x0 = x)), (x > x1 && (x1 = x)), (y < y0 && (y0 = y)), (y > y1 && (y1 = y))
    }
  if (x1 < 0) throw new Error(`${s.id}: nothing left after cutting; check box and threshold`)
  const pad = 4
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad)
  const width = Math.min(w, x1 + pad + 1) - left, height = Math.min(h, y1 + pad + 1) - top
  const file = join(o.out, o.dir ?? '', `${s.id}.png`)
  mkdirSync(join(o.out, o.dir ?? ''), { recursive: true })
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width, height })
    .resize({ width: o.maxSize, height: o.maxSize, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(file)
  const meta = await sharp(file).metadata()
  return { id: s.id, file, width: meta.width, height: meta.height }
}

async function contactSheet(results, file) {
  const cell = 220, cols = Math.min(5, results.length), rows = Math.ceil(results.length / cols)
  const W = cols * cell, H = rows * (cell + 30)
  const checker = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#ddd"/><rect width="10" height="10" fill="#aaa"/><rect x="10" y="10" width="10" height="10" fill="#aaa"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/>${results
    .map((r, k) => `<text x="${(k % cols) * cell + cell / 2}" y="${Math.floor(k / cols) * (cell + 30) + cell + 22}" font-family="sans-serif" font-size="16" text-anchor="middle">${r.id}</text>`)
    .join('')}</svg>`
  const tiles = await Promise.all(
    results.map(async (r, k) => {
      const buf = await sharp(r.file).resize({ width: cell - 16, height: cell - 16, fit: 'inside' }).toBuffer()
      const m = await sharp(buf).metadata()
      return { input: buf, left: (k % cols) * cell + Math.round((cell - m.width) / 2), top: Math.floor(k / cols) * (cell + 30) + Math.round((cell - m.height) / 2) }
    }),
  )
  await sharp(Buffer.from(checker)).composite(tiles).png().toFile(file)
}

async function look(photo) {
  const box = flag('box')?.split(',').map(Number)
  const full = await sharp(photoPath(photo)).rotate().metadata()
  const fw = full.autoOrient?.width ?? full.width, fh = full.autoOrient?.height ?? full.height
  const [bx, by, bw, bh] = box ?? [0, 0, fw, fh]
  const step = Number(flag('grid', box ? 100 : 200))
  const scale = Math.min(1, 1000 / Math.max(bw, bh))
  const W = Math.round(bw * scale), H = Math.round(bh * scale)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
  for (let gx = Math.ceil(bx / step) * step; gx < bx + bw; gx += step) {
    const x = (gx - bx) * scale
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="red" stroke-opacity="0.5"/><text x="${x + 2}" y="12" font-size="11" font-family="sans-serif" fill="red">${gx}</text>`
  }
  for (let gy = Math.ceil(by / step) * step; gy < by + bh; gy += step) {
    const y = (gy - by) * scale
    svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="blue" stroke-opacity="0.5"/><text x="2" y="${y - 2}" font-size="11" font-family="sans-serif" fill="blue">${gy}</text>`
  }
  svg += '</svg>'
  const img = await load(photo, box)
  const file = join(PREVIEWS, `look-${basename(photo, '.jpg')}${box ? `-${box.join('_')}` : ''}.jpg`)
  mkdirSync(PREVIEWS, { recursive: true })
  await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 3 } }).resize(W, H).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82 }).toFile(file)
  console.log(file)
}

async function detect(photo) {
  const full = await load(photo)
  const scale = 600 / full.w
  const small = await sharp(full.data, { raw: { width: full.w, height: full.h, channels: 3 } }).resize(600).raw().toBuffer({ resolveWithObject: true })
  const img = { data: small.data, w: small.info.width, h: small.info.height }
  const blur = await sharp(small.data, { raw: small.info }).blur(25).raw().toBuffer()
  const at = (c) => (x, y) => blur[(y * img.w + x) * 3 + c] + 6
  const score = inkScore(img, [at(0), at(1), at(2)])
  const mask = dilate(score.map((v) => (v > 45 ? 1 : 0)), img.w, img.h, 6)
  const { comps } = components(mask, img.w, img.h)
  const boxes = comps
    .filter((c) => c.area > 400)
    .map((c) => [c.x0, c.y0, c.x1 - c.x0 + 1, c.y1 - c.y0 + 1].map((v) => Math.round(v / scale)))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.w}" height="${img.h}">${boxes
    .map(([x, y, w, h], k) => `<rect x="${x * scale}" y="${y * scale}" width="${w * scale}" height="${h * scale}" fill="none" stroke="red" stroke-width="2"/><text x="${x * scale + 3}" y="${y * scale + 16}" font-size="16" font-family="sans-serif" fill="red">${k}</text>`)
    .join('')}</svg>`
  const file = join(PREVIEWS, `detect-${basename(photo, '.jpg')}.jpg`)
  mkdirSync(PREVIEWS, { recursive: true })
  await sharp(small.data, { raw: small.info }).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 82 }).toFile(file)
  boxes.forEach((b, k) => console.log(`${k}\t${b.join(',')}`))
  console.log(file)
}

async function cut(ids) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const defaults = { out: 'assets/sprites', threshold: [28, 70], minSpeck: 150, fill: 'holes', maxSize: 512, ...manifest.defaults }
  const chosen = manifest.sprites.filter((s) => !ids.length || ids.includes(s.id))
  const results = []
  for (const s of chosen) {
    const r = await cutSprite(s, defaults)
    console.log(`${r.id}\t${r.width}x${r.height}\t${r.file}`)
    results.push(r)
  }
  const sheet = join(PREVIEWS, 'sheet.png')
  mkdirSync(PREVIEWS, { recursive: true })
  await contactSheet(results, sheet)
  console.log(sheet)
}

const commands = { look: () => look(positional[0]), detect: () => detect(positional[0]), cut: () => cut(positional) }
if (!commands[cmd]) {
  console.error('usage: sprites.mjs look <photo> [--grid N] [--box x,y,w,h] | detect <photo> | cut [id...]')
  process.exit(1)
}
await commands[cmd]()
