/**
 * Normalize a language value to a Whisper-compatible ISO 639-1 code.
 *
 * Handles:
 *   "en"         → "en"          (already valid)
 *   "en-US"      → "en"          (strip region variant)
 *   "indonesian" → "id"          (full language name)
 *   "gibberish"  → undefined     (unknown → Whisper auto-detects)
 *   ""           → undefined     (empty → auto-detect)
 *
 * NOTE: client/src/lib/languages.ts has the full 74-entry list for UI rendering.
 * This server-side copy is intentionally smaller — validation and normalization only.
 */

const LANG_NAME_TO_ISO: Record<string, string> = {
  english: 'en', spanish: 'es', french: 'fr', german: 'de',
  chinese: 'zh', japanese: 'ja', korean: 'ko', portuguese: 'pt',
  italian: 'it', russian: 'ru', arabic: 'ar', hindi: 'hi',
  dutch: 'nl', turkish: 'tr', polish: 'pl', vietnamese: 'vi',
  thai: 'th', indonesian: 'id', swedish: 'sv', norwegian: 'no',
  danish: 'da', finnish: 'fi', hebrew: 'he', persian: 'fa', farsi: 'fa',
  ukrainian: 'uk', czech: 'cs', slovak: 'sk', romanian: 'ro',
  hungarian: 'hu', greek: 'el', bulgarian: 'bg', croatian: 'hr',
  serbian: 'sr', catalan: 'ca', malay: 'ms', tagalog: 'tl', filipino: 'tl',
  bengali: 'bn', tamil: 'ta', telugu: 'te', marathi: 'mr', gujarati: 'gu',
  kannada: 'kn', malayalam: 'ml', punjabi: 'pa', urdu: 'ur', swahili: 'sw',
  amharic: 'am', afrikaans: 'af', albanian: 'sq', armenian: 'hy',
  georgian: 'ka', icelandic: 'is', latvian: 'lv', lithuanian: 'lt',
  macedonian: 'mk', basque: 'eu', galician: 'gl', belarusian: 'be',
  kazakh: 'kk', mongolian: 'mn', burmese: 'my', khmer: 'km', sinhala: 'si',
}

const VALID_ISO_CODES = new Set([
  'en','es','fr','de','zh','zh-tw','ja','ko','pt','it','ru','ar','hi',
  'nl','tr','pl','vi','th','id','sv','no','da','fi','he','fa','uk',
  'cs','sk','ro','hu','el','bg','hr','sr','ca','ms','tl','bn','ta',
  'te','mr','gu','kn','ml','pa','ur','sw','am','af','sq','hy','ka',
  'is','lv','lt','mk','eu','gl','be','kk','mn','my','km','lo','si',
])

export function normalizeLanguageCode(lang: unknown): string | undefined {
  if (!lang || typeof lang !== 'string') return undefined
  const trimmed = lang.trim().toLowerCase()
  if (!trimmed) return undefined
  if (VALID_ISO_CODES.has(trimmed)) return trimmed                // exact ISO code ("en", "zh-tw")
  const base = trimmed.split('-')[0]
  if (base !== trimmed && VALID_ISO_CODES.has(base)) return base  // region variant ("en-US" → "en")
  return LANG_NAME_TO_ISO[trimmed]                                // full name → ISO; unknown → undefined
}
