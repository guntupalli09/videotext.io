'use strict';

// Mirrors client/src/lib/languages.ts LANGUAGES exactly — the same free-form
// `targetLanguage` string values the web app's Translate Subtitles page
// sends (see POST /api/v1/subtitle-translations, which accepts and echoes
// back whatever string is sent). Kept as a static dropdown here rather than
// a free-text field so a Zapier user can't send a language VideoText's
// translation pipeline was never tested against.
const TARGET_LANGUAGES = [
  'Afrikaans', 'Albanian', 'Amharic', 'Arabic', 'Armenian', 'Azerbaijani', 'Basque', 'Belarusian',
  'Bengali', 'Bosnian', 'Bulgarian', 'Catalan', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Croatian', 'Czech', 'Danish', 'Dutch', 'English', 'Estonian', 'Filipino (Tagalog)', 'Finnish',
  'French', 'Galician', 'Georgian', 'German', 'Greek', 'Gujarati', 'Hausa', 'Hebrew', 'Hindi',
  'Hungarian', 'Igbo', 'Indonesian', 'Irish', 'Italian', 'Japanese', 'Kannada', 'Kazakh', 'Korean',
  'Latvian', 'Lithuanian', 'Macedonian', 'Malay', 'Malayalam', 'Marathi', 'Mongolian', 'Nepali',
  'Norwegian', 'Persian (Farsi)', 'Polish', 'Portuguese', 'Punjabi', 'Romanian', 'Russian', 'Serbian',
  'Sinhala', 'Slovak', 'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tamil', 'Telugu', 'Thai',
  'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese', 'Welsh', 'Yoruba', 'Zulu',
];

module.exports = { TARGET_LANGUAGES };
