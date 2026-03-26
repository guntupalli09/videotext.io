/**
 * Helpers for assertions against JSON-LD in HTML (not bundled JS strings).
 */

/** Count separate FAQPage objects inside application/ld+json script tags. */
export function countFaqPageInJsonLdScripts(html: string): number {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let n = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (/"@type"\s*:\s*"FAQPage"/.test(m[1])) n++
  }
  return n
}
