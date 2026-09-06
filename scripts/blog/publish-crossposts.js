#!/usr/bin/env node
/*
 * Publish local markdown blog posts to Hashnode and DEV Community.
 *
 * Default behavior is a safe dry-run. Add --publish to send API requests.
 *
 * Windows PowerShell: `npm run blog:publish-crossposts -- --publish` often does NOT forward
 * `--publish` (npm.ps1 strips args after `--`). Use either:
 *   npm.cmd run blog:publish-crossposts -- --publish
 *   npm run blog:publish-crossposts:publish
 *   npm run blog:publish-crossposts:hashnode   # Hashnode only (skips DEV.to)
 *
 * Required environment variables when publishing:
 *   HASHNODE_TOKEN=...
 *   HASHNODE_PUBLICATION_ID=...  OR  HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
 *   (alias: HASHNODE_PUB_ID is treated like HASHNODE_PUBLICATION_ID)
 *   DEVTO_API_KEY=...   (only when publishing to DEV.to: target both or devto)
 *
 * Optional environment variables:
 *   SITE_URL=https://videotext.io
 *   BLOG_DIR=content/blog
 *   DEVTO_ORGANIZATION_ID=12345
 *   HASHNODE_ENDPOINT=https://gql.hashnode.com
 *   HASHNODE_PUBLISH_AS=published | draft
 *   CANONICAL_TEMPLATE=https://blog.videotext.io/{slug}  (defaults to live Hashnode URL from client/src/data/hashnode-slug-map.json)
 *   DEVTO_CANONICAL_TEMPLATE=https://blog.videotext.io/{slug}
 *   HASHNODE_CANONICAL_TEMPLATE=https://blog.videotext.io/{slug}
 *   DEVTO_PUBLISH_DELAY_MS=4000   — pause after each DEV.to create (default 4000; raise if you still see 429)
 *
 * Optional file (gitignored via .env.*): .env.blog-publish in repo root or scripts/blog/.env.blog-publish
 *   HASHNODE_TOKEN=...
 *   HASHNODE_PUBLICATION_HOST=...
 *   DEVTO_API_KEY=...
 *
 * Skip already-published posts: content/blog/.publish-skip-slugs (one slug per line, # comments)
 *   or PUBLISH_SKIP_SLUGS=slug1,slug2. --slug=foo still publishes that slug even if listed.
 *
 * Article metadata block: slug, title, description, tags are prepended as readable Markdown before the body.
 *   Set BLOG_SKIP_ARTICLE_META=1 to omit (Hashnode subtitle still uses description).
 */

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { resolveHashnodeSlug, hashnodePostUrl } = require('./hashnode-slug-map');

const loadedBlogEnvFiles = loadOptionalEnvFiles();

const argv = process.argv.slice(2);
const args = new Set(argv);
/** True if user asked to publish (npm.ps1 on Windows often drops `--` forwarded flags). */
const shouldPublish =
  args.has('--publish') ||
  args.has('--live') ||
  argv.some((a) => /^--publish=(?:1|true|yes)$/i.test(a));
const target = getArgValue('--target') || 'both';
const selectedSlug = getArgValue('--slug');
const blogDir = path.resolve(process.env.BLOG_DIR || 'content/blog');
const defaultCanonicalTemplate = 'https://blog.videotext.io/{slug}';
const hashnodeEndpoint = process.env.HASHNODE_ENDPOINT || 'https://gql.hashnode.com';
const publishHashnodeAs = process.env.HASHNODE_PUBLISH_AS || 'published';
const devtoPublishDelayMs = Math.max(0, Number(process.env.DEVTO_PUBLISH_DELAY_MS) || 4000);

main().catch((error) => {
  console.error(`\n❌ ${error.message}`);
  if (error.cause) console.error(error.cause);
  process.exit(1);
});

async function main() {
  if (args.has('--help') || args.has('-h')) {
    printHelp();
    return;
  }

  if (!['both', 'devto', 'hashnode'].includes(target)) {
    throw new Error('--target must be one of: both, devto, hashnode');
  }

  const allPosts = await loadPosts(blogDir);
  const skipSlugs = loadPublishSkipSlugs(blogDir);
  const posts = selectedSlug
    ? allPosts.filter((post) => post.slug === selectedSlug)
    : allPosts.filter((post) => !skipSlugs.has(post.slug));

  if (!selectedSlug && allPosts.length > posts.length) {
    const skipped = allPosts.filter((p) => skipSlugs.has(p.slug)).map((p) => p.slug);
    console.log(`Skipping ${skipped.length} slug(s) (.publish-skip-slugs): ${skipped.join(', ')}\n`);
  }

  if (posts.length === 0) {
    throw new Error(selectedSlug ? `No post found for slug: ${selectedSlug}` : `No markdown posts found in ${blogDir}`);
  }

  validateUniqueCanonicals(posts);

  console.log(`${shouldPublish ? 'Publishing' : 'Dry run for'} ${posts.length} post(s) from ${path.relative(process.cwd(), blogDir) || blogDir}`);
  console.log(`Target: ${target}`);
  if (shouldPublish && loadedBlogEnvFiles.length > 0) {
    console.log(`Env file(s): ${loadedBlogEnvFiles.map((f) => path.relative(process.cwd(), f) || f).join(', ')}`);
  }
  console.log('');

  let hashnodePublicationId = resolveHashnodePublicationIdFromEnv();
  if (shouldPublish && needsHashnode(target)) {
    assertEnv('HASHNODE_TOKEN');
    if (!hashnodePublicationId) {
      assertEnv('HASHNODE_PUBLICATION_HOST');
      hashnodePublicationId = await fetchHashnodePublicationId(process.env.HASHNODE_PUBLICATION_HOST);
    }
  }
  if (shouldPublish && needsDevto(target)) assertEnv('DEVTO_API_KEY');

  for (const post of posts) {
    console.log(`• ${post.title}`);
    console.log(`  slug: ${post.slug}${post.hashnodeSlug !== post.slug ? ` (Hashnode: ${post.hashnodeSlug})` : ''}`);
    console.log(`  canonical: ${post.canonicalUrl}`);

    if (!shouldPublish) continue;

    if (needsDevto(target)) {
      const devtoResult = await publishToDevto(post);
      console.log(`  DEV.to: ${devtoResult.url || `created article ${devtoResult.id}`}`);
      if (devtoPublishDelayMs > 0) await sleep(devtoPublishDelayMs);
    }

    if (needsHashnode(target)) {
      const hashnodeResult = await publishToHashnode(post, hashnodePublicationId);
      console.log(`  Hashnode: ${hashnodeResult.url || `created post ${hashnodeResult.id}`}`);
      if (hashnodeResult.slug && hashnodeResult.slug !== post.hashnodeSlug) {
        console.warn(
          `  ⚠ Hashnode returned slug "${hashnodeResult.slug}" — update client/src/data/hashnode-slug-map.json if this is the live URL.`,
        );
      }
    }
  }

  if (!shouldPublish) {
    console.log('\nNo API calls were made. Re-run with --publish to create posts.');
  }
}

async function loadPosts(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(directory, entry.name))
    .sort();

  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const fileSlug = path.basename(file, '.md');
    const slug = String(frontmatter.slug || fileSlug).trim();
    const title = String(frontmatter.title || titleFromSlug(slug)).trim();
    const description = String(frontmatter.description || '').trim();
    const tags = normalizeTags(frontmatter.tags).slice(0, 4);
    const hashnodeSlug = resolveHashnodeSlug(slug);
    const canonicalUrl = buildCanonicalUrl(slug, frontmatter.canonical_url || frontmatter.canonicalUrl);

    const coreMarkdown = ensureTitle(body, title);
    const markdown =
      process.env.BLOG_SKIP_ARTICLE_META === '1' || process.env.BLOG_SKIP_ARTICLE_META === 'true'
        ? coreMarkdown
        : `${formatArticleMetaMarkdown({ slug, title, description, tags })}${coreMarkdown}`;

    posts.push({
      file,
      slug,
      hashnodeSlug,
      title,
      description,
      tags,
      canonicalUrl,
      devtoCanonicalUrl: buildPlatformCanonicalUrl('DEVTO_CANONICAL_TEMPLATE', hashnodeSlug, canonicalUrl),
      hashnodeCanonicalUrl: buildPlatformCanonicalUrl('HASHNODE_CANONICAL_TEMPLATE', hashnodeSlug, canonicalUrl),
      markdown,
    });
  }
  return posts;
}

/** Frontmatter fences must tolerate Windows CRLF; otherwise YAML leaks into the body as raw text on Hashnode. */
function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);

  if (!lines.length || lines[0].trim() !== '---') {
    return { frontmatter: {}, body: text.trimStart() };
  }

  const yamlLines = [];
  let i = 1;
  while (i < lines.length && lines[i].trim() !== '---') {
    yamlLines.push(lines[i]);
    i++;
  }

  if (i >= lines.length || lines[i].trim() !== '---') {
    return { frontmatter: {}, body: text.trimStart() };
  }

  i++;
  const body = lines.slice(i).join('\n').trimStart();
  const yaml = yamlLines.join('\n');
  const frontmatter = {};
  let currentKey = null;

  for (const line of yaml.split(/\r?\n/)) {
    const arrayItem = line.match(/^\s+-\s+(.+)\s*$/);
    if (arrayItem && currentKey) {
      if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(unquote(arrayItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    currentKey = key;
    if (rawValue === '') {
      frontmatter[key] = [];
    } else {
      frontmatter[key] = unquote(rawValue);
    }
  }

  return { frontmatter, body };
}

/** Readable metadata block for DEV.to / Hashnode (mirrors frontmatter without dumping raw YAML). */
function formatArticleMetaMarkdown({ slug, title, description, tags }) {
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const tagStr = tags.length ? tags.map((t) => esc(t)).join(', ') : '—';
  const rows = [
    `| **slug** | \`${esc(slug)}\` |`,
    `| **title** | ${esc(title)} |`,
  ];
  if (description) {
    rows.push(`| **description** | ${esc(description)} |`);
  }
  rows.push(`| **tags** | ${tagStr} |`);

  return (
    `### Article metadata\n\n` +
    `| Field | Value |\n` +
    `| --- | --- |\n` +
    `${rows.join('\n')}\n\n` +
    `---\n\n`
  );
}

function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return list
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/[^A-Za-z0-9 ]/g, '').trim())
    .filter(Boolean);
}

function buildCanonicalUrl(contentSlug, explicitCanonical) {
  if (explicitCanonical) {
    const raw = String(explicitCanonical).trim();
    // Non-blog canonicals (e.g. syndication) pass through; blog URLs always use live Hashnode slug.
    if (!/blog\.videotext\.io/i.test(raw)) return raw;
  }
  return hashnodePostUrl(contentSlug);
}

function buildPlatformCanonicalUrl(envName, slug, fallback) {
  return process.env[envName] ? renderCanonicalTemplate(process.env[envName], slug) : fallback;
}

function renderCanonicalTemplate(template, slug) {
  return template.replaceAll('{slug}', encodeURIComponent(slug)).replaceAll('{rawSlug}', slug);
}

function validateUniqueCanonicals(posts) {
  for (const key of ['canonicalUrl', 'devtoCanonicalUrl', 'hashnodeCanonicalUrl']) {
    const seen = new Map();
    for (const post of posts) {
      const canonical = post[key];
      if (seen.has(canonical)) {
        throw new Error(`Duplicate ${key} detected for ${seen.get(canonical)} and ${post.slug}: ${canonical}`);
      }
      seen.set(canonical, post.slug);
    }
  }
}

async function publishToDevto(post, attempt = 1) {
  const article = {
    title: post.title,
    body_markdown: post.markdown,
    published: true,
    tags: post.tags.map((tag) => tag.toLowerCase().replace(/\s+/g, '')).slice(0, 4),
    canonical_url: post.devtoCanonicalUrl,
  };

  if (post.description) article.description = post.description;
  if (process.env.DEVTO_ORGANIZATION_ID) article.organization_id = Number(process.env.DEVTO_ORGANIZATION_ID);

  const maxAttempts = 6;
  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.DEVTO_API_KEY,
      'User-Agent': 'videotext-crosspost-script',
    },
    body: JSON.stringify({ article }),
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text?.slice(0, 300) || 'non-JSON response' };
  }

  if (response.status === 429) {
    if (attempt >= maxAttempts) {
      throw new Error(`DEV.to API returned HTTP 429 after ${maxAttempts} attempts: ${JSON.stringify(payload, null, 2)}`);
    }
    const waitMs = parseDevto429WaitMs(response, payload);
    console.warn(`  DEV.to: rate limited — waiting ${Math.ceil(waitMs / 1000)}s, then retry (${attempt} of ${maxAttempts - 1})...`);
    await sleep(waitMs);
    return publishToDevto(post, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`DEV.to API returned HTTP ${response.status}: ${JSON.stringify(payload, null, 2)}`);
  }
  return payload;
}

/** Seconds from Retry-After, error body, or default ~31s (DEV often says "try again in 30 seconds"). */
function parseDevto429WaitMs(response, payload) {
  const ra = response.headers.get('retry-after');
  if (ra) {
    const sec = Number(ra);
    if (!Number.isNaN(sec) && sec >= 0) return Math.max(sec * 1000, 1000);
  }
  const msg = typeof payload?.error === 'string' ? payload.error : '';
  const m = msg.match(/(\d+)\s*seconds?/i);
  if (m) return Math.max(Number(m[1]) * 1000, 1000);
  return 31_000;
}

async function publishToHashnode(post, publicationId) {
  const variables = {
    input: {
      title: post.title,
      subtitle: post.description || undefined,
      contentMarkdown: post.markdown,
      slug: post.hashnodeSlug,
      publicationId,
      originalArticleURL: post.hashnodeCanonicalUrl,
      tags: post.tags.map((tag) => ({ name: tag, slug: slugifyTag(tag) })),
    },
  };

  const mutation = publishHashnodeAs === 'draft'
    ? `mutation CreateDraft($input: CreateDraftInput!) {
        createDraft(input: $input) {
          draft { id title slug }
        }
      }`
    : `mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
          post { id title slug url }
        }
      }`;

  const response = await fetch(hashnodeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HASHNODE_TOKEN}`,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const payload = await readApiResponse(response, 'Hashnode');
  if (payload.errors) {
    throw new Error(`Hashnode GraphQL error: ${JSON.stringify(payload.errors, null, 2)}`);
  }
  return payload.data?.publishPost?.post || payload.data?.createDraft?.draft || payload.data;
}

async function fetchHashnodePublicationId(host) {
  const query = `query Publication($host: String!) {
    publication(host: $host) { id title }
  }`;
  const response = await fetch(hashnodeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HASHNODE_TOKEN}`,
    },
    body: JSON.stringify({ query, variables: { host } }),
  });
  const payload = await readApiResponse(response, 'Hashnode publication lookup');
  if (payload.errors) throw new Error(`Hashnode GraphQL error: ${JSON.stringify(payload.errors, null, 2)}`);
  const publication = payload.data?.publication;
  if (!publication?.id) throw new Error(`Hashnode publication not found for host: ${host}`);
  return publication.id;
}

async function readApiResponse(response, provider) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${provider} API returned HTTP ${response.status}: ${JSON.stringify(payload, null, 2)}`);
  }
  return payload;
}

function ensureTitle(markdown, title) {
  const trimmed = markdown.trimStart();
  return trimmed.startsWith('# ') ? trimmed : `# ${title}\n\n${trimmed}`;
}

function slugifyTag(tag) {
  return String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleFromSlug(slug) {
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function resolveHashnodePublicationIdFromEnv() {
  const id = process.env.HASHNODE_PUBLICATION_ID || process.env.HASHNODE_PUB_ID;
  const trimmed = id !== undefined ? String(id).trim() : '';
  return trimmed || undefined;
}

function assertEnv(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `  Use the exact name above (Hashnode API token is HASHNODE_TOKEN, not HASHNODE_PUBLICATION_HOST).\n` +
        `  PowerShell: $env:${name} = 'your-secret'\n` +
        `  Or add a line to .env.blog-publish in the project root: ${name}=your-secret`
    );
  }
}

/** Slugs to omit from bulk runs (already cross-posted). --slug= still publishes one post. */
function loadPublishSkipSlugs(blogDir) {
  const set = new Set();
  const envList = process.env.PUBLISH_SKIP_SLUGS || process.env.BLOG_PUBLISH_SKIP_SLUGS;
  if (envList) {
    for (const s of envList.split(/[,;]+/)) {
      const t = s.trim();
      if (t) set.add(t);
    }
  }
  const filePath = path.join(blogDir, '.publish-skip-slugs');
  try {
    if (!fsSync.existsSync(filePath)) return set;
    const text = fsSync.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      set.add(t);
    }
  } catch {
    // ignore
  }
  return set;
}

/** Loads KEY=value pairs into process.env only where unset or empty (standard dotenv-style). */
function loadOptionalEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), '.env.blog-publish'),
    path.resolve(process.cwd(), 'scripts/blog/.env.blog-publish'),
  ];
  const loaded = [];
  for (const file of candidates) {
    try {
      if (!fsSync.existsSync(file)) continue;
      const text = fsSync.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!key) continue;
        const cur = process.env[key];
        if (cur === undefined || String(cur).trim() === '') process.env[key] = val;
      }
      loaded.push(file);
    } catch {
      // ignore unreadable file
    }
  }
  return loaded;
}

function needsDevto(value) {
  return value === 'both' || value === 'devto';
}

function needsHashnode(value) {
  return value === 'both' || value === 'hashnode';
}

function unquote(value) {
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`Usage:
  node scripts/blog/publish-crossposts.js [--publish|--live] [--target=both|devto|hashnode] [--slug=post-slug]

Examples:
  node scripts/blog/publish-crossposts.js
  DEVTO_API_KEY=... HASHNODE_TOKEN=... HASHNODE_PUBLICATION_ID=... node scripts/blog/publish-crossposts.js --publish
  node scripts/blog/publish-crossposts.js --target=devto --slug=why-transcription-tools-fail --publish

npm (avoid forwarding --publish on Windows PowerShell — use one of these):
  npm run blog:publish-crossposts:publish
  npm run blog:publish-crossposts:hashnode
  npm.cmd run blog:publish-crossposts -- --publish

Canonical URLs:
  Each post gets its own canonical URL from CANONICAL_TEMPLATE, defaulting to ${defaultCanonicalTemplate}.
  This avoids DEV.to duplicate-canonical failures caused by reusing one canonical URL for multiple articles.

Skip list (bulk runs only): content/blog/.publish-skip-slugs — one slug per line. Use --slug=x to publish one post anyway.

Env: BLOG_SKIP_ARTICLE_META=1 — omit the metadata table prepended before article body (slug/title/tags still parsed from frontmatter).
`);
}
