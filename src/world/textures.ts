import * as THREE from 'three'
import type { Logo, SignData } from './layout'

const FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo','Segoe UI',sans-serif"

function drawLogo(ctx: CanvasRenderingContext2D, kind: Logo, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(2, r * 0.16)
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
  }
  ctx.restore()
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxW: number, startPx: number, weight = 800) {
  let px = startPx
  ctx.font = `${weight} ${px}px ${FONT}`
  while (ctx.measureText(text).width > maxW && px > 8) {
    px -= 2
    ctx.font = `${weight} ${px}px ${FONT}`
  }
  return px
}

/** White-on-transparent artwork (name + logo). Tinted at runtime by the material colour. */
export function makeSignTexture(s: SignData): THREE.CanvasTexture {
  const ppm = 230
  const W = Math.max(128, Math.min(1400, Math.round(s.w * ppm)))
  const H = Math.max(128, Math.min(1600, Math.round(s.h * ppm)))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const vertical = s.type === 'VERTICAL' || s.type === 'BANNER'
  if (s.shape === 'disc') {
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, W / 2 - 14, 0, Math.PI * 2)
    ctx.stroke()
    drawLogo(ctx, s.logo, W / 2, H * 0.27, W * 0.09)
    const px = fitFont(ctx, s.brand, W * 0.66, W * 0.2)
    ctx.fillText(s.brand, W / 2, H * 0.52)
    if (s.sub) {
      ctx.font = `600 ${Math.max(12, px * 0.42)}px ${FONT}`
      ctx.fillText(s.sub, W / 2, H * 0.52 + px * 0.85)
    }
  } else if (vertical) {
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, W - 20, H - 20)
    ctx.globalAlpha = 1
    const logoR = W * 0.2
    drawLogo(ctx, s.logo, W / 2, W * 0.34, logoR)
    const chars = Array.from(s.brand.replace(/\s/g, ''))
    const top = W * 0.34 + logoR + W * 0.18
    const bottom = s.sub ? H - W * 0.5 : H - W * 0.2
    const avail = bottom - top
    const px = Math.min(W * 0.62, avail / chars.length)
    ctx.font = `800 ${px}px ${FONT}`
    chars.forEach((ch, i) => ctx.fillText(ch, W / 2, top + px * (i + 0.5)))
    if (s.sub) {
      const sp = fitFont(ctx, s.sub, W * 0.82, W * 0.17, 700)
      ctx.fillText(s.sub, W / 2, H - W * 0.28 + sp * 0.0)
    }
  } else {
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 4
    ctx.strokeRect(10, 10, W - 20, H - 20)
    ctx.globalAlpha = 1
    const logoR = H * 0.27
    const hasLogo = W > H * 3
    const left = hasLogo ? H * 0.28 + logoR * 2 : H * 0.15
    if (hasLogo) drawLogo(ctx, s.logo, H * 0.28 + logoR, H / 2, logoR)
    const maxW = W - left - H * 0.2
    const startPx = s.sub ? H * 0.46 : H * 0.54
    const px = fitFont(ctx, s.brand, maxW, startPx)
    const cx = left + maxW / 2
    ctx.fillText(s.brand, cx, s.sub ? H * 0.44 : H * 0.52)
    if (s.sub) {
      const sp = fitFont(ctx, s.sub, maxW, px * 0.4, 600)
      void sp
      ctx.fillText(s.sub, cx, H * 0.8)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
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
