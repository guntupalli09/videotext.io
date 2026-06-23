import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generatePost, generateImage, generateWeeklyCalendar } from './utils/content-generator.js';
import { createTextPost, createImagePost, getCompanyFollowers, getPostAnalytics, refreshAccessToken } from './utils/linkedin-api.js';
import { postNow, startScheduler, stopScheduler, getPostHistory } from './utils/scheduler.js';
import { CONTENT_THEMES, VIRAL_HOOKS } from './templates/content-themes.js';

const server = new McpServer({
  name: 'videotext-linkedin',
  version: '1.0.0',
});

// Tool: Generate a LinkedIn post (preview without posting)
server.tool(
  'generate_post',
  'Generate a viral LinkedIn post for VideoText.io. Returns the post text and image prompt without posting.',
  {
    theme: z.string().optional().describe('Content theme ID: pain-point, social-proof, education, competitor-comparison, behind-the-scenes, trend-jacking, use-case, hot-take'),
    topic: z.string().optional().describe('Specific topic to write about'),
    hook: z.string().optional().describe('Custom hook/opening line'),
  },
  async ({ theme, topic, hook }) => {
    const content = await generatePost(theme, topic, hook);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          post: content.text,
          theme: content.theme,
          hook: content.hook,
          hashtags: content.hashtags,
          imagePrompt: content.imagePrompt,
        }, null, 2),
      }],
    };
  },
);

// Tool: Post to LinkedIn immediately
server.tool(
  'post_to_linkedin',
  'Generate and immediately publish a post to the VideoText.io LinkedIn company page.',
  {
    theme: z.string().optional().describe('Content theme ID'),
    topic: z.string().optional().describe('Specific topic'),
    withImage: z.boolean().default(true).describe('Generate and attach an AI image'),
    customText: z.string().optional().describe('Use custom text instead of generating'),
  },
  async ({ theme, topic, withImage, customText }) => {
    try {
      await refreshAccessToken();
    } catch { /* token may still be valid */ }

    let postId: string;

    if (customText) {
      if (withImage) {
        const selectedTheme = CONTENT_THEMES.find(t => t.id === theme) || CONTENT_THEMES[0];
        const imageBuffer = await generateImage(selectedTheme.imagePrompt);
        postId = await createImagePost(customText, imageBuffer, 'VideoText.io');
      } else {
        postId = await createTextPost(customText);
      }
    } else {
      const result = await postNow(theme, topic, withImage);
      postId = result.postId;
    }

    return {
      content: [{
        type: 'text' as const,
        text: `✅ Posted to LinkedIn! Post ID: ${postId}`,
      }],
    };
  },
);

// Tool: Generate a week's worth of content
server.tool(
  'generate_weekly_calendar',
  'Generate 5 LinkedIn posts (Mon-Fri) for VideoText.io with varied themes.',
  {},
  async () => {
    const posts = await generateWeeklyCalendar();
    const calendar = posts.map((post, i) => ({
      day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i],
      theme: post.theme,
      preview: post.text.substring(0, 150) + '...',
      fullText: post.text,
      hashtags: post.hashtags,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(calendar, null, 2),
      }],
    };
  },
);

// Tool: Start/stop auto-posting scheduler
server.tool(
  'manage_scheduler',
  'Start or stop the automatic daily posting scheduler.',
  {
    action: z.enum(['start', 'stop', 'status']),
  },
  async ({ action }) => {
    let message: string;
    switch (action) {
      case 'start':
        message = startScheduler();
        break;
      case 'stop':
        message = stopScheduler();
        break;
      case 'status':
        message = `Post history: ${JSON.stringify(getPostHistory(), null, 2)}`;
        break;
    }

    return {
      content: [{ type: 'text' as const, text: message }],
    };
  },
);

// Tool: Get LinkedIn analytics
server.tool(
  'get_analytics',
  'Get VideoText.io LinkedIn company page analytics — followers and post performance.',
  {
    postUrn: z.string().optional().describe('Specific post URN to get analytics for'),
  },
  async ({ postUrn }) => {
    const followers = await getCompanyFollowers();
    let postData = null;
    if (postUrn) {
      postData = await getPostAnalytics(postUrn);
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ followers, postAnalytics: postData }, null, 2),
      }],
    };
  },
);

// Tool: List available themes and hooks
server.tool(
  'list_content_options',
  'List all available content themes, hooks, and post structures for inspiration.',
  {},
  async () => {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          themes: CONTENT_THEMES.map(t => ({ id: t.id, name: t.name, angle: t.angle })),
          sampleHooks: VIRAL_HOOKS.slice(0, 10),
          totalHooks: VIRAL_HOOKS.length,
        }, null, 2),
      }],
    };
  },
);

// Resource: Product facts for reference
server.resource(
  'product-facts',
  'videotext://product-facts',
  async () => ({
    contents: [{
      uri: 'videotext://product-facts',
      mimeType: 'application/json',
      text: JSON.stringify(
        await import('./templates/content-themes.js').then(m => m.PRODUCT_FACTS),
        null,
        2,
      ),
    }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('VideoText LinkedIn MCP Server running on stdio');
}

main().catch(console.error);
