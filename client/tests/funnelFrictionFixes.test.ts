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

const YOUTUBE_PASTE_PROMISE = /paste a YouTube URL|Paste URL and generate|Paste URL directly|Paste any public YouTube|Paste any video URL|streams the audio from YouTube|YouTube URL → transcript|Paste URL → transcript|no download required:\s*paste|Paste the YouTube URL/i

test('product surfaces stop promising YouTube URL paste', () => {
  for (const file of [
    'src/pages/Signup.tsx',
    'src/pages/Login.tsx',
    'src/pages/AboutPage.tsx',
    'src/pages/Guide.tsx',
    'src/pages/Blog.tsx',
    'src/pages/Compare.tsx',
    'src/pages/Samples.tsx',
    'src/pages/TranscriptionToolsHub.tsx',
    'src/pages/YoutubeTranscriptGenerator.tsx',
    'src/pages/YoutubeVideoToTranscript.tsx',
    'src/pages/tools/FreeToolsIndex.tsx',
    'src/components/landing/FAQ.tsx',
    'src/components/figma/Hero.tsx',
    'src/lib/seoRegistry.ts',
    'src/lib/seoMeta.ts',
    'src/lib/routeFamilyTemplates.ts',
    'src/lib/generateSeoPages.ts',
    'src/lib/webmcp.ts',
    'src/ssr-render.tsx',
    'public/md/youtube-transcript.md',
    'public/md/transcription.md',
    'public/md/captioning.md',
    'public/md/comparison.md',
    'public/llms-full.txt',
    'public/robots.txt',
    'public/.well-known/mcp/server-card.json',
    'public/.well-known/agent-skills/index.json',
  ]) {
    const source = src(file)
    assert.doesNotMatch(source, /YouTube URL → transcript/)
    assert.doesNotMatch(source, YOUTUBE_PASTE_PROMISE, `${file} still promises YouTube URL paste`)
  }
  const wizard = src('src/pages/VideoToTranscript.tsx')
  assert.match(wizard, /Step 1: Upload a video file/)
  assert.doesNotMatch(wizard, /Step 1: Upload a video or paste URL/)
  const youtubePage = src('src/pages/YoutubeTranscriptGenerator.tsx')
  assert.match(youtubePage, /defaultInputMode="file"/)
  const compare = src('src/pages/Compare.tsx')
  assert.match(compare, /label: 'YouTube URL direct processing',\s+videotext: false/)
  assert.match(compare, /label: 'Paste YouTube \/ URL \(no download\)',\s+videotext: false/)
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
