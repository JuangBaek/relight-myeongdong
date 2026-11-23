import { mulberry32 } from './rng'

/* ------------------------------------------------------------------ *
 *  Street proportions (approximate, inspired by Myeongdong's pedestrian
 *  shopping streets — NOT a surveyed digital twin).
 *  Street runs along Z. Left wall x = -4, right wall x = +4.
 * ------------------------------------------------------------------ */
export const WALL_X = 4
export const HALF_LEN = 60
export const WALK_X = 3.45
export const WALK_Z = 56
export const GROUND_H = 4.2
export const FLOOR_H = 3.2

export type Side = -1 | 1
export type SignType = 'VERTICAL' | 'ROUND' | 'FASCIA' | 'BANNER'
export type Logo = 'ring' | 'hex' | 'star' | 'diamond' | 'leaf' | 'wave'
export type RGB = [number, number, number]
export type V3 = [number, number, number]

export interface Inst {
  p: V3
  s: V3
  ry?: number
  rx?: number
  rz?: number
  c?: string | number | RGB
}

export interface SignData {
  id: string
  brand: string
  sub?: string
  logo: Logo
  type: SignType
  shape: 'box' | 'disc'
  hinge: boolean // true: projects from wall and swings flat; false: already flush
  side: Side // -1 left wall, +1 right wall
  wallX: number
  dir: 1 | -1 // direction from wall toward street
  zc: number
  w: number
  h: number
  y0: number
  y1: number
  d0: number
  d1: number
  s1: number
  panel0: string
  text0: string
  e0: number
  panel1: string
  text1: string
  e1: number
  colorName: string
  variant: string
  bandX: number // x offset of fascia band from wall (flush signs sit in front of it)
}

export interface Building {
  side: Side
  z0: number
  z1: number
  zc: number
  w: number
  H: number
  D: number
  wall: string
  style: number
}

/* ---------------------------- brands (fictional) ---------------------------- */
const FASCIA_NAMES: [string, string | undefined, Logo][] = [
  ['달빛 떡볶이', 'TTEOKBOKKI', 'ring'],
  ['NOVA CAFE', '노바 카페', 'star'],
  ['루미 코스메틱', 'LUMI COSMETIC', 'diamond'],
  ['MINT SPA', '족욕 · 마사지', 'leaf'],
  ['청춘 노래방', 'KARAOKE', 'wave'],
  ['오후의 베이커리', 'BAKERY', 'hex'],
  ['하늘 안경원', 'OPTICAL', 'ring'],
  ['별숲 포차', undefined, 'star'],
  ['BLOOM NAIL', '블룸 네일', 'leaf'],
  ['한입 만두', 'DUMPLING', 'hex'],
  ['블루문 BAR', undefined, 'diamond'],
  ['오늘 라멘', 'RAMEN', 'wave'],
  ['PEACH BEAUTY', '피치 뷰티', 'leaf'],
  ['다온 기념품', 'SOUVENIR', 'star'],
  ['PIXEL ZONE', '게임존', 'hex'],
  ['담소 찻집', 'TEA HOUSE', 'ring'],
  ['금빛 호떡', undefined, 'wave'],
  ['SEOUL GOODS', '서울 굿즈', 'diamond'],
]
const VERTICAL_NAMES: [string, string | undefined, Logo][] = [
  ['이모네 분식', undefined, 'ring'],
  ['네일아트', 'NAIL', 'leaf'],
  ['해장국', '24H', 'wave'],
  ['한방 족욕', undefined, 'leaf'],
  ['찜닭', 'JJIMDAK', 'hex'],
  ['헤어살롱', 'HAIR', 'diamond'],
  ['오락실', 'ARCADE', 'star'],
  ['마사지', 'MASSAGE', 'ring'],
  ['호떡집', undefined, 'wave'],
]
const ROUND_NAMES: [string, string | undefined, Logo][] = [
  ['달 카페', 'CAFE', 'ring'],
  ['별 사주', undefined, 'star'],
  ['족욕', 'FOOT SPA', 'leaf'],
  ['피자 24', undefined, 'hex'],
  ['한입', 'SNACK', 'diamond'],
]
const BANNER_NAMES: [string, string | undefined, Logo][] = [
  ['몽글 빙수', 'BINGSU', 'ring'],
  ['루나 뷰티', 'LUNA', 'star'],
  ['핫 치킨', 'CHICKEN', 'hex'],
  ['크림 디저트', 'DESSERT', 'leaf'],
  ['미니 스파', 'SPA', 'wave'],
  ['토이 월드', 'TOY', 'diamond'],
  ['스시 하나', 'SUSHI', 'ring'],
  ['꽃 카페', 'FLOWER', 'leaf'],
]

const NEON: [string, string, string][] = [
  ['#ff2d95', '#ffffff', 'MAGENTA'],
  ['#ff2b2b', '#ffffff', 'RED'],
  ['#1f7bff', '#ffffff', 'BLUE'],
  ['#00e676', '#08210f', 'GREEN'],
  ['#ffe600', '#1a1a1a', 'YELLOW'],
  ['#ff7a00', '#ffffff', 'ORANGE'],
  ['#b400ff', '#ffffff', 'VIOLET'],
  ['#00d8ff', '#04222a', 'CYAN'],
]

// Unified post-improvement palette (charcoal / dark grey / warm grey / ivory / white)
// Glowing white light-blocks with black lettering (backlit neon-white panels) + mint rim.
// Panel emissive is >1 so the block blooms like a lit lightbox, at a calm and even level.
const AFTER: { panel: string; text: string; e: number; name: string }[] = [
  { panel: '#F2F2F2', text: '#0e0e0e', e: 0.55, name: 'WHITE LIGHT BLOCK' },
  { panel: '#F2F2F2', text: '#0e0e0e', e: 0.5, name: 'WHITE LIGHT BLOCK' },
  { panel: '#E8E3D8', text: '#0e0e0e', e: 0.6, name: 'IVORY LIGHT BLOCK' },
  { panel: '#F2F2F2', text: '#0e0e0e', e: 0.55, name: 'WHITE LIGHT BLOCK' },
  { panel: '#E8E3D8', text: '#0e0e0e', e: 0.6, name: 'IVORY LIGHT BLOCK' },
]

const WALLS = ['#cfc8bd', '#b9b2a6', '#8c8379', '#d9d4c9', '#7a5a4a', '#5b5f66', '#a39384', '#e0dccf', '#9a8f86', '#6f7378']

/* ---------------------------- generation ---------------------------- */
const rng = mulberry32(8080)
const r = (a: number, b: number) => a + (b - a) * rng()

export const buildings: Building[] = []
export const signs: SignData[] = []

type Kind = 'H' | 'V' | 'R' | 'T'
const PATTERNS: Kind[][] = [['H', 'V'], ['H'], ['T'], ['H', 'R'], ['V', 'H'], [], ['T', 'H'], ['H'], ['R'], ['H', 'V']]

let sid = 0
function makeSign(kind: Kind, b: Building, zc: number, idx: number): SignData {
  const side = b.side
  const dir = (-side) as 1 | -1
  const wallX = side * WALL_X
  const neon = NEON[Math.floor(rng() * NEON.length)]
  const aft = AFTER[(idx * 3 + (kind === 'H' ? 0 : 1)) % AFTER.length]
  const id = `SG-${String(++sid).padStart(2, '0')}`
  const base = {
    id,
    side,
    wallX,
    dir,
    zc,
    panel0: neon[0],
    text0: neon[1],
    colorName: neon[2],
    panel1: aft.panel,
    text1: aft.text,
    e1: aft.e,
    variant: aft.name,
    bandX: 0.24,
  }
  if (kind === 'H') {
    const [brand, sub, logo] = FASCIA_NAMES[(idx * 5) % FASCIA_NAMES.length]
    const w = Math.min(b.w - 2.9, r(3.2, 4.8))
    const h = r(1.0, 1.5)
    return {
      ...base, brand, sub, logo, type: 'FASCIA', shape: 'box', hinge: false,
      w, h, y0: 3.7 + (rng() - 0.5) * 0.7, y1: 3.675, d0: r(0.28, 0.46), d1: 0.06,
      s1: Math.min(1, 0.9 / h), e0: r(1.7, 2.8),
    }
  }
  if (kind === 'V') {
    const [brand, sub, logo] = VERTICAL_NAMES[(idx * 7) % VERTICAL_NAMES.length]
    const h = r(2.6, 5.0)
    return {
      ...base, brand, sub, logo, type: 'VERTICAL', shape: 'box', hinge: true,
      w: r(0.75, 1.05), h, y0: Math.max(h / 2 + 4.5, r(5.2, 8.5)), y1: 5.8, d0: 0.22, d1: 0.06,
      s1: Math.min(1, 2.9 / h), e0: r(2.0, 3.0),
    }
  }
  if (kind === 'R') {
    const [brand, sub, logo] = ROUND_NAMES[(idx * 3) % ROUND_NAMES.length]
    const rad = r(0.5, 0.68)
    return {
      ...base, brand, sub, logo, type: 'ROUND', shape: 'disc', hinge: true,
      w: rad * 2, h: rad * 2, y0: r(3.9, 5.8), y1: 5.7, d0: 0.16, d1: 0.05, s1: 0.78, e0: r(2.0, 3.0),
    }
  }
  const [brand, sub, logo] = BANNER_NAMES[(idx * 3 + 1) % BANNER_NAMES.length]
  const h = r(4.5, 6.8)
  return {
    ...base, brand, sub, logo, type: 'BANNER', shape: 'box', hinge: false, bandX: 0.02,
    w: r(1.15, 1.6), h, y0: h / 2 + 4.5 + r(0, 1.2), y1: 5.9, d0: 0.45, d1: 0.06,
    s1: Math.min(1, 3.0 / h), e0: r(2.2, 3.0),
  }
}

// ---- buildings along both sides
;([-1, 1] as Side[]).forEach((side) => {
  let z = -HALF_LEN
  let k = side === -1 ? 0 : 4
  while (z < HALF_LEN - 5) {
    const w = Math.min(r(6.4, 10), HALF_LEN - z)
    const floors = 3 + Math.floor(rng() * 5)
    const b: Building = {
      side, z0: z, z1: z + w, zc: z + w / 2, w,
      H: GROUND_H + floors * FLOOR_H, D: 10,
      wall: WALLS[Math.floor(rng() * WALLS.length)],
      style: Math.floor(rng() * 5),
    }
    buildings.push(b)
    const pat = PATTERNS[k++ % PATTERNS.length]
    pat.forEach((kind, i) => {
      if (kind === 'H') signs.push(makeSign('H', b, b.zc, signs.length))
      else {
        const nonH = pat.filter((p) => p !== 'H')
        const idxIn = nonH.indexOf(kind)
        // far edge for second edge sign, otherwise near edge (alternate by building for variety)
        const near = (idxIn + k) % 2 === 0
        const zc = near ? b.z0 + 1.0 : b.z1 - 1.0
        signs.push(makeSign(kind, b, zc, signs.length))
      }
      void i
    })
    z += w
  }
})

/* ---------------------------- architecture instances ---------------------------- */
export const arch = {
  walls: [] as Inst[],
  ledges: [] as Inst[],
  pilasters: [] as Inst[],
  bands: [] as Inst[],
  glass: [] as Inst[],
  mullions: [] as Inst[],
  interiors: [] as Inst[],
  shelves: [] as Inst[],
  ceilingLights: [] as Inst[],
  sills: [] as Inst[],
  windowsLit: [] as Inst[],
  windowsDark: [] as Inst[],
  fins: [] as Inst[],
  roof: [] as Inst[],
}

const ar = mulberry32(31337)
const a = (lo: number, hi: number) => lo + (hi - lo) * ar()
const WARM: RGB[] = [[1, 0.82, 0.55], [1, 0.9, 0.75], [0.8, 0.9, 1], [1, 0.65, 0.8], [0.7, 1, 0.8], [1, 0.75, 0.45]]
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]

buildings.forEach((b) => {
  const { side } = b
  const wallX = side * WALL_X
  const dir = -side
  // main upper block
  const upperH = b.H - GROUND_H
  arch.walls.push({ p: [wallX + side * (b.D / 2), GROUND_H + upperH / 2, b.zc], s: [b.D, upperH, b.w], c: b.wall })
  // ground block behind shop interior (solid)
  arch.walls.push({ p: [wallX + side * (3.2 + (b.D - 3.2) / 2), GROUND_H / 2, b.zc], s: [b.D - 3.2, GROUND_H, b.w], c: '#303030' })
  // fascia band (dark base for signage)
  arch.bands.push({ p: [wallX + dir * 0.12, 3.675, b.zc], s: [0.24, 1.05, b.w - 0.7], c: '#2c2c2e' })
  // pilasters (building separators)
  ;[b.z0 + 0.2, b.z1 - 0.2].forEach((zz) =>
    arch.pilasters.push({ p: [wallX + dir * 0.18, GROUND_H / 2, zz], s: [0.36, GROUND_H, 0.4], c: b.wall }),
  )
  // ledges at floor lines
  for (let y = GROUND_H; y < b.H; y += FLOOR_H * (1 + (b.style === 1 ? 1 : 0))) {
    arch.ledges.push({ p: [wallX + dir * 0.09, y, b.zc], s: [0.36, 0.18, b.w], c: '#b8b2a8' })
  }
  // roof parapet + occasional rooftop mass
  arch.roof.push({ p: [wallX + dir * 0.0, b.H + 0.35, b.zc], s: [0.5, 0.7, b.w], c: b.wall })
  if (ar() > 0.55) arch.roof.push({ p: [wallX + side * 3, b.H + 0.9, b.zc + a(-1.5, 1.5)], s: [2.4, 1.8, 2], c: '#6e6e6e' })

  // shop interior (lit room seen through glass)
  const shopW = b.w - 0.9
  const warm = WARM[Math.floor(ar() * WARM.length)]
  arch.interiors.push({ p: [wallX + side * 1.6, 1.65, b.zc], s: [3.2, 3.1, shopW], c: scale(warm, a(0.03, 0.07)) })
  arch.glass.push({ p: [wallX + dir * 0.03, 1.65, b.zc], s: [0.04, 3.1, shopW] })
  // shelves / counters
  const n = 3 + Math.floor(ar() * 3)
  for (let i = 0; i < n; i++) {
    const zz = b.z0 + 0.9 + ((shopW - 0.4) / n) * (i + 0.5) + a(-0.2, 0.2)
    arch.shelves.push({ p: [wallX + side * 2.9, a(0.6, 1.3), zz], s: [0.5, a(1.2, 2.4), a(0.5, 0.9)], c: scale(WARM[Math.floor(ar() * WARM.length)], a(0.08, 0.3)) })
  }
  arch.shelves.push({ p: [wallX + side * 1.1, 0.5, b.zc + a(-1, 1)], s: [0.7, 1.0, a(1.2, 2.2)], c: scale(warm, 0.08) })
  // ceiling lights
  for (let i = 0; i < 2; i++) {
    arch.ceilingLights.push({ p: [wallX + side * (1.0 + i * 1.2), 3.05, b.zc + a(-1.8, 1.8)], s: [0.9, 0.05, 0.14], c: [2.8, 2.7, 2.4] })
  }
  // mullions + door gap
  const doorZ = b.zc + a(-1.2, 1.2)
  for (let zz = b.z0 + 0.45; zz <= b.z1 - 0.45; zz += 1.45) {
    if (Math.abs(zz - doorZ) < 0.85) continue
    arch.mullions.push({ p: [wallX + dir * 0.07, 1.65, zz], s: [0.1, 3.1, 0.06], c: '#1a1a1a' })
  }
  arch.mullions.push({ p: [wallX + dir * 0.07, 3.15, b.zc], s: [0.1, 0.08, shopW], c: '#1a1a1a' })
  arch.mullions.push({ p: [wallX + dir * 0.07, 0.12, b.zc], s: [0.1, 0.24, shopW], c: '#1a1a1a' })
  ;[doorZ - 0.55, doorZ + 0.55].forEach((zz) => arch.mullions.push({ p: [wallX + dir * 0.09, 1.45, zz], s: [0.06, 2.9, 0.07], c: '#8a8a8a' }))

  // upper-floor windows
  const nf = Math.floor((b.H - GROUND_H - 0.8) / FLOOR_H)
  for (let f = 0; f < nf; f++) {
    const yc = GROUND_H + 1.75 + f * FLOOR_H
    const lowZone = yc - 0.9 < 7.5
    const zs = b.z0 + (lowZone ? 1.9 : 0.9)
    const ze = b.z1 - (lowZone ? 1.9 : 0.9)
    const range = ze - zs
    if (range < 1.4) continue
    const curtain = b.style === 3
    const cols = curtain ? 1 : Math.max(1, Math.floor(range / 1.9))
    const sp = range / cols
    for (let i = 0; i < cols; i++) {
      const zz = zs + sp * (i + 0.5)
      const ww = curtain ? range - 0.2 : 1.15
      const hh = curtain ? 2.3 : 1.55
      const lit = ar() > 0.42
      const inst: Inst = {
        p: [wallX + dir * 0.03, yc, zz],
        s: [0.1, hh, ww],
        c: lit ? scale(ar() > 0.2 ? WARM[Math.floor(ar() * 3)] : WARM[3], a(0.55, 1.15)) : '#0d1117',
      }
      ;(lit ? arch.windowsLit : arch.windowsDark).push(inst)
      if (!curtain) arch.sills.push({ p: [wallX + dir * 0.13, yc - hh / 2 - 0.05, zz], s: [0.3, 0.08, ww + 0.25], c: '#b8b2a8' })
    }
  }
  // vertical fins (style 4) in the upper zone, clear of the sign band
  if (b.style === 4) {
    for (let zz = b.z0 + 0.6; zz < b.z1 - 0.4; zz += 0.9) {
      arch.fins.push({ p: [wallX + dir * 0.15, (7.6 + b.H) / 2, zz], s: [0.3, b.H - 7.6 - 0.4, 0.1], c: '#3a3a3d' })
    }
  }
})

/* ---------------------------- props & obstacles ---------------------------- */
export interface Circle { x: number; z: number; r: number }
export interface Box { x0: number; x1: number; z0: number; z1: number }
export const circles: Circle[] = []
export const boxes: Box[] = []
export const lamps: { x: number; z: number; side: Side }[] = []
export const stalls: { x: number; z: number; side: Side; color: string }[] = []

for (let z = -54, i = 0; z <= 54; z += 12, i++) {
  const side: Side = i % 2 === 0 ? -1 : 1
  lamps.push({ x: side * 3.3, z, side })
  circles.push({ x: side * 3.3, z, r: 0.3 })
}
const STALL_COLORS = ['#e8e3d8', '#d9c9a0', '#c9d8d0', '#e0b9b0', '#cfd3df']
;[[-46, -1], [-33, 1], [-20, -1], [-3, 1], [11, -1], [24, 1], [38, -1], [47, 1]].forEach(([z, side], i) => {
  stalls.push({ x: (side as number) * 2.85, z: z as number, side: side as Side, color: STALL_COLORS[i % STALL_COLORS.length] })
  boxes.push({ x0: Math.min(side * 2.2, side * 3.5), x1: Math.max(side * 2.2, side * 3.5), z0: (z as number) - 1.2, z1: (z as number) + 1.2 })
})

export const SIGN_COUNT = signs.length
if (import.meta.env?.DEV) console.info(`[RE:LIGHT] buildings=${buildings.length} signs=${signs.length}`)
