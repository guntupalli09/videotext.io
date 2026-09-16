/**
 * Store listing copy checks.
 *
 * Version 1.0.0 was REJECTED by the Chrome Web Store under "Spam and placement
 * in the Store" — keyword stuffing (notification ID "Yellow Argon"). The
 * reviewer quoted one line of the description verbatim:
 *
 *   "Video files: MP4, MOV, MKV, AVI, WebM, MPEG, MPG, OGV, 3GP, 3G2, FLV, WMV, TS, M4V"
 *
 * It was rejected AGAIN on 14 Sept 2026 under the same policy, this time
 * quoting an audience list:
 *
 *   "journalists, podcasters, students, researchers, creators, marketers, and professional teams."
 *
 * The policy's own example of the violation is "including in an extension's
 * metadata a long list of the different sites on which the extension works".
 * The lesson from both rejections is that THIS REVIEWER TREATS ANY CATEGORY
 * ENUMERATION AS STUFFING — file formats, languages, and audiences alike. The
 * description now names none of the three.
 *
 * These tests keep list-shaped metadata out of the listing copy. The full
 * format list still belongs in the product UI (the popup's dropzone shows it)
 * and on videotext.io — just not in Store metadata.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const description = readFileSync(resolve(ROOT, 'store/DESCRIPTION.txt'), 'utf8')
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'manifest.json'), 'utf8'))

/** Longest run of comma-separated items found anywhere in the text. */
function longestCommaRun(text) {
  const ITEM = String.raw`[A-Za-z0-9()./+-]+(?:\s[A-Za-z0-9()./+-]+){0,2}`
  const pattern = new RegExp(`(?:${ITEM},\\s*){2,}${ITEM}`, 'g')
  let worst = { count: 0, text: '' }
  for (const line of text.split('\n')) {
    for (const match of line.matchAll(pattern)) {
      const count = match[0].split(',').length
      if (count > worst.count) worst = { count, text: match[0] }
    }
  }
  return worst
}

test('the description fits the Store field', () => {
  assert.ok(description.length > 0)
  assert.ok(
    description.length <= 16_000,
    `description is ${description.length} characters, limit is 16,000`
  )
})

test('the description contains no long comma-separated list', () => {
  // Four allows an ordinary sentence clause; beyond that it reads as an
  // enumeration, which is what was rejected twice.
  const worst = longestCommaRun(description)
  assert.ok(
    worst.count <= 4,
    `found a ${worst.count}-item list in the description, which risks the keyword-spam policy:\n  ${worst.text}`
  )
})

test('the description does not enumerate file formats', () => {
  // Naming a few common formats in a sentence is fine. Listing the whole
  // supported set is the exact line the reviewer quoted.
  const formats = [
    'MP4', 'MOV', 'MKV', 'AVI', 'WebM', 'MPEG', 'MPG', 'OGV', '3GP', '3G2',
    'FLV', 'WMV', 'M4V', 'MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC',
  ]
  const present = formats.filter((f) => new RegExp(`\\b${f}\\b`, 'i').test(description))
  assert.ok(
    present.length <= 3,
    `description names ${present.length} file formats (${present.join(', ')}); the popup lists them, the listing should not`
  )
})

test('the description does not enumerate audiences', () => {
  // This is what the 14 Sept rejection quoted. Naming who a tool is for is
  // fine in a sentence; a roll-call of professions is not.
  const audiences = [
    'journalist', 'podcaster', 'student', 'researcher', 'creator', 'marketer',
    'educator', 'teacher', 'lawyer', 'paralegal', 'doctor', 'clinician',
    'academic', 'professional team', 'agency', 'freelancer', 'entrepreneur',
    'developer', 'designer', 'producer', 'editor', 'consultant',
  ]
  const present = audiences.filter((a) => new RegExp(`\\b${a}s?\\b`, 'i').test(description))
  assert.ok(
    present.length <= 2,
    `description names ${present.length} audiences (${present.join(', ')}); describe the job, not a roll-call of professions`
  )
})

test('the description does not enumerate languages', () => {
  const languages = [
    'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Polish',
    'Russian', 'Ukrainian', 'Czech', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
    'Greek', 'Turkish', 'Arabic', 'Hebrew', 'Hindi', 'Bengali', 'Tamil', 'Telugu',
    'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Japanese',
    'Korean', 'Vietnamese', 'Thai', 'Indonesian', 'Malay', 'Swahili', 'Afrikaans',
    'Romanian', 'Hungarian', 'Bulgarian', 'Croatian', 'Serbian', 'Slovak', 'Catalan',
  ]
  const present = languages.filter((l) => new RegExp(`\\b${l}\\b`, 'i').test(description))
  assert.ok(
    present.length <= 4,
    `description names ${present.length} languages (${present.join(', ')}); state the count instead of listing them`
  )
})

test('the description has no ASCII divider bars', () => {
  // The same policy line covers "improperly formatted" metadata.
  const bars = description.match(/[=═_*~-]{5,}/g) ?? []
  assert.deepEqual(bars, [], `remove decorative dividers: ${bars.join(' ')}`)
})

test('the description does not repeat the same verb phrase as a bullet list', () => {
  // "Transcribe an MP4… / Transcribe an MP3… / Transcribe a WAV…" is keyword
  // variation dressed as features.
  const transcribeLines = description
    .split('\n')
    .filter((line) => /^\s*[-•*\d.]*\s*transcribe\b/i.test(line))
  assert.ok(
    transcribeLines.length <= 2,
    `${transcribeLines.length} lines start with "Transcribe"; fold them into prose`
  )
})

test("the manifest's short description fits the Store limit", () => {
  assert.ok(
    manifest.description.length <= 132,
    `short description is ${manifest.description.length} characters, limit is 132`
  )
  const worst = longestCommaRun(manifest.description)
  assert.ok(worst.count <= 5, `short description contains a list: ${worst.text}`)
})
