/**
 * Per-shop typefaces (Google Fonts, loaded in index.html; all SIL Open Font License).
 * Covers Korean, Japanese, Chinese and Latin signage styles. Every stack falls back to
 * system CJK fonts and the glyph coverage of each script is verified before drawing.
 */
export type FontId =
  | 'blackhan' | 'jua' | 'dohyeon' | 'gowun' | 'notoserif' | 'penscript' | 'gaegu' | 'sunflower'
  | 'yeonsung' | 'notosans' | 'bebas' | 'pacifico' | 'playfair' | 'orbitron' | 'righteous' | 'anton' | 'cinzel'
  | 'dela' | 'yuji' | 'notosansjp' | 'notosanstc' | 'mashan' | 'eastsea' | 'brush' | 'gothica1'
  | 'bungee' | 'lobster' | 'oswald'

export interface FontDef {
  label: string
  family: string
  weight: number
  stack: string
  spacing: number // letter spacing in em
  size: number // relative size multiplier (some faces run small/large)
}

const KO_FALL = `'Noto Sans KR','Noto Sans JP','Noto Sans TC','Malgun Gothic','Apple SD Gothic Neo',sans-serif`
const JP_FALL = `'Noto Sans JP','Noto Sans KR','Noto Sans TC','Yu Gothic','Hiragino Sans',sans-serif`
const TC_FALL = `'Noto Sans TC','Noto Sans JP','Noto Sans KR','Microsoft YaHei','PingFang SC',sans-serif`

const mk = (label: string, family: string, weight: number, spacing = 0, size = 1, fall = KO_FALL): FontDef => ({
  label,
  family,
  weight,
  stack: `'${family}',${fall}`,
  spacing,
  size,
})

export const FONTS: Record<FontId, FontDef> = {
  blackhan: mk('Black Han Sans · heavy Korean gothic', 'Black Han Sans', 400, 0.02, 1.05),
  jua: mk('Jua · rounded', 'Jua', 400, 0.02, 1.05),
  dohyeon: mk('Do Hyeon · narrow tall gothic', 'Do Hyeon', 400, 0.04, 1.1),
  gowun: mk('Gowun Batang · soft serif', 'Gowun Batang', 700, 0.03, 1),
  notoserif: mk('Noto Serif KR · classic serif', 'Noto Serif KR', 900, 0.01, 0.95),
  penscript: mk('Nanum Pen · handwritten', 'Nanum Pen Script', 400, 0.02, 1.3),
  gaegu: mk('Gaegu · playful hand', 'Gaegu', 700, 0.02, 1.15),
  sunflower: mk('Sunflower · friendly sans', 'Sunflower', 700, 0.03, 1),
  yeonsung: mk('Yeon Sung · Korean brush', 'Yeon Sung', 400, 0.02, 1.05),
  notosans: mk('Noto Sans KR · black', 'Noto Sans KR', 900, 0, 1),
  bebas: mk('Bebas Neue · condensed caps', 'Bebas Neue', 400, 0.08, 1.2),
  pacifico: mk('Pacifico · script logotype', 'Pacifico', 400, 0, 0.92),
  playfair: mk('Playfair · Latin serif', 'Playfair Display', 700, 0.02, 0.95),
  orbitron: mk('Orbitron · techno', 'Orbitron', 700, 0.08, 0.85),
  righteous: mk('Righteous · retro', 'Righteous', 400, 0.04, 1),
  anton: mk('Anton · poster condensed', 'Anton', 400, 0.04, 1.1),
  cinzel: mk('Cinzel · roman capitals', 'Cinzel', 700, 0.08, 0.9),
  // --- new: Japanese / Chinese / calligraphy / modern ---
  dela: mk('Dela Gothic One · Japanese heavy gothic', 'Dela Gothic One', 400, 0.03, 0.95, JP_FALL),
  yuji: mk('Yuji Syuku · Japanese mincho brush', 'Yuji Syuku', 400, 0.04, 1, JP_FALL),
  notosansjp: mk('Noto Sans JP · bold gothic', 'Noto Sans JP', 700, 0.02, 1, JP_FALL),
  notosanstc: mk('Noto Sans TC · Chinese sans', 'Noto Sans TC', 700, 0.04, 1, TC_FALL),
  mashan: mk('Ma Shan Zheng · Chinese calligraphy', 'Ma Shan Zheng', 400, 0.04, 1.1, TC_FALL),
  eastsea: mk('East Sea Dokdo · Korean brush calligraphy', 'East Sea Dokdo', 400, 0.02, 1.35),
  brush: mk('Nanum Brush · Korean calligraphy', 'Nanum Brush Script', 400, 0.02, 1.3),
  gothica1: mk('Gothic A1 · thin modern sans', 'Gothic A1', 300, 0.1, 1),
  bungee: mk('Bungee · vertical-sign display', 'Bungee', 400, 0.04, 0.85),
  lobster: mk('Lobster · retro script logotype', 'Lobster', 400, 0.01, 1),
  oswald: mk('Oswald · Latin condensed', 'Oswald', 600, 0.06, 1.05),
}

/* ---------------- script detection (picks the right CJK face per line) ---------------- */
const RE_HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏]/
const RE_KANA = /[぀-ヿㇰ-ㇿ]/
const RE_HAN = /[㐀-鿿]/

export type Script = 'ko' | 'ja' | 'zh' | 'latin'
export function scriptOf(text: string): Script {
  if (RE_HANGUL.test(text)) return 'ko'
  if (RE_KANA.test(text)) return 'ja'
  if (RE_HAN.test(text)) return 'zh'
  return 'latin'
}

const mkSub = (stack: string): FontDef => ({ label: 'sub', family: 'Noto Sans KR', weight: 700, stack, spacing: 0.14, size: 1 })
const SUB_KO = mkSub(`'Noto Sans KR','Noto Sans JP','Noto Sans TC',sans-serif`)
const SUB_JA = mkSub(`'Noto Sans JP','Noto Sans KR','Noto Sans TC',sans-serif`)
const SUB_ZH = mkSub(`'Noto Sans TC','Noto Sans JP','Noto Sans KR',sans-serif`)
/** Small second line: Latin/Korean use Noto Sans KR, kana lines use Noto Sans JP, Han-only lines use Noto Sans TC. */
export function subFont(text = ''): FontDef {
  const s = scriptOf(text)
  return s === 'ja' ? SUB_JA : s === 'zh' ? SUB_ZH : SUB_KO
}

/* ---------------- loading ---------------- */
let cssReady: Promise<void> | null = null
/** Wait until the Google Fonts stylesheets are parsed (so @font-face rules exist). */
function waitForFontCss(): Promise<void> {
  if (cssReady) return cssReady
  cssReady = new Promise((resolve) => {
    const t0 = performance.now()
    const poll = () => {
      const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis"]'))
      const ok = links.length > 0 && links.every((l) => !!l.sheet)
      if (ok || performance.now() - t0 > 5000) resolve()
      else setTimeout(poll, 80)
    }
    poll()
  })
  return cssReady
}

const CJK_FAMILY: Record<Script, string> = { ko: 'Noto Sans KR', ja: 'Noto Sans JP', zh: 'Noto Sans TC', latin: 'Noto Sans KR' }
const loaded = new Map<string, Promise<unknown>>()

/**
 * Resolves once every face the sign needs is ready for canvas drawing: the shop's own face (for its main text)
 * plus the CJK fallback face of each script that appears in the text. Times out to system fonts.
 */
export async function ensureFonts(font: FontDef, text: string, subText: string) {
  await waitForFontCss()
  const key = `${font.family}|${text}|${subText}`
  if (!loaded.has(key)) {
    const jobs: Promise<unknown>[] = [document.fonts.load(`${font.weight} 48px "${font.family}"`, text)]
    for (const [str, w] of [[text, font.weight], [subText, 700]] as const) {
      if (!str) continue
      const sc = scriptOf(str)
      jobs.push(document.fonts.load(`${sc === 'latin' ? 700 : w} 48px "${CJK_FAMILY[sc]}"`, str))
      // mixed lines (e.g. Korean + Japanese in one sub-line) need the other CJK faces too
      if (RE_KANA.test(str)) jobs.push(document.fonts.load(`700 48px "Noto Sans JP"`, str))
      if (RE_HAN.test(str) && !RE_HANGUL.test(str)) jobs.push(document.fonts.load(`700 48px "Noto Sans TC"`, str))
    }
    loaded.set(key, Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 6000))]).catch(() => undefined))
  }
  await loaded.get(key)
}

/** Dev helper: true if the browser can actually draw every character of `text` with this face (no tofu). */
export function hasGlyphs(font: FontDef, text: string) {
  try {
    return document.fonts.check(`${font.weight} 40px ${font.stack}`, text)
  } catch {
    return false
  }
}
