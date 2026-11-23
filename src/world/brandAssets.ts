/**
 * Swappable brand artwork.
 *
 * Every shop name in this project is fictional, so by default each sign draws its own procedural vector mark
 * (see drawLogo in textures.ts). To use real artwork instead, put a PNG or SVG in `public/brands/` and map the
 * shop name to its URL here, e.g.
 *
 *   '달빛 떡볶이': `${import.meta.env.BASE_URL}brands/dalbit.svg`,
 *
 * The file's ALPHA channel is used as a one-colour mask, so the mark is tinted exactly like the lettering and
 * switches between BEFORE / AFTER colours with the rest of the sign. Only add artwork you have the rights to use.
 */
export const BRAND_LOGOS: Record<string, string> = {}

const cache = new Map<string, Promise<HTMLImageElement | null>>()
export function loadBrandLogo(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = url
      }),
    )
  }
  return cache.get(url)!
}
