/**
 * The review engine's cadence and its policy guarantees.
 *
 * The Chrome Web Store prohibits incentivised reviews, rating solicitation
 * ("give us 5 stars"), and review-gating — routing happy users to the Store
 * while diverting unhappy ones elsewhere. These tests pin the behaviour and
 * the on-screen copy so a future edit cannot quietly cross those lines.
 *
 * Runs against the compiled module in dist/, so it covers what Chrome ships.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')

if (!existsSync(DIST)) {
  test('review prompt', { skip: 'run `npm run build` first' }, () => {})
} else {
  const review = await import(pathToFileURL(resolve(DIST, 'lib/reviewPrompt.js')).href)
  const config = await import(pathToFileURL(resolve(DIST, 'lib/config.js')).href)
  const {
    INITIAL_REVIEW_STATE,
    REVIEW_PROMPT_COOLDOWN_MS,
    REVIEW_PROMPT_JOB_MILESTONES,
    acceptAsk,
    dismissAsk,
    recordCompletedJob,
    reviewsUrl,
    shouldShowReviewPrompt,
  } = review

  const DAY = 24 * 60 * 60 * 1000
  const T0 = 1_700_000_000_000

  /** Run n successful jobs from a state, showing/dismissing whenever eligible. */
  function simulate(jobs, { now = T0, perJobMs = 0, accept = null } = {}) {
    let state = { ...INITIAL_REVIEW_STATE }
    const shownAt = []
    for (let i = 1; i <= jobs; i++) {
      const clock = now + i * perJobMs
      state = recordCompletedJob(state)
      if (shouldShowReviewPrompt(state, clock)) {
        shownAt.push(i)
        state = accept === i ? acceptAsk(state, clock) : dismissAsk(state, clock)
      }
    }
    return { state, shownAt }
  }

  // ── Cadence ────────────────────────────────────────────────────────────────

  test('the first ask waits for a completed job', () => {
    assert.equal(shouldShowReviewPrompt(INITIAL_REVIEW_STATE, T0), false)
    assert.equal(shouldShowReviewPrompt(recordCompletedJob(INITIAL_REVIEW_STATE), T0), true)
  })

  test('each ask waits for whichever gate is later: the milestone or the cooldown', () => {
    // One job per day. The 2nd ask is eligible by job count at job 5, but the
    // 7-day cooldown from the 1st ask does not clear until job 8 — so it lands
    // at 8, not 5. That is the intended interaction, and the reason a prompt
    // can never arrive twice in the same week.
    const { shownAt } = simulate(20, { perJobMs: DAY })
    assert.deepEqual(shownAt, [1, 8, 15])
    assert.equal(shownAt.length, REVIEW_PROMPT_JOB_MILESTONES.length)
    for (let i = 1; i < shownAt.length; i++) {
      assert.ok(shownAt[i] - shownAt[i - 1] >= 7, 'at least a week between asks')
      assert.ok(shownAt[i] >= REVIEW_PROMPT_JOB_MILESTONES[i], 'milestone also respected')
    }
  })

  test('it stops for good once the cadence runs out', () => {
    const { state, shownAt } = simulate(60, { perJobMs: DAY })
    assert.equal(shownAt.length, REVIEW_PROMPT_JOB_MILESTONES.length)
    assert.equal(state.status, 'exhausted')
    assert.equal(shouldShowReviewPrompt(state, T0 + 10 * 365 * DAY), false)
  })

  test('a burst of jobs in one session is asked once, not three times', () => {
    // Twenty files back to back: milestones 5 and 15 are reached, but the
    // cooldown holds the prompt back. This is the anti-nagging guarantee.
    const { shownAt } = simulate(20, { perJobMs: 0 })
    assert.deepEqual(shownAt, [1])
  })

  test('the cooldown is a week and both gates must pass', () => {
    assert.equal(REVIEW_PROMPT_COOLDOWN_MS, 7 * DAY)
    const afterFirstAsk = dismissAsk(
      { completedJobs: 5, asks: 0, lastAskedAt: null, status: 'pending' },
      T0
    )
    // Job milestone met, cooldown not met.
    assert.equal(shouldShowReviewPrompt({ ...afterFirstAsk, completedJobs: 5 }, T0 + DAY), false)
    // Cooldown met, job milestone not met.
    assert.equal(shouldShowReviewPrompt({ ...afterFirstAsk, completedJobs: 4 }, T0 + 8 * DAY), false)
    // Both met.
    assert.equal(shouldShowReviewPrompt({ ...afterFirstAsk, completedJobs: 5 }, T0 + 8 * DAY), true)
  })

  test('opening the Store retires the prompt permanently', () => {
    const { state, shownAt } = simulate(60, { perJobMs: DAY, accept: 1 })
    assert.deepEqual(shownAt, [1], 'never asked again after accepting')
    assert.equal(state.status, 'asked')
    assert.equal(shouldShowReviewPrompt(state, T0 + 10 * 365 * DAY), false)
  })

  test('corrupt or missing stored state degrades to a clean initial state', async () => {
    const store = new Map()
    globalThis.chrome = {
      storage: {
        local: {
          get: async (k) => (store.has(k) ? { [k]: store.get(k) } : {}),
          set: async (items) => { for (const [k, v] of Object.entries(items)) store.set(k, v) },
        },
      },
    }
    const key = 'videotext:reviewPrompt'
    for (const junk of [undefined, null, 'nonsense', 42, { completedJobs: -5, status: 'bogus' }]) {
      store.set(key, junk)
      const state = await review.getReviewPromptState()
      assert.ok(state.completedJobs >= 0)
      assert.ok(['pending', 'asked', 'exhausted'].includes(state.status))
    }
    delete globalThis.chrome
  })

  // ── Store policy ───────────────────────────────────────────────────────────

  const html = readFileSync(resolve(DIST, 'popup.html'), 'utf8')
  const promptHtml = html.slice(html.indexOf('id="review-prompt"'), html.indexOf('</aside>'))

  test('it links to THIS extension, using the format Google documents', () => {
    // "add /reviews at the end of your item's URL" — Chrome Web Store docs.
    assert.equal(
      reviewsUrl(),
      `https://chrome.google.com/webstore/detail/${config.EXTENSION_ID}/reviews`
    )
    assert.match(config.EXTENSION_ID, /^[a-p]{32}$/)
    assert.equal(config.EXTENSION_ID, 'bopfkcfiihgcdepcdijedbelcejceakg')
  })

  test('the prompt never solicits a rating', () => {
    for (const banned of [/\b5\s*stars?\b/i, /\bfive\s*stars?\b/i, /\brate us\b/i, /★/, /⭐/]) {
      assert.ok(!banned.test(promptHtml), `prompt must not solicit a rating: ${banned}`)
    }
    assert.match(promptHtml, /honest review/i, 'the ask should be for an honest review')
  })

  test('the prompt offers nothing in exchange', () => {
    for (const banned of [
      /free (minutes|credits|month|trial|pro)/i,
      /\bdiscount\b/i,
      /\breward\b/i,
      /\bin exchange\b/i,
      /\bunlock\b/i,
      /\bgift\b/i,
    ]) {
      assert.ok(!banned.test(promptHtml), `prompt must not offer an incentive: ${banned}`)
    }
  })

  test('there is no happy/unhappy fork before the Store link', () => {
    // Review-gating: sending satisfied users to the Store and unhappy ones to
    // a private feedback form. Every finished job gets the same one prompt.
    const buttons = [...promptHtml.matchAll(/<button[^>]*id="([^"]+)"/g)].map((m) => m[1])
    assert.deepEqual(buttons.sort(), ['review-dismiss', 'review-leave'])
    assert.ok(!/\bthumbs|\bsatisfied\b|\bhow did it go\b|\benjoying\b.*\?[\s\S]*\byes\b/i.test(promptHtml))
  })

  test('the prompt ships hidden and is only revealed by the cadence', () => {
    assert.match(promptHtml, /hidden/, 'must start hidden so it never flashes on screen')
    const popup = readFileSync(resolve(DIST, 'popup.js'), 'utf8')
    assert.match(popup, /shouldShowReviewPrompt/, 'reveal must go through the cadence check')
  })

  test('it needs no extra permissions', () => {
    const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.json'), 'utf8'))
    assert.deepEqual(manifest.permissions, ['storage'])
    assert.deepEqual(manifest.host_permissions, ['https://api.videotext.io/*'])
  })
}
