export interface ContentTheme {
  id: string;
  name: string;
  hook: string;
  angle: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
}

export const PRODUCT_FACTS = {
  name: 'VideoText.io',
  tagline: 'AI-powered video transcription — fast, private, affordable',
  url: 'https://videotext.io',
  speed: '60-min video transcribed in under 5 minutes',
  accuracy: '98.5%+ accuracy (OpenAI Whisper large-v3)',
  privacy: 'Zero data retention — files deleted immediately after processing',
  freetier: 'Free tier with no credit card required',
  languages: '70+ languages supported',
  features: [
    'Video → Transcript with speakers, summary, chapters',
    'Video → SRT/VTT subtitles',
    'Subtitle translation (70+ languages)',
    'Burn subtitles into video',
    'Video compression',
    'Batch processing',
    'YouTube URL support',
  ],
  competitors: {
    descript: { speed: '2.3x slower', price: '$24/mo' },
    trint: { speed: '7x slower', price: '$80/mo' },
    rev: { price: '$0.25/min per-minute billing' },
    otter: { limitation: 'No video file uploads' },
  },
  icpSegments: ['YouTubers', 'podcasters', 'course creators', 'marketers', 'agencies', 'developers'],
};

export const VIRAL_HOOKS = [
  "Stop paying $80/mo for transcription.",
  "I transcribed a 60-minute video in under 5 minutes.",
  "Your transcription tool is selling your data. Here's proof.",
  "The transcription industry has a dirty secret.",
  "I replaced 3 tools with one free website.",
  "Most creators waste 2+ hours/week on subtitles.",
  "Here's why your YouTube videos aren't getting views (it's not the thumbnail).",
  "I tested 7 transcription tools. Only one didn't store my files.",
  "Subtitles increase video engagement by 80%. Here's how to add them in 2 minutes.",
  "Your competitors are already doing this with their video content.",
  "POV: You just discovered you've been overpaying for transcription by 10x.",
  "The fastest way to repurpose a 1-hour podcast into 30 pieces of content.",
  "AI transcription in 2024: What no one is talking about.",
  "I deleted Descript. Here's what I use instead.",
  "Zero data retention. Zero excuses. Zero cost to start.",
  "This free tool does what Otter, Descript, and Rev charge $50+/mo for.",
  "Why are transcription tools so expensive? (They don't have to be.)",
  "Hot take: If your transcription tool stores your files, it's not a tool — it's a liability.",
  "The #1 accessibility mistake creators make (and the 2-minute fix).",
  "I just saved my agency $960/year. Here's the 30-second switch.",
];

export const CONTENT_THEMES: ContentTheme[] = [
  {
    id: 'pain-point',
    name: 'Pain Point Agitation',
    hook: 'Your transcription workflow is costing you more than money.',
    angle: 'Highlight the frustration of slow, expensive, privacy-invasive tools. Position VideoText as the obvious fix.',
    cta: 'Try it free at videotext.io — no credit card, no data stored.',
    hashtags: ['#VideoTranscription', '#ContentCreation', '#ProductivityTools', '#AI'],
    imagePrompt: 'Minimalist comparison infographic: left side shows frustrated person with slow loading bar and dollar signs, right side shows clean fast workflow with checkmarks. Blue and white color scheme, professional LinkedIn style.',
  },
  {
    id: 'social-proof',
    name: 'Social Proof / Results',
    hook: 'We just hit [milestone] and here\'s what we learned.',
    angle: 'Share real metrics, user stories, or growth milestones. Be specific with numbers.',
    cta: 'Join thousands of creators already using VideoText.io',
    hashtags: ['#StartupJourney', '#SaaS', '#BuildInPublic', '#VideoText'],
    imagePrompt: 'Clean dashboard-style graphic showing growth metrics going up. Minimal design with bold numbers. Blue gradient background, white text.',
  },
  {
    id: 'education',
    name: 'Educational Value-First',
    hook: 'Most creators don\'t know this about video accessibility.',
    angle: 'Teach something genuinely useful about video, transcription, accessibility, or content repurposing. Soft mention VideoText.',
    cta: 'Want to try it? videotext.io — free, no signup required.',
    hashtags: ['#Accessibility', '#VideoMarketing', '#ContentStrategy', '#CreatorEconomy'],
    imagePrompt: 'Step-by-step visual guide with numbered steps. Clean icons for each step. Professional blue and white design suitable for LinkedIn.',
  },
  {
    id: 'competitor-comparison',
    name: 'Competitor Takedown (Respectful)',
    hook: 'I compared the top 5 transcription tools. The results surprised me.',
    angle: 'Factual comparison focusing on speed, price, privacy. Let the data speak.',
    cta: 'See for yourself at videotext.io',
    hashtags: ['#ToolComparison', '#TechReview', '#Transcription', '#AI'],
    imagePrompt: 'Clean comparison table graphic. 5 rows of tools with columns for speed, price, privacy. VideoText highlighted in blue. Professional infographic style.',
  },
  {
    id: 'behind-the-scenes',
    name: 'Build in Public / BTS',
    hook: 'Here\'s what building an AI startup actually looks like.',
    angle: 'Share genuine behind-the-scenes of building VideoText — technical decisions, growth learnings, challenges.',
    cta: 'Follow for more startup insights. Try the product at videotext.io',
    hashtags: ['#BuildInPublic', '#StartupLife', '#IndieHacker', '#SaaS'],
    imagePrompt: 'Behind-the-scenes style graphic with code editor, terminal, and architecture diagram. Dark mode aesthetic with blue accents.',
  },
  {
    id: 'trend-jacking',
    name: 'Trend Jacking',
    hook: '[Current trend] + transcription = untapped opportunity.',
    angle: 'Connect a trending topic (AI, remote work, short-form video, accessibility laws) to transcription/subtitles.',
    cta: 'Start free at videotext.io',
    hashtags: ['#AITrends', '#FutureOfWork', '#VideoContent', '#Innovation'],
    imagePrompt: 'Modern trend visualization with upward arrows and tech icons. Vibrant blue gradient, clean typography, LinkedIn-optimized dimensions.',
  },
  {
    id: 'use-case',
    name: 'Specific Use Case Story',
    hook: 'How [persona] saved [X hours/dollars] with one tool.',
    angle: 'Walk through a specific ICP use case — podcaster, marketer, course creator — with concrete workflow.',
    cta: 'Try the same workflow free at videotext.io',
    hashtags: ['#Workflow', '#Productivity', '#ContentCreator', '#VideoTools'],
    imagePrompt: 'Workflow diagram showing before/after. Left: complex multi-step process. Right: simplified 3-step process with VideoText. Clean arrows and icons.',
  },
  {
    id: 'hot-take',
    name: 'Contrarian Hot Take',
    hook: 'Unpopular opinion: Most transcription SaaS companies are ripping you off.',
    angle: 'Challenge industry norms — per-minute pricing, data hoarding, desktop-only apps. Be bold but factual.',
    cta: 'We built the alternative. videotext.io — free to try.',
    hashtags: ['#HotTake', '#SaaS', '#Pricing', '#DataPrivacy'],
    imagePrompt: 'Bold statement graphic with large contrarian text on dark background. Fire or lightning accent. Minimal but attention-grabbing.',
  },
];

export const POST_STRUCTURES = {
  listicle: `Hook line (pattern interrupt)

Here are [X] things I learned:

1. [Point] — [one-line explanation]
2. [Point] — [one-line explanation]
3. [Point] — [one-line explanation]
4. [Point] — [one-line explanation]
5. [Point] — [one-line explanation]

[Takeaway / CTA]`,

  story: `Hook line (pattern interrupt)

[Setup: 1-2 sentences establishing context]

[Conflict: What went wrong / what was frustrating]

[Resolution: How it was solved]

[Lesson learned]

[CTA]`,

  comparison: `Hook line (pattern interrupt)

[Tool A]: [stat]
[Tool B]: [stat]
[Tool C]: [stat]
[VideoText]: [stat] ✅

The difference? [Key differentiator in one line]

[CTA]`,

  thread: `Hook line (pattern interrupt)

↓ Thread ↓

[Point 1 — 2-3 sentences]

[Point 2 — 2-3 sentences]

[Point 3 — 2-3 sentences]

[Summary + CTA]`,
};
