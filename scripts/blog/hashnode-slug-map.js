/**
 * Shared loader for content/blog/hashnode-slug-map.json (Node scripts).
 */
const fs = require('node:fs');
const path = require('node:path');

const MAP_PATH = path.resolve(__dirname, '../../client/src/data/hashnode-slug-map.json');
const BLOG_URL = (process.env.BLOG_URL || 'https://blog.videotext.io').replace(/\/+$/, '');

let cached;

function loadHashnodeSlugMap() {
  if (cached) return cached;
  const raw = fs.readFileSync(MAP_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  cached = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => !key.startsWith('_')),
  );
  return cached;
}

function resolveHashnodeSlug(contentSlug) {
  const map = loadHashnodeSlugMap();
  return map[contentSlug] || contentSlug;
}

function hashnodePostUrl(contentSlug) {
  return `${BLOG_URL}/${resolveHashnodeSlug(contentSlug)}`;
}

/** Reverse lookup: live Hashnode slug → content slug (if mapped). */
function contentSlugFromLive(liveSlug) {
  const map = loadHashnodeSlugMap();
  for (const [content, live] of Object.entries(map)) {
    if (live === liveSlug) return content;
  }
  return null;
}

module.exports = {
  MAP_PATH,
  BLOG_URL,
  loadHashnodeSlugMap,
  resolveHashnodeSlug,
  hashnodePostUrl,
  contentSlugFromLive,
};
