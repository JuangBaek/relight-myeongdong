/** Per-shop typefaces (Google Fonts, loaded in index.html). Every stack falls back to system Korean fonts. */
export type FontId =
  | 'blackhan' | 'jua' | 'dohyeon' | 'gowun' | 'notoserif' | 'penscript' | 'gaegu' | 'sunflower'
  | 'yeonsung' | 'notosans' | 'bebas' | 'pacifico' | 'playfair' | 'orbitron' | 'righteous' | 'anton' | 'cinzel'

export interface FontDef {
  label: string
  family: string
  weight: number
  stack: string
  spacing: number // letter spacing in em
  size: number // relative size multiplier (some faces run small/large)
}

const KO = `'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif`
const mk = (label: string, family: string, weight: number, spacing = 0, size = 1): FontDef => ({
  label,
  family,
  weight,
  stack: `'${family}',${KO}`,
  spacing,
  size,
})

export const FONTS: Record<FontId, FontDef> = {
  blackhan: mk('Black Han Sans · heavy display', 'Black Han Sans', 400, 0.02, 1.05),
  jua: mk('Jua · rounded', 'Jua', 400, 0.02, 1.05),
  dohyeon: mk('Do Hyeon · condensed', 'Do Hyeon', 400, 0.04, 1.1),
  gowun: mk('Gowun Batang · soft serif', 'Gowun Batang', 700, 0.03, 1),
  notoserif: mk('Noto Serif KR · classic serif', 'Noto Serif KR', 900, 0.01, 0.95),
  penscript: mk('Nanum Pen · handwritten', 'Nanum Pen Script', 400, 0.02, 1.3),
  gaegu: mk('Gaegu · playful hand', 'Gaegu', 700, 0.02, 1.15),
  sunflower: mk('Sunflower · friendly sans', 'Sunflower', 700, 0.03, 1),
  yeonsung: mk('Yeon Sung · brush', 'Yeon Sung', 400, 0.02, 1.05),
  notosans: mk('Noto Sans KR · black', 'Noto Sans KR', 900, 0, 1),
  bebas: mk('Bebas Neue · tall caps', 'Bebas Neue', 400, 0.08, 1.2),
  pacifico: mk('Pacifico · script', 'Pacifico', 400, 0, 0.92),
  playfair: mk('Playfair · editorial serif', 'Playfair Display', 700, 0.02, 0.95),
  orbitron: mk('Orbitron · techno', 'Orbitron', 700, 0.08, 0.85),
  righteous: mk('Righteous · retro', 'Righteous', 400, 0.04, 1),
  anton: mk('Anton · poster', 'Anton', 400, 0.04, 1.1),
  cinzel: mk('Cinzel · roman', 'Cinzel', 700, 0.08, 0.9),
}

const SUB_FONT = mk('Noto Sans KR', 'Noto Sans KR', 700, 0.14, 1)
export const subFont = () => SUB_FONT

let cssReady: Promise<void> | null = null
/** Wait until the Google Fonts stylesheet is parsed (so @font-face rules exist). */
function waitForFontCss(): Promise<void> {
  if (cssReady) return cssReady
  cssReady = new Promise((resolve) => {
    const t0 = performance.now()
    const poll = () => {
      const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href*="fonts.googleapis"]'))
      const ok = links.length > 0 && links.every((l) => !!l.sheet)
      if (ok || performance.now() - t0 > 4000) resolve()
      else setTimeout(poll, 80)
    }
    poll()
  })
  return cssReady
}

const loaded = new Map<string, Promise<unknown>>()
/** Resolves once the sign's face(s) are ready for canvas drawing (or after a timeout, falling back to system fonts). */
export async function ensureFonts(font: FontDef, text: string, subText: string) {
  await waitForFontCss()
  const key = `${font.family}|${text}|${subText}`
  if (!loaded.has(key)) {
    const job = Promise.race([
      Promise.all([
        document.fonts.load(`${font.weight} 48px "${font.family}"`, text),
        document.fonts.load(`700 48px "${SUB_FONT.family}"`, subText || 'A'),
      ]),
      new Promise((r) => setTimeout(r, 5000)),
    ]).catch(() => undefined)
    loaded.set(key, job)
  }
  await loaded.get(key)
}
