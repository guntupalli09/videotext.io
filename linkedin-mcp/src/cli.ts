import 'dotenv/config';
import { generatePost, generateWeeklyCalendar } from './utils/content-generator.js';
import { postNow, startScheduler } from './utils/scheduler.js';

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'generate': {
      const theme = process.argv[3];
      const topic = process.argv[4];
      console.log('Generating post...\n');
      const content = await generatePost(theme, topic);
      console.log('=== GENERATED POST ===\n');
      console.log(content.text);
      console.log('\n=== METADATA ===');
      console.log(`Theme: ${content.theme}`);
      console.log(`Hook: ${content.hook}`);
      console.log(`Hashtags: ${content.hashtags.join(' ')}`);
      console.log(`Image prompt: ${content.imagePrompt}`);
      break;
    }

    case 'post': {
      const theme = process.argv[3];
      const withImage = process.argv[4] !== '--no-image';
      console.log('Generating and posting...\n');
      const result = await postNow(theme, undefined, withImage);
      console.log(`Posted! ID: ${result.postId}`);
      console.log(`Theme: ${result.theme}`);
      console.log(`Time: ${result.postedAt}`);
      break;
    }

    case 'week': {
      console.log('Generating weekly content calendar...\n');
      const posts = await generateWeeklyCalendar();
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      posts.forEach((post, i) => {
        console.log(`\n=== ${days[i]} (${post.theme}) ===\n`);
        console.log(post.text);
        console.log(`\nHashtags: ${post.hashtags.join(' ')}`);
      });
      break;
    }

    case 'schedule': {
      console.log(startScheduler());
      console.log('Press Ctrl+C to stop.');
      await new Promise(() => {}); // keep alive
      break;
    }

    default:
      console.log(`Usage:
  tsx src/cli.ts generate [theme] [topic]  - Generate a post preview
  tsx src/cli.ts post [theme] [--no-image] - Generate and post immediately
  tsx src/cli.ts week                      - Generate Mon-Fri content calendar
  tsx src/cli.ts schedule                  - Start auto-posting scheduler

Themes: pain-point, social-proof, education, competitor-comparison,
        behind-the-scenes, trend-jacking, use-case, hot-take`);
  }
}

main().catch(console.error);
