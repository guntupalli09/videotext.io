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
  /** Tighter controls for sticky toolbar. */
  compact?: boolean
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
  compact = false,
}: LanguageLaneBarProps) {
  const availableToAdd = languageOptions.filter((l) => !languages.includes(l.value))
  const selectClass = compact
    ? 'appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
    : 'appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

  if (!activeLanguage) {
    return (
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <label className={compact ? 'text-xs font-medium text-gray-700 dark:text-gray-200' : 'text-sm font-medium text-gray-800 dark:text-gray-100'}>
          + Add translation
        </label>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            onAddLanguage(v)
          }}
          className={selectClass}
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
    <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <div className="relative">
        <select
          value={activeLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
          className={selectClass}
          aria-label="Active translation language"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <ChevronDown
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${compact ? 'right-1.5 h-3 w-3' : 'right-2 h-3.5 w-3.5'}`}
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
            className={
              compact
                ? 'appearance-none rounded-md border border-dashed border-gray-300 bg-white py-1.5 pl-7 pr-2.5 text-xs font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                : 'appearance-none rounded-lg border border-dashed border-gray-300 bg-white py-2 pl-8 pr-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
            }
            aria-label="Add language"
          >
            <option value="">Add language</option>
            {availableToAdd.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <Plus
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${compact ? 'left-2 h-3 w-3' : 'left-2.5 h-3.5 w-3.5'}`}
            aria-hidden
          />
        </div>
      )}
    </div>
  )
}
