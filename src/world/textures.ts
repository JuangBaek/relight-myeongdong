import * as THREE from 'three'
import type { Logo, SignData } from './layout'
import { FONTS, subFont, type FontDef } from './fonts'

type Ctx = CanvasRenderingContext2D

/* ------------------------------------------------------------------ *
 *  Logos — small vector marks drawn in white (tinted at runtime).
 *  Each is built from `r` (radius) so they scale cleanly.
 * ------------------------------------------------------------------ */
function drawLogo(ctx: Ctx, kind: Logo, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(2, r * 0.16)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  switch (kind) {
    case 'ring':
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'hex':
      for (let i = 0; i < 6; i++) {
        const an = (Math.PI / 3) * i + Math.PI / 6
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r)
      }
      ctx.closePath()
      ctx.stroke()
      break
    case 'star':
      for (let i = 0; i < 8; i++) {
        const an = (Math.PI / 4) * i - Math.PI / 2
        const rr = i % 2 === 0 ? r : r * 0.32
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr)
      }
      ctx.closePath()
      ctx.fill()
      break
    case 'diamond':
      ctx.moveTo(0, -r)
      ctx.lineTo(r * 0.75, 0)
      ctx.lineTo(0, r)
      ctx.lineTo(-r * 0.75, 0)
      ctx.closePath()
      ctx.stroke()
      break
    case 'leaf':
      ctx.moveTo(0, r)
      ctx.bezierCurveTo(r * 1.1, r * 0.4, r * 0.9, -r * 0.8, 0, -r)
      ctx.bezierCurveTo(-r * 0.9, -r * 0.8, -r * 1.1, r * 0.4, 0, r)
      ctx.fill()
      break
    case 'wave':
      for (let i = 0; i <= 20; i++) {
        const x = -r + (2 * r * i) / 20
        const y = Math.sin((i / 20) * Math.PI * 3) * r * 0.45
        ctx[i ? 'lineTo' : 'moveTo'](x, y)
      }
      ctx.stroke()
      break
    case 'cup':
      ctx.moveTo(-r * 0.7, -r * 0.15)
      ctx.lineTo(r * 0.5, -r * 0.15)
      ctx.lineTo(r * 0.4, r * 0.55)
      ctx.quadraticCurveTo(r * 0.35, r * 0.8, r * 0.05, r * 0.8)
      ctx.lineTo(-r * 0.25, r * 0.8)
      ctx.quadraticCurveTo(-r * 0.6, r * 0.8, -r * 0.7, r * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(r * 0.5, r * 0.2, r * 0.28, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-r * 0.35, -r * 0.45)
      ctx.quadraticCurveTo(-r * 0.15, -r * 0.65, -r * 0.35, -r * 0.9)
      ctx.moveTo(r * 0.1, -r * 0.45)
      ctx.quadraticCurveTo(r * 0.3, -r * 0.65, r * 0.1, -r * 0.9)
      ctx.stroke()
      break
    case 'bowl':
      ctx.moveTo(-r, -r * 0.05)
      ctx.lineTo(r, -r * 0.05)
      ctx.arc(0, -r * 0.05, r, 0, Math.PI)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-r * 0.2, -r * 0.3)
      ctx.lineTo(r * 0.55, -r * 0.95)
      ctx.moveTo(r * 0.1, -r * 0.3)
      ctx.lineTo(r * 0.85, -r * 0.8)
      ctx.stroke()
      break
    case 'mic':
      ctx.roundRect(-r * 0.3, -r, r * 0.6, r * 1.1, r * 0.3)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(0, r * 0.1, r * 0.55, 0, Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, r * 0.65)
      ctx.lineTo(0, r)
      ctx.moveTo(-r * 0.35, r)
      ctx.lineTo(r * 0.35, r)
      ctx.stroke()
      break
    case 'crown':
      ctx.moveTo(-r, r * 0.6)
      ctx.lineTo(-r * 0.9, -r * 0.5)
      ctx.lineTo(-r * 0.4, 0)
      ctx.lineTo(0, -r * 0.8)
      ctx.lineTo(r * 0.4, 0)
      ctx.lineTo(r * 0.9, -r * 0.5)
      ctx.lineTo(r, r * 0.6)
      ctx.closePath()
      ctx.fill()
      break
    case 'moon':
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.moveTo(r * 0.75, -r * 0.1)
      ctx.arc(r * 0.35, -r * 0.2, r * 0.78, 0, Math.PI * 2)
      ctx.fill('evenodd')
      break
    case 'drop':
      ctx.moveTo(0, -r)
      ctx.bezierCurveTo(r * 0.9, -r * 0.1, r * 0.85, r * 0.95, 0, r * 0.95)
      ctx.bezierCurveTo(-r * 0.85, r * 0.95, -r * 0.9, -r * 0.1, 0, -r)
      ctx.fill()
      break
    case 'heart':
      ctx.moveTo(0, r * 0.85)
      ctx.bezierCurveTo(-r * 1.3, -r * 0.1, -r * 0.7, -r * 0.95, 0, -r * 0.3)
      ctx.bezierCurveTo(r * 0.7, -r * 0.95, r * 1.3, -r * 0.1, 0, r * 0.85)
      ctx.fill()
      break
    case 'sun':
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const an = (Math.PI / 4) * i
        ctx.moveTo(Math.cos(an) * r * 0.7, Math.sin(an) * r * 0.7)
        ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r)
      }
      ctx.stroke()
      break
    case 'bread':
      ctx.rotate(-Math.PI / 5)
      ctx.roundRect(-r * 1.0, -r * 0.35, r * 2, r * 0.7, r * 0.35)
      ctx.stroke()
      ctx.beginPath()
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(i * r * 0.5 - r * 0.12, -r * 0.2)
        ctx.lineTo(i * r * 0.5 + r * 0.12, r * 0.2)
      }
      ctx.stroke()
      break
    case 'glasses':
      ctx.arc(-r * 0.5, 0, r * 0.42, 0, Math.PI * 2)
      ctx.moveTo(r * 0.92, 0)
      ctx.arc(r * 0.5, 0, r * 0.42, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-r * 0.08, -r * 0.05)
      ctx.quadraticCurveTo(0, -r * 0.2, r * 0.08, -r * 0.05)
      ctx.stroke()
      break
    case 'dumpling':
      ctx.moveTo(-r, r * 0.45)
      ctx.arc(0, r * 0.45, r, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = Math.max(2, r * 0.1)
      ctx.beginPath()
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * r * 0.32, -r * 0.45)
        ctx.lineTo(i * r * 0.26, -r * 0.05)
      }
      ctx.stroke()
      break
    case 'chili':
      ctx.moveTo(-r * 0.7, -r * 0.3)
      ctx.bezierCurveTo(r * 0.2, -r * 0.7, r * 1.0, r * 0.1, r * 0.55, r * 0.95)
      ctx.bezierCurveTo(r * 0.5, r * 0.35, -r * 0.2, r * 0.1, -r * 0.7, -r * 0.3)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-r * 0.7, -r * 0.3)
      ctx.quadraticCurveTo(-r * 0.95, -r * 0.7, -r * 0.55, -r * 0.9)
      ctx.stroke()
      break
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const an = (Math.PI * 2 * i) / 5 - Math.PI / 2
        ctx.moveTo(Math.cos(an) * r * 0.55 + r * 0.38, Math.sin(an) * r * 0.55)
        ctx.arc(Math.cos(an) * r * 0.55, Math.sin(an) * r * 0.55, r * 0.38, 0, Math.PI * 2)
      }
      ctx.fill()
      break
    case 'bolt':
      ctx.moveTo(r * 0.2, -r)
      ctx.lineTo(-r * 0.6, r * 0.15)
      ctx.lineTo(-r * 0.05, r * 0.15)
      ctx.lineTo(-r * 0.25, r)
      ctx.lineTo(r * 0.6, -r * 0.2)
      ctx.lineTo(r * 0.05, -r * 0.2)
      ctx.closePath()
      ctx.fill()
      break
  }
  ctx.restore()
}

/** Logo inside a filled round badge with the mark knocked out. */
function drawBadge(ctx: Ctx, kind: Logo, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  drawLogo(ctx, kind, cx, cy, r * 0.58)
  ctx.restore()
}

/* ------------------------------------------------------------------ *
 *  Text helpers (manual letter-spacing so it works on every browser)
 * ------------------------------------------------------------------ */
const fontStr = (f: FontDef, px: number) => `${f.weight} ${px}px ${f.stack}`

function measure(ctx: Ctx, text: string, sp: number) {
  if (!sp) return ctx.measureText(text).width
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width
  return w + sp * (Array.from(text).length - 1)
}

function fit(ctx: Ctx, f: FontDef, text: string, maxW: number, startPx: number, spEm = f.spacing) {
  let px = startPx * f.size
  ctx.font = fontStr(f, px)
  while (measure(ctx, text, spEm * px) > maxW && px > 8) {
    px -= 2
    ctx.font = fontStr(f, px)
  }
  return px
}

function drawTextLine(ctx: Ctx, text: string, cx: number, cy: number, sp: number, outline = false, lw = 3) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const w = measure(ctx, text, sp)
  let x = cx - w / 2
  const draw = (s: string, xx: number) => (outline ? ctx.strokeText(s, xx, cy) : ctx.fillText(s, xx, cy))
  if (outline) {
    ctx.lineWidth = lw
    ctx.lineJoin = 'round'
  }
  if (!sp) {
    draw(text, x)
    return
  }
  for (const ch of text) {
    draw(ch, x)
    x += ctx.measureText(ch).width + sp
  }
}

/** Brand artwork supplied as PNG/SVG: its alpha channel is used as a one-colour mask, tinted like the lettering. */
function drawImageMask(ctx: Ctx, img: HTMLImageElement, cx: number, cy: number, size: number) {
  const k = Math.min(size / img.width, size / img.height)
  const w = Math.max(2, Math.round(img.width * k))
  const h = Math.max(2, Math.round(img.height * k))
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const t = tmp.getContext('2d')!
  t.drawImage(img, 0, 0, w, h)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = '#fff'
  t.fillRect(0, 0, w, h)
  ctx.drawImage(tmp, cx - w / 2, cy - h / 2)
}

/** Upright column of characters (Korean/Japanese/Chinese). Long-vowel and dash marks rotate like real tategaki. */
function drawColumn(ctx: Ctx, chars: string[], cx: number, top: number, avail: number, px: number, f: FontDef, outline: boolean) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = fontStr(f, px)
  chars.forEach((ch, i) => {
    const y = top + (avail / chars.length) * (i + 0.5)
    const turn = /[ー－―〜~…\-]/.test(ch)
    ctx.save()
    ctx.translate(cx, y)
    if (turn) ctx.rotate(Math.PI / 2)
    if (outline) {
      ctx.lineWidth = Math.max(2, px * 0.05)
      ctx.strokeText(ch, 0, 0)
    } else ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
}
/* ------------------------------------------------------------------ *
 *  Frame variants (border styles)
 * ------------------------------------------------------------------ */
function drawFrame(ctx: Ctx, W: number, H: number, v: number, disc: boolean) {
  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 4
  if (disc) {
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, W / 2 - 14, 0, Math.PI * 2)
    ctx.stroke()
    if (v % 2) {
      ctx.setLineDash([10, 9])
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, W / 2 - 34, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
    return
  }
  const m = 10
  switch (v) {
    case 1:
      ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
      break
    case 2:
      ctx.strokeRect(m, m, W - 2 * m, H - 2 * m)
      ctx.lineWidth = 2
      ctx.strokeRect(m + 10, m + 10, W - 2 * m - 20, H - 2 * m - 20)
      break
    case 3:
      ctx.beginPath()
      ctx.roundRect(m, m, W - 2 * m, H - 2 * m, Math.min(W, H) * 0.22)
      ctx.stroke()
      break
    case 4: {
      const L = Math.min(W, H) * 0.22
      ctx.lineWidth = 6
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
        ctx.beginPath()
        ctx.moveTo(x, y + sy * L)
        ctx.lineTo(x, y)
        ctx.lineTo(x + sx * L, y)
        ctx.stroke()
      }
      break
    }
    case 5:
      ctx.setLineDash([14, 10])
      ctx.strokeRect(m + 2, m + 2, W - 2 * m - 4, H - 2 * m - 4)
      break
    default:
      break
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ *
 *  Sign artwork: white-on-transparent. Each shop differs by typeface,
 *  composition, logo style and border.
 * ------------------------------------------------------------------ */
export function makeSignTexture(s: SignData, logoImg?: HTMLImageElement | null): { text: THREE.CanvasTexture; halo: THREE.CanvasTexture } {
  // texels per metre: crisp lettering up close; lower on phones to keep ~60 sign textures within GPU memory
  const ppm = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 200 : 260
  const W = Math.max(128, Math.min(1600, Math.round(s.w * ppm)))
  const H = Math.max(128, Math.min(1800, Math.round(s.h * ppm)))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textBaseline = 'middle'

  const F = FONTS[s.fontId]
  const SF = subFont(s.sub ?? '')
  const L = s.layout
  const vertical = s.type === 'VERTICAL' || s.type === 'BANNER'

  const logo = (kind: Logo, x: number, y: number, r: number, badge = s.badge) => {
    if (logoImg) drawImageMask(ctx, logoImg, x, y, r * 2.2)
    else if (badge) drawBadge(ctx, kind, x, y, r * 1.25)
    else drawLogo(ctx, kind, x, y, r)
  }

  if (s.shape === 'disc') {
    drawFrame(ctx, W, H, s.frame, true)
    const useBadge = s.badge
    const logoY = H * (useBadge ? 0.26 : 0.27)
    logo(s.logo, W / 2, logoY, W * 0.09)
    const px = fit(ctx, F, s.brand, W * 0.66, W * 0.2)
    ctx.font = fontStr(F, px)
    drawTextLine(ctx, s.brand, W / 2, H * 0.54, F.spacing * px, L % 3 === 2, Math.max(2, px * 0.05))
    if (s.sub) {
      const sp = fit(ctx, SF, s.sub, W * 0.6, px * 0.42)
      ctx.font = fontStr(SF, sp)
      drawTextLine(ctx, s.sub, W / 2, H * 0.54 + px * 0.82, SF.spacing * sp)
    }
  } else if (vertical) {
    drawFrame(ctx, W, H, s.frame, false)
    const logoR = W * 0.2
    const logoTop = L % 3 !== 2 // some shops put the mark at the bottom
    const outline = L % 3 === 1 && s.type === 'BANNER'
    const logoY = logoTop ? W * 0.36 : H - W * 0.38
    logo(s.logo, W / 2, logoY, logoR)
    const top = logoTop ? W * 0.36 + logoR * 1.3 + W * 0.14 : W * 0.2
    const bottom = logoTop ? (s.sub && s.vert !== 'tategaki' ? H - W * 0.5 : H - W * 0.2) : H - W * 0.38 - logoR * 1.3 - W * 0.14
    const avail = bottom - top
    if (s.vert === 'rotate') {
      // ONE line of text rotated 90°, reading top-to-bottom (typical for Latin names on tall signs)
      ctx.save()
      ctx.translate(W / 2, top + avail / 2)
      ctx.rotate(Math.PI / 2)
      const px = fit(ctx, F, s.brand, avail * 0.98, W * 0.6)
      ctx.font = fontStr(F, px)
      drawTextLine(ctx, s.brand, 0, 0, F.spacing * px, outline, Math.max(2, px * 0.05))
      ctx.restore()
    } else if (s.vert === 'tategaki') {
      // Japanese tategaki: main name in the right column, small reading/sub-line in a left column
      const chars = Array.from(s.brand.replace(/\s/g, ''))
      const px = Math.min(W * 0.4 * F.size, (avail / chars.length) * 0.96)
      drawColumn(ctx, chars, W * 0.64, top, avail, px, F, outline)
      if (s.sub) {
        const sc = Array.from(s.sub.replace(/\s/g, '')).slice(0, 9)
        const spx = Math.min(W * 0.17, ((avail * 0.85) / sc.length) * 0.96)
        drawColumn(ctx, sc, W * 0.22, top + avail * 0.05, avail * 0.85, spx, SF, false)
      }
      ctx.save()
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(W * 0.42, top)
      ctx.lineTo(W * 0.42, top + avail)
      ctx.stroke()
      ctx.restore()
    } else {
      // upright stack: one character per row, like Korean / Chinese vertical signs
      const chars = Array.from(s.brand.replace(/\s/g, ''))
      const px = Math.min(W * 0.66 * F.size, (avail / chars.length) * 0.96)
      drawColumn(ctx, chars, W / 2, top, avail, px, F, outline)
    }
    if (s.sub && logoTop && s.vert !== 'tategaki') {
      const sp = fit(ctx, SF, s.sub, W * 0.82, W * 0.17)
      ctx.font = fontStr(SF, sp)
      drawTextLine(ctx, s.sub, W / 2, H - W * 0.28, SF.spacing * sp)
    }  } else {
    // horizontal fascia — six compositions
    drawFrame(ctx, W, H, s.frame, false)
    const hasWide = W > H * 2.6
    const mid = H / 2
    const sub = s.sub
    switch (L) {
      case 0: {
        // logo left, name centred
        const r = H * 0.27
        const left = hasWide ? H * 0.28 + r * 2 : H * 0.15
        if (hasWide) logo(s.logo, H * 0.28 + r, mid, r)
        const maxW = W - left - H * 0.2
        const px = fit(ctx, F, s.brand, maxW, sub ? H * 0.46 : H * 0.56)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, left + maxW / 2, sub ? H * 0.44 : H * 0.52, F.spacing * px)
        if (sub) {
          const sp = fit(ctx, SF, sub, maxW, px * 0.4)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, left + maxW / 2, H * 0.8, SF.spacing * sp)
        }
        break
      }
      case 1: {
        // badge left + name right-aligned block
        const r = H * 0.3
        logo(s.logo, H * 0.3 + r, mid, r, true)
        const left = H * 0.3 + r * 2 + H * 0.12
        const maxW = W - left - H * 0.2
        const px = fit(ctx, F, s.brand, maxW, sub ? H * 0.44 : H * 0.54)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, left + maxW / 2, sub ? H * 0.42 : H * 0.5, F.spacing * px)
        if (sub) {
          const sp = fit(ctx, SF, sub, maxW, px * 0.38)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, left + maxW / 2, H * 0.78, SF.spacing * sp)
        }
        break
      }
      case 2: {
        // centred name flanked by small marks
        const r = H * 0.14
        const pad = H * 0.35
        logo(s.logo, pad, mid, r, false)
        logo(s.logo, W - pad, mid, r, false)
        const maxW = W - pad * 2 - r * 2 - H * 0.2
        const px = fit(ctx, F, s.brand, maxW, sub ? H * 0.5 : H * 0.62)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, W / 2, sub ? H * 0.42 : H * 0.5, F.spacing * px)
        if (sub) {
          const sp = fit(ctx, SF, sub, maxW, px * 0.36)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, W / 2, H * 0.78, SF.spacing * sp)
        }
        break
      }
      case 3: {
        // big name with rule and sub, mark at the right end
        const r = H * 0.25
        const right = hasWide ? r * 2 + H * 0.35 : H * 0.15
        if (hasWide) logo(s.logo, W - H * 0.25 - r, mid, r)
        const maxW = W - right - H * 0.25
        const px = fit(ctx, F, s.brand, maxW, sub ? H * 0.5 : H * 0.6)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, H * 0.25 + maxW / 2, sub ? H * 0.4 : H * 0.5, F.spacing * px)
        if (sub) {
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(H * 0.3, H * 0.66)
          ctx.lineTo(H * 0.25 + maxW - H * 0.05, H * 0.66)
          ctx.stroke()
          const sp = fit(ctx, SF, sub, maxW, px * 0.36)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, H * 0.25 + maxW / 2, H * 0.82, SF.spacing * sp)
        }
        break
      }
      case 4: {
        // outline lettering (neon-tube style) + outlined mark
        const r = H * 0.26
        const left = hasWide ? H * 0.28 + r * 2 : H * 0.15
        if (hasWide) {
          ctx.save()
          ctx.lineWidth = Math.max(3, r * 0.12)
          drawLogo(ctx, s.logo, H * 0.28 + r, mid, r)
          ctx.restore()
        }
        const maxW = W - left - H * 0.2
        const px = fit(ctx, F, s.brand, maxW, sub ? H * 0.46 : H * 0.58)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, left + maxW / 2, sub ? H * 0.43 : H * 0.5, F.spacing * px, true, Math.max(2.5, px * 0.05))
        if (sub) {
          const sp = fit(ctx, SF, sub, maxW, px * 0.38)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, left + maxW / 2, H * 0.8, SF.spacing * sp)
        }
        break
      }
      default: {
        // underlined name, sub on the right
        const r = H * 0.2
        const left = hasWide ? H * 0.25 + r * 2 + H * 0.1 : H * 0.15
        if (hasWide) logo(s.logo, H * 0.25 + r, H * 0.44, r)
        const maxW = W - left - H * 0.2
        const px = fit(ctx, F, s.brand, maxW, H * 0.5)
        ctx.font = fontStr(F, px)
        drawTextLine(ctx, s.brand, left + maxW / 2, H * 0.44, F.spacing * px)
        const tw = measure(ctx, s.brand, F.spacing * px)
        ctx.fillRect(left + maxW / 2 - tw / 2, H * 0.44 + px * 0.55, tw, Math.max(4, H * 0.045))
        if (sub) {
          const sp = fit(ctx, SF, sub, maxW, px * 0.34)
          ctx.font = fontStr(SF, sp)
          drawTextLine(ctx, sub, left + maxW / 2, H * 0.84, SF.spacing * sp)
        }
        break
      }
    }
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  // halo layer is unused with white light blocks; share the same texture instead of building a blurred copy
  return { text: tex, halo: tex }
}

let glow: THREE.CanvasTexture | null = null
export function getGlowTexture() {
  if (glow) return glow
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.42)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glow = new THREE.CanvasTexture(c)
  glow.colorSpace = THREE.SRGBColorSpace
  return glow
}

export function makeGroundTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2b2b2f'
  ctx.fillRect(0, 0, S, S)
  const n = 4
  const t = S / n
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = 38 + rnd() * 16
      ctx.fillStyle = `rgb(${v},${v},${v + 3})`
      ctx.fillRect(i * t + 2, j * t + 2, t - 4, t - 4)
    }
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'
  ctx.lineWidth = 3
  for (let i = 0; i <= n; i++) {
    ctx.beginPath()
    ctx.moveTo(i * t, 0)
    ctx.lineTo(i * t, S)
    ctx.moveTo(0, i * t)
    ctx.lineTo(S, i * t)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/* ------------------------------------------------------------------ *
 *  Facade material textures (each tile covers ~1.6 m of wall).
 *  0 stucco · 1 brick · 2 glazed tile · 3 metal panel · 4 concrete
 * ------------------------------------------------------------------ */
export function makeWallTextures(): THREE.CanvasTexture[] {
  const S = 256
  let seed = 99
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const mk = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas')
    c.width = c.height = S
    draw(c.getContext('2d')!)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  const noise = (ctx: CanvasRenderingContext2D, base: number, amp: number, dots = 5000) => {
    ctx.fillStyle = `rgb(${base},${base},${base})`
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < dots; i++) {
      const v = base + (rnd() - 0.5) * amp
      ctx.fillStyle = `rgba(${v},${v},${v},0.35)`
      ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3)
    }
  }
  return [
    // stucco (neutral, tinted per building)
    mk((ctx) => {
      noise(ctx, 215, 40, 7000)
      ctx.strokeStyle = 'rgba(0,0,0,0.05)'
      for (let i = 0; i < 18; i++) {
        const x = rnd() * S
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + (rnd() - 0.5) * 10, S)
        ctx.stroke()
      }
    }),
    // brick
    mk((ctx) => {
      ctx.fillStyle = '#6d5f56'
      ctx.fillRect(0, 0, S, S)
      const rows = 10
      const bw = S / 4
      const bh = S / rows
      for (let r = 0; r < rows; r++) {
        for (let k = -1; k < 4; k++) {
          const off = r % 2 ? bw / 2 : 0
          const v = 150 + rnd() * 50
          ctx.fillStyle = `rgb(${v},${v * 0.52},${v * 0.4})`
          ctx.fillRect(k * bw + off + 2, r * bh + 2, bw - 4, bh - 4)
        }
      }
    }),
    // glazed tile (small squares, cream)
    mk((ctx) => {
      ctx.fillStyle = '#9a9690'
      ctx.fillRect(0, 0, S, S)
      const n = 12
      const t = S / n
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const v = 218 + rnd() * 28
          ctx.fillStyle = `rgb(${v},${v - 3},${v - 12})`
          ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3)
        }
    }),
    // metal panel (vertical seams + rivets)
    mk((ctx) => {
      noise(ctx, 150, 24, 3000)
      const pw = S / 3
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.38)'
        ctx.fillRect(i * pw, 0, 3, S)
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        ctx.fillRect(i * pw + 3, 0, 2, S)
        for (let y = 16; y < S; y += 32) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.beginPath()
          ctx.arc(i * pw + 12, y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }),
    // concrete with form-tie holes and stains
    mk((ctx) => {
      noise(ctx, 170, 55, 9000)
      for (let i = 0; i < 6; i++) {
        const g = ctx.createLinearGradient(0, 0, 0, S)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(1, 'rgba(0,0,0,0.12)')
        ctx.fillStyle = g
        ctx.fillRect(rnd() * S, 0, 6 + rnd() * 14, S)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      for (const x of [S / 4, (3 * S) / 4]) for (const y of [S / 4, (3 * S) / 4]) {
        ctx.beginPath()
        ctx.arc(x, y, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }),
  ]
}
