import { ChevronDown, Plus } from 'lucide-react'

interface LanguageLaneBarProps {
  /** Currently active translation language, or null before any lane exists. */
  activeLanguage: string | null
  /** Languages that already have a lane. */
  languages: string[]
  /** Full catalog for the Add language picker. */
  languageOptions: { value: string; label: string }[]
  onSelectLanguage: (language: string) => void
  onAddLanguage: (language: string) => void
}

/**
 * Once a translation exists: `Spanish ▼` + `Add language`.
 * Before that: `+ Add translation` picker.
 */
export default function LanguageLaneBar({
  activeLanguage,
  languages,
  languageOptions,
  onSelectLanguage,
  onAddLanguage,
}: LanguageLaneBarProps) {
  const availableToAdd = languageOptions.filter((l) => !languages.includes(l.value))

  if (!activeLanguage) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-100">+ Add translation</label>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            onAddLanguage(v)
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          aria-label="Add translation language"
        >
          <option value="">Choose language…</option>
          {languageOptions.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <select
          value={activeLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
          className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          aria-label="Active translation language"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
      </div>

      {availableToAdd.length > 0 && (
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              onAddLanguage(v)
            }}
            className="appearance-none rounded-lg border border-dashed border-gray-300 bg-white py-2 pl-8 pr-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Add language"
          >
            <option value="">Add language</option>
            {availableToAdd.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <Plus
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
        </div>
      )}
    </div>
  )
}
