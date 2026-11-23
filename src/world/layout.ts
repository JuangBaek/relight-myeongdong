import { mulberry32 } from './rng'
import { scriptOf, type FontId } from './fonts'
import { BRAND_LOGOS } from './brandAssets'

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
export type Logo =
  | 'ring' | 'hex' | 'star' | 'diamond' | 'leaf' | 'wave'
  | 'cup' | 'bowl' | 'mic' | 'crown' | 'moon' | 'drop' | 'heart' | 'sun'
  | 'bread' | 'glasses' | 'dumpling' | 'chili' | 'flower' | 'bolt'
export type RGB = [number, number, number]
export type V3 = [number, number, number]

export interface Inst {
  p: V3
  s: V3
  ry?: number
  rx?: number
  rz?: number
  c?: string | number | RGB
  uv?: [number, number] // texture tiling for textured walls (per instance)
}

export interface SignData {
  id: string
  brand: string
  sub?: string
  logo: Logo
  fontId: FontId
  layout: number // artwork composition variant (differs per shop)
  frame: number // border style variant
  badge: boolean // logo in a knocked-out badge
  vert: 'stack' | 'rotate' | 'tategaki' // vertical signs: upright stacked chars, 90°-rotated line, or Japanese tategaki columns
  metal: number // frame finish (0 black, 1 graphite, 2 aluminium, 3 bronze, 4 champagne)
  chan: boolean // raised channel-letter relief
  logoUrl?: string // optional brand artwork (PNG/SVG alpha mask) – see brandAssets.ts
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
// [name, sub-line, logo, typeface, vertical-mode?] — every shop name here is fictional.
// Signs mix Korean / English / Japanese / Chinese like real tourist streets. Each name is used at most once.
type Vert = 'stack' | 'rotate' | 'tategaki'
type NameDef = [string, string | undefined, Logo, FontId, Vert?]
const FASCIA_NAMES: NameDef[] = [
  ['달빛 떡볶이', 'TTEOKBOKKI', 'moon', 'jua'],
  ['NOVA CAFE', '노바 카페', 'cup', 'orbitron'],
  ['루미 코스메틱', 'LUMI COSMETIC', 'drop', 'gowun'],
  ['MINT SPA', '족욕 · 마사지', 'leaf', 'cinzel'],
  ['청춘 노래방', 'KARAOKE', 'mic', 'blackhan'],
  ['오후의 베이커리', 'BAKERY', 'bread', 'notoserif'],
  ['하늘 안경원', 'OPTICAL', 'glasses', 'sunflower'],
  ['별숲 포차', undefined, 'star', 'penscript'],
  ['BLOOM NAIL', '블룸 네일 · ネイル', 'flower', 'pacifico'],
  ['한입 만두', 'DUMPLING', 'dumpling', 'dohyeon'],
  ['블루문 BAR', undefined, 'moon', 'righteous'],
  ['오늘 라멘', 'RAMEN · ラーメン', 'bowl', 'yeonsung'],
  ['PEACH BEAUTY', '피치 뷰티', 'heart', 'playfair'],
  ['다온 기념품', 'SOUVENIR · お土産', 'crown', 'gaegu'],
  ['PIXEL ZONE', '게임존', 'bolt', 'anton'],
  ['담소 찻집', 'TEA HOUSE', 'ring', 'gowun'],
  ['금빛 호떡', undefined, 'sun', 'blackhan'],
  ['SEOUL GOODS', '서울 굿즈', 'hex', 'bebas'],
  ['모아 문구점', 'STATIONERY', 'diamond', 'gaegu'],
  ['SUNDAY BRUNCH', '선데이 브런치', 'sun', 'playfair'],
  ['고래 아이스크림', 'ICE CREAM', 'drop', 'jua'],
  ['NEON LAB', '네온 랩', 'bolt', 'orbitron'],
  ['은하 반점', 'CHINESE · 中餐', 'ring', 'yeonsung'],
  ['VINTAGE FILM', '빈티지 필름', 'hex', 'cinzel'],
  ['숲속 생과일', 'JUICE BAR', 'leaf', 'sunflower'],
  ['TOKYO TOAST', '도쿄 토스트', 'bread', 'righteous'],
  // Japanese / Chinese / calligraphy / modern faces
  ['ひなた カフェ', 'HINATA CAFE · 히나타', 'sun', 'yuji'],
  ['ネイルサロン 美', 'NAIL SALON · 네일', 'flower', 'dela'],
  ['足浴 · 按摩', 'FOOT MASSAGE · 족욕', 'leaf', 'notosanstc'],
  ['美甲 美睫', 'NAIL & LASH · 네일', 'flower', 'mashan'],
  ['小笼包 点心', 'DIM SUM · 딤섬', 'dumpling', 'mashan'],
  ['동해 횟집', 'EAST SEA', 'wave', 'eastsea'],
  ['붓글 한복', 'HANBOK · 韓服', 'crown', 'brush'],
  ['ATELIER 23', '아뜰리에 이삼', 'diamond', 'gothica1'],
  ['NIGHT MARKET', '야시장', 'star', 'bungee'],
  ["LOLA'S DINER", '로라 다이너', 'heart', 'lobster'],
  ['URBAN TAILOR', '어반 테일러', 'crown', 'oswald'],
  ['たこ焼き 屋台', 'TAKOYAKI · 타코야키', 'chili', 'notosansjp'],
  ['PAPER MOON', '페이퍼문', 'moon', 'playfair'],
  ['한강 치맥', 'CHIMAEK', 'cup', 'blackhan'],
  ['PLAYBOX', '플레이박스', 'hex', 'bungee'],
  ['꿀 베이글', 'HONEY BAGEL', 'ring', 'jua'],
  ['青空 書店', 'BOOKS · 서점', 'diamond', 'yuji'],
  ['SNEAKER ROOM', '스니커룸', 'bolt', 'oswald'],
]
const VERTICAL_NAMES: NameDef[] = [
  ['이모네 분식', undefined, 'heart', 'jua'],
  ['네일아트', 'NAIL', 'flower', 'gaegu'],
  ['해장국', '24H', 'bowl', 'yeonsung'],
  ['한방 족욕', undefined, 'leaf', 'notoserif'],
  ['찜닭', 'JJIMDAK', 'chili', 'dohyeon'],
  ['헤어살롱', 'HAIR', 'crown', 'gowun'],
  ['오락실', 'ARCADE', 'bolt', 'sunflower'],
  ['마사지', 'MASSAGE', 'drop', 'yeonsung'],
  ['호떡집', undefined, 'sun', 'penscript'],
  ['달콤 와플', 'WAFFLE', 'hex', 'jua'],
  ['포토 스튜디오', 'PHOTO', 'glasses', 'dohyeon'],
  ['레코드 샵', 'RECORDS', 'ring', 'sunflower'],
  // Japanese tategaki (columns, right to left), rotated Latin, Chinese stacks
  ['占いの館', 'ウラナイ', 'moon', 'yuji', 'tategaki'],
  ['ラーメン', 'RAMEN', 'bowl', 'dela', 'tategaki'],
  ['足疗按摩', 'FOOT SPA', 'leaf', 'notosanstc', 'stack'],
  ['美容院', 'SALON', 'crown', 'mashan', 'stack'],
  ['MOON LIGHT BAR', '문라이트', 'moon', 'bungee', 'rotate'],
  ['SEOUL MARKET', '서울마켓', 'hex', 'oswald', 'rotate'],
  ['꽃집', 'FLORIST', 'flower', 'gowun'],
  ['お好み焼き', 'OKONOMIYAKI', 'bread', 'dela', 'tategaki'],
  ['茶楼', 'TEA HOUSE', 'leaf', 'yuji', 'stack'],
  ['HOT STAGE', '핫스테이지', 'bolt', 'anton', 'rotate'],
]
const ROUND_NAMES: NameDef[] = [
  ['달 카페', 'CAFE', 'cup', 'gowun'],
  ['별 사주', undefined, 'star', 'yeonsung'],
  ['족욕', 'FOOT SPA', 'leaf', 'dohyeon'],
  ['피자 24', undefined, 'sun', 'anton'],
  ['한입', 'SNACK', 'dumpling', 'jua'],
  ['귤 카페', 'TANGERINE', 'leaf', 'pacifico'],
  ['호호 분식', 'HOHO', 'heart', 'gaegu'],
  ['밤 산책', 'NIGHT WALK', 'moon', 'notoserif'],
  ['カフェ', 'CAFE', 'cup', 'dela'],
  ['茶', 'TEA', 'leaf', 'mashan'],
  ['占', '운세', 'moon', 'yuji'],
  ['달토끼', 'MOON RABBIT', 'moon', 'gaegu'],
  ['홍차', 'BLACK TEA', 'cup', 'playfair'],
  ['ボバ', 'BOBA', 'drop', 'dela'],
  ['辣', 'SPICY', 'chili', 'mashan'],
  ['딸기', 'BERRY', 'heart', 'jua'],
]
const BANNER_NAMES: NameDef[] = [
  ['몽글 빙수', 'BINGSU', 'diamond', 'jua'],
  ['루나 뷰티', 'LUNA', 'star', 'notoserif'],
  ['핫 치킨', 'CHICKEN', 'chili', 'sunflower'],
  ['크림 디저트', 'DESSERT', 'heart', 'gaegu'],
  ['미니 스파', 'SPA', 'wave', 'sunflower'],
  ['토이 월드', 'TOY', 'bolt', 'dohyeon'],
  ['스시 하나', 'SUSHI', 'ring', 'yeonsung'],
  ['꽃 카페', 'FLOWER', 'flower', 'penscript'],
  ['달다 마카롱', 'MACARON', 'heart', 'gowun'],
  ['한밤 치킨', 'NIGHT BITE', 'chili', 'yeonsung'],
  ['美白 エステ', 'ESTHE', 'drop', 'yuji', 'tategaki'],
  ['美颜 护肤', 'SKIN CARE', 'drop', 'notosanstc', 'stack'],
  ['やきとり', 'YAKITORI', 'chili', 'dela', 'tategaki'],
  ['한방 찜질', 'JJIMJIL', 'leaf', 'notoserif'],
  ['별빛 노래방', 'KARAOKE', 'mic', 'sunflower'],
  ['타코 하우스', 'TACO', 'chili', 'jua'],
  ['네온 포토', 'PHOTO', 'glasses', 'bungee', 'rotate'],
]
const defaultVert = (brand: string): Vert => (scriptOf(brand) === 'latin' ? 'rotate' : 'stack')

/** Seeded shuffle so the street mixes languages and moods instead of following table order. */
function shuffled<T>(arr: T[], seed: number): T[] {
  const r0 = mulberry32(seed)
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r0() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const SHUFFLED = {
  F: shuffled(FASCIA_NAMES, 11),
  V: shuffled(VERTICAL_NAMES, 22),
  R: shuffled(ROUND_NAMES, 33),
  B: shuffled(BANNER_NAMES, 44),
}

/**
 * Pick a shop identity: never reuse a name, and prefer a typeface / logo that is not already
 * used by another sign within ~16 m (either side of the street), so neighbours never look alike.
 */
const usedNames = new Set<string>()
const placed: { z: number; font: FontId; logo: Logo }[] = []
function pickName(table: NameDef[], zc: number): NameDef {
  const pool = table.filter((n) => !usedNames.has(n[0]))
  const list = pool.length ? pool : table
  const near = placed.filter((p) => Math.abs(p.z - zc) < 16)
  let best = list[0]
  let bestScore = Infinity
  for (const n of list) {
    const score = (near.some((p) => p.font === n[3]) ? 2 : 0) + (near.some((p) => p.logo === n[2] && Math.abs(p.z - zc) < 9) ? 1 : 0)
    if (score < bestScore) {
      best = n
      bestScore = score
      if (score === 0) break
    }
  }
  usedNames.add(best[0])
  placed.push({ z: zc, font: best[3], logo: best[2] })
  return best
}

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
// every building gets a fascia sign; most also carry one or two projecting / banner signs on the façade edges
const PATTERNS: Kind[][] = [['H', 'V'], ['H', 'T'], ['H', 'R'], ['H', 'V', 'R'], ['H'], ['H', 'T', 'V'], ['H', 'R'], ['H', 'R', 'T'], ['H', 'V']]

let sid = 0
function makeSign(kind: Kind, b: Building, zc: number, idx: number): SignData {
  const side = b.side
  const dir = (-side) as 1 | -1
  const wallX = side * WALL_X
  const neon = NEON[Math.floor(rng() * NEON.length)]
  const aft = AFTER[(idx * 3 + (kind === 'H' ? 0 : 1)) % AFTER.length]
  const id = `SG-${String(++sid).padStart(2, '0')}`
  const base = {
    layout: (idx * 7 + 3) % 6,
    frame: (idx * 5 + 1) % 6,
    badge: idx % 3 === 1,
    metal: idx % 5,
    chan: idx % 3 !== 0,
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
    const [brand, sub, logo, fontId] = pickName(SHUFFLED.F, zc)
    const w = Math.min(b.w - 2.9, r(3.2, 4.8))
    const h = r(1.0, 1.5)
    return {
      ...base, brand, sub, logo, fontId, vert: 'stack', type: 'FASCIA', shape: 'box', hinge: false,
      w, h, y0: 3.7 + (rng() - 0.5) * 0.7, y1: 3.675, d0: r(0.28, 0.46), d1: 0.06,
      s1: Math.min(1, 0.9 / h), e0: r(1.7, 2.8),
    }
  }
  if (kind === 'V') {
    const [brand, sub, logo, fontId, vd] = pickName(SHUFFLED.V, zc)
    const h = r(2.6, 5.0)
    return {
      ...base, brand, sub, logo, fontId, vert: vd ?? defaultVert(brand), type: 'VERTICAL', shape: 'box', hinge: true,
      w: r(0.75, 1.05), h, y0: Math.max(h / 2 + 4.5, r(5.2, 8.5)), y1: 5.8, d0: 0.22, d1: 0.06,
      s1: Math.min(1, 2.9 / h), e0: r(2.0, 3.0),
    }
  }
  if (kind === 'R') {
    const [brand, sub, logo, fontId] = pickName(SHUFFLED.R, zc)
    const rad = r(0.5, 0.68)
    return {
      ...base, brand, sub, logo, fontId, vert: 'stack', type: 'ROUND', shape: 'disc', hinge: true,
      w: rad * 2, h: rad * 2, y0: r(3.9, 5.8), y1: 5.7, d0: 0.16, d1: 0.05, s1: 0.78, e0: r(2.0, 3.0),
    }
  }
  const [brand, sub, logo, fontId, vd] = pickName(SHUFFLED.B, zc)
  const h = r(4.5, 6.8)
  return {
    ...base, brand, sub, logo, fontId, vert: vd ?? defaultVert(brand), type: 'BANNER', shape: 'box', hinge: false, bandX: 0.02,
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

// optional real brand artwork (see brandAssets.ts)
signs.forEach((s) => {
  const u = BRAND_LOGOS[s.brand]
  if (u) s.logoUrl = u
})

/* ---------------------------- architecture instances ---------------------------- */
export const arch = {
  walls: [] as Inst[],
  wallTex: [[], [], [], [], []] as Inst[][], // stucco, brick, tile, metal panel, concrete
  acBody: [] as Inst[],
  acFan: [] as Inst[],
  pipes: [] as Inst[],
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
  // textured upper block: material depends on the building (stucco / brick / tile / metal panel / concrete)
  const mat = b.style % 5
  arch.wallTex[mat].push({ p: [wallX + side * (b.D / 2), GROUND_H + upperH / 2, b.zc], s: [b.D, upperH, b.w], c: mat === 0 || mat === 4 ? b.wall : '#ffffff', uv: [b.w / 1.6, upperH / 1.6] })
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
  // drain pipe running up the party-wall corner
  if (ar() > 0.45) arch.pipes.push({ p: [wallX + dir * 0.06, (GROUND_H + b.H) / 2, b.z0 + 0.24], s: [0.07, b.H - GROUND_H, 0.07], c: '#55565a' })
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
      // outdoor air-conditioner unit beside some upper windows
      if (f >= 1 && !curtain && ar() > 0.78 && zz + 0.95 < b.z1 - 0.3) {
        const az = zz + 0.88
        arch.acBody.push({ p: [wallX + dir * 0.2, yc - 0.35, az], s: [0.34, 0.5, 0.66], c: '#c9ccd1' })
        arch.acFan.push({ p: [wallX + dir * 0.375, yc - 0.33, az], s: [0.4, 0.02, 0.4], rz: Math.PI / 2, c: '#2a2b2f' })
      }
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
