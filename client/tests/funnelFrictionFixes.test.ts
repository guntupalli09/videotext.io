import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function src(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

test('jobSession keys jobs by canonical toolKey and falls back to the legacy path key', () => {
  const source = src('src/lib/jobSession.ts')
  assert.match(source, /export function getToolSessionKey/)
  assert.match(source, /getSeoEntry/)
  assert.match(source, /batch-process/)
  assert.match(source, /readSession\(current\) \|\| \(legacy !== current \? readSession\(legacy\)/)
})

test('MagicLogin stores auth with storeLoginResult, not auth_token keys', () => {
  const source = src('src/pages/MagicLogin.tsx')
  assert.match(source, /storeLoginResult\(/)
  assert.doesNotMatch(source, /localStorage\.setItem\('auth_token'/)
  assert.doesNotMatch(source, /localStorage\.setItem\('user_id'/)
})

test('PaywallModal has EXPORT_LIMIT_REACHED and split daily vs monthly copy', () => {
  const source = src('src/components/PaywallModal.tsx')
  assert.match(source, /EXPORT_LIMIT_REACHED/)
  assert.match(source, /You've used all 3 free imports today/)
  assert.match(source, /You've used all 3 free imports this month/)
})

test('Login copy does not claim a transcript library', () => {
  const source = src('src/pages/Login.tsx')
  assert.doesNotMatch(source, /Your transcripts are waiting/)
  assert.doesNotMatch(source, /YouTube URL → transcript/)
  assert.match(source, /Start your next transcript/)
})

test('product surfaces stop promising YouTube URL paste', () => {
  for (const file of [
    'src/pages/Signup.tsx',
    'src/pages/Login.tsx',
    'src/pages/AboutPage.tsx',
    'src/pages/tools/FreeToolsIndex.tsx',
  ]) {
    const source = src(file)
    assert.doesNotMatch(source, /YouTube URL → transcript/)
    assert.doesNotMatch(source, /paste a YouTube URL/i)
  }
  const wizard = src('src/pages/VideoToTranscript.tsx')
  assert.match(wizard, /Step 1: Upload a video file/)
  assert.doesNotMatch(wizard, /Step 1: Upload a video or paste URL/)
})

test('Voice and Guideline persist job sessions', () => {
  const voice = src('src/pages/VoiceRecorder.tsx')
  assert.match(voice, /persistJobId\(/)
  assert.match(voice, /getPersistedJobId\(/)
  const guideline = src('src/pages/GuidelineFormat.tsx')
  assert.match(guideline, /persistJobId\(/)
  assert.match(guideline, /getPersistedJobId\(/)
})

test('VideoToTranscript opens batch and export paywalls and shows cross-tool next steps', () => {
  const source = src('src/pages/VideoToTranscript.tsx')
  assert.match(source, /BATCH_NOT_AVAILABLE/)
  assert.match(source, /EXPORT_LIMIT_REACHED/)
  assert.match(source, /<CrossToolSuggestions/)
  assert.match(source, /we do not keep your last file/)
  assert.doesNotMatch(source, /Batch upload is on Pro and Business — upgrade to process multiple videos at once/)
})

test('quota helper uses monthly for signed-in Free and daily for guests', () => {
  const source = src('src/lib/quotaPaywall.ts')
  assert.match(source, /isLoggedIn\(\) \? 'FREE_MONTHLY_LIMIT_REACHED' : 'FREE_DAILY_LIMIT_REACHED'/)
})
