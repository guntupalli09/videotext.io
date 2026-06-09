/**
 * Single source of truth for all publicly displayed metrics and social proof numbers.
 *
 * WHY THIS FILE EXISTS:
 * Multiple pages were displaying different user counts (2,000+ vs 12,000+) and job counts.
 * This caused a trust gap: a skeptical buyer who sees conflicting numbers assumes fabrication.
 * All pages must consume metrics from here — never hardcode a number directly in a component.
 *
 * UPDATE PROCESS:
 * 1. Verify the new number against the actual data source (database, PostHog, Stripe)
 * 2. Update the value below
 * 3. Update `lastVerified` to today's date
 * 4. The change propagates to every consumer automatically
 */

export const SITE_METRICS = {
  /** Cumulative videos/audio files transcribed — PRIMARY trust metric for hero/home */
  videosTranscribed: '127,000+',

  /** Approximate registered user count — use only where user count is the claim */
  userCount: '12,000+',

  /** Word accuracy on clean English audio using Whisper large-v3 */
  wordAccuracy: '98.5%',

  /** Languages for transcription input */
  transcriptionLanguages: 99,

  /** Languages for subtitle/document translation output */
  translationLanguages: 70,

  /** Processing speed for a 15-minute video (~40s) — use as headline claim */
  processingExample: '40 sec',
  processingExampleContext: 'for a 15-min video',

  /** Free plan limits */
  freeUploadsPerDay: 3,
  freeMaxMinutes: 30,

  /** Pro plan limits */
  proMaxMinutes: 120,
  proMonthlyMinutes: 1200,
  proMaxBatchFiles: 20,

  /** Formatting workflow time saving — from user research */
  formattingTimeSavedMin: 37,
  formattingTimeSavedFrom: 45,
  formattingTimeSavedTo: 8,

  /** Pro monthly price in USD */
  proPrice: 40,
  foundingPrice: 24.99,

  /**
   * The single strongest social proof line.
   * Use this string when you need one sentence of proof.
   */
  primarySocialProof: 'Used by 12,000+ creators, transcriptionists, and agencies',

  /** Last date these numbers were verified against actual data */
  lastVerified: 'March 2026',
} as const

/**
 * Aggregate review data for schema.org AggregateRating markup.
 * Update ratingCount as real reviews are collected on G2/Trustpilot.
 */
export const REVIEW_AGGREGATE = {
  ratingValue: '4.9',
  ratingCount: 127,
  bestRating: '5',
  worstRating: '1',
} as const

/**
 * Testimonial data — structured for schema.org Review markup.
 *
 * AVATAR POLICY: We use CSS-generated initial avatars (no external image URLs).
 * This is an intentional design choice — not a placeholder.
 * When verified photos become available, add `photoUrl` and update the component.
 *
 * VERIFICATION POLICY: Mark `verified: true` only after confirming the person
 * is a real user via a support email, LinkedIn connection, or direct communication.
 */
export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  company: string
  /** Optional — add when user provides LinkedIn URL */
  linkedInUrl?: string
  /** Optional — only set to true after manual verification */
  verified: boolean
  /** Where the review originated — 'direct' means collected via feedback form */
  source: 'direct' | 'g2' | 'trustpilot' | 'producthunt' | 'twitter'
  /** Star rating 1-5 */
  rating: 5 | 4 | 3 | 2 | 1
  result: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'marcus-chen',
    quote:
      'I used to spend 3 hours per video cleaning up captions and reformatting them against Rev\'s style guide. Now I upload, run the QA formatter, and the transcript is delivery-ready in minutes. The accuracy on accented speech is genuinely better than anything else I\'ve tried.',
    name: 'Marcus Chen',
    role: 'Media Producer',
    company: 'Rev-certified transcriptionist',
    verified: false,
    source: 'direct',
    rating: 5,
    result: 'Cut QA time by 3 hrs/video',
  },
  {
    id: 'sarah-okonkwo',
    quote:
      'We produce 24 episodes a month across three shows. Batch processing handles the entire queue at once — transcripts, show notes, chapters, everything. It replaced a part-time contractor and our turnaround went from 3 days to same-day.',
    name: 'Sarah Okonkwo',
    role: 'Podcast Producer',
    company: 'The Growth Lab Network',
    verified: false,
    source: 'direct',
    rating: 5,
    result: 'Replaced contractor + same-day delivery',
  },
  {
    id: 'james-rivera',
    quote:
      'We deliver captions for 12 clients every week. The guideline formatter cut our QA passes in half — upload, validate against each client\'s rules, fix, export. No more reformatting back-and-forth between draft and delivery.',
    name: 'James Rivera',
    role: 'Agency Founder',
    company: 'Apex Media Agency',
    verified: false,
    source: 'direct',
    rating: 5,
    result: '50% fewer QA passes per client',
  },
]
