import cron from 'node-cron';
import { config } from '../config.js';
import { generatePost, generateImage } from './content-generator.js';
import { createImagePost, createTextPost, refreshAccessToken } from './linkedin-api.js';

let scheduledTask: cron.ScheduledTask | null = null;

export interface PostResult {
  postId: string;
  theme: string;
  hook: string;
  postedAt: string;
  withImage: boolean;
}

const postHistory: PostResult[] = [];

export function getPostHistory(): PostResult[] {
  return postHistory;
}

export async function postNow(
  themeId?: string,
  topic?: string,
  withImage = true,
): Promise<PostResult> {
  try {
    await refreshAccessToken();
  } catch {
    // Token might still be valid
  }

  const content = await generatePost(themeId, topic);
  let postId: string;

  if (withImage) {
    const imageBuffer = await generateImage(content.imagePrompt);
    postId = await createImagePost(content.text, imageBuffer, `VideoText.io - ${content.theme}`);
  } else {
    postId = await createTextPost(content.text);
  }

  const result: PostResult = {
    postId,
    theme: content.theme,
    hook: content.hook,
    postedAt: new Date().toISOString(),
    withImage,
  };

  postHistory.push(result);
  return result;
}

export function startScheduler(): string {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(config.postSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Scheduled post triggered`);
    try {
      const result = await postNow();
      console.log(`[${new Date().toISOString()}] Posted: ${result.postId} (theme: ${result.theme})`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Scheduled post failed:`, err);
    }
  });

  return `Scheduler started with cron: ${config.postSchedule}`;
}

export function stopScheduler(): string {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    return 'Scheduler stopped';
  }
  return 'No scheduler running';
}
