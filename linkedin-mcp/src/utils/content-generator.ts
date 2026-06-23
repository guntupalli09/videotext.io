import OpenAI from 'openai';
import { config } from '../config.js';
import {
  CONTENT_THEMES,
  VIRAL_HOOKS,
  PRODUCT_FACTS,
  POST_STRUCTURES,
  type ContentTheme,
} from '../templates/content-themes.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface GeneratedContent {
  text: string;
  imagePrompt: string;
  theme: string;
  hook: string;
  hashtags: string[];
}

export async function generatePost(
  themeId?: string,
  customTopic?: string,
  customHook?: string,
): Promise<GeneratedContent> {
  const theme = themeId
    ? CONTENT_THEMES.find(t => t.id === themeId) || randomItem(CONTENT_THEMES)
    : randomItem(CONTENT_THEMES);

  const hook = customHook || randomItem(VIRAL_HOOKS);
  const structure = randomItem(Object.values(POST_STRUCTURES));

  const prompt = buildPrompt(theme, hook, structure, customTopic);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.85,
    max_tokens: 1500,
  });

  const text = completion.choices[0].message.content || '';

  return {
    text,
    imagePrompt: theme.imagePrompt,
    theme: theme.id,
    hook,
    hashtags: theme.hashtags,
  };
}

export async function generateImage(prompt: string): Promise<Buffer> {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${prompt}\n\nIMPORTANT: No text in the image. Clean, professional, LinkedIn-optimized (1200x627px aspect ratio). Brand colors: blue (#2563EB) and white.`,
    n: 1,
    size: '1792x1024',
    quality: 'standard',
  });

  const imageUrl = response.data[0].url;
  if (!imageUrl) throw new Error('No image URL returned');

  const res = await fetch(imageUrl);
  return Buffer.from(await res.arrayBuffer());
}

export async function generateWeeklyCalendar(): Promise<GeneratedContent[]> {
  const usedThemes = new Set<string>();
  const posts: GeneratedContent[] = [];

  for (let day = 0; day < 5; day++) {
    let theme: ContentTheme;
    do {
      theme = randomItem(CONTENT_THEMES);
    } while (usedThemes.has(theme.id) && usedThemes.size < CONTENT_THEMES.length);
    usedThemes.add(theme.id);

    const post = await generatePost(theme.id);
    posts.push(post);
  }

  return posts;
}

const SYSTEM_PROMPT = `You are a world-class LinkedIn content strategist for VideoText.io, an AI-powered video transcription platform.

PRODUCT FACTS:
${JSON.stringify(PRODUCT_FACTS, null, 2)}

YOUR WRITING STYLE:
- Write like a founder sharing genuine insights, NOT a marketer
- Short paragraphs (1-2 sentences max)
- Use line breaks liberally for readability
- Start with a bold hook that stops the scroll
- Use specific numbers and data points
- End with a clear but non-pushy CTA
- Include 3-5 relevant hashtags at the end
- Keep posts between 150-300 words (LinkedIn sweet spot for engagement)
- Use emojis sparingly (max 3-4 per post)
- NEVER use corporate jargon like "leverage", "synergy", "game-changer"
- Write in first person as the founder/team
- Include a "curiosity gap" — make readers want to learn more
- Every post should provide genuine value even without clicking the link

LINKEDIN ALGORITHM TIPS TO FOLLOW:
- First line must be a pattern interrupt (hook)
- No external links in the post body (put URL in comments or CTA)
- Encourage engagement by asking a question
- Use "I" and "we" — personal posts outperform branded ones
- Posts with images get 2x engagement
- Carousel/document posts get highest reach
`;

function buildPrompt(theme: ContentTheme, hook: string, structure: string, customTopic?: string): string {
  return `Generate a viral LinkedIn post for VideoText.io's company page.

THEME: ${theme.name}
ANGLE: ${theme.angle}
SUGGESTED HOOK: ${hook}
POST STRUCTURE TO FOLLOW:
${structure}

${customTopic ? `SPECIFIC TOPIC TO COVER: ${customTopic}` : ''}

CTA TO USE: ${theme.cta}
HASHTAGS TO INCLUDE: ${theme.hashtags.join(' ')}

Write the complete post now. Make it scroll-stopping, valuable, and shareable.
Remember: The URL (videotext.io) should be mentioned naturally, not as a raw link.`;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
