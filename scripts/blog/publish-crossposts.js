#!/usr/bin/env node
/*
 * Publish local markdown blog posts to Hashnode and DEV Community.
 *
 * Default behavior is a safe dry-run. Add --publish to send API requests.
 *
 * Required environment variables when publishing:
 *   DEVTO_API_KEY=...
 *   HASHNODE_TOKEN=...
 *   HASHNODE_PUBLICATION_ID=...  OR  HASHNODE_PUBLICATION_HOST=yourblog.hashnode.dev
 *
 * Optional environment variables:
 *   SITE_URL=https://videotext.io
 *   BLOG_DIR=content/blog
 *   DEVTO_ORGANIZATION_ID=12345
 *   HASHNODE_ENDPOINT=https://gql.hashnode.com
 *   HASHNODE_PUBLISH_AS=published | draft
 *   CANONICAL_TEMPLATE=https://videotext.io/blog/{slug}
 *   DEVTO_CANONICAL_TEMPLATE=https://videotext.io/blog/{slug}
 *   HASHNODE_CANONICAL_TEMPLATE=https://videotext.io/blog/{slug}
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const args = new Set(process.argv.slice(2));
const shouldPublish = args.has('--publish');
const target = getArgValue('--target') || 'both';
const selectedSlug = getArgValue('--slug');
const blogDir = path.resolve(process.env.BLOG_DIR || 'content/blog');
const siteUrl = trimTrailingSlash(process.env.SITE_URL || 'https://videotext.io');
const hashnodeEndpoint = process.env.HASHNODE_ENDPOINT || 'https://gql.hashnode.com';
const publishHashnodeAs = process.env.HASHNODE_PUBLISH_AS || 'published';

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

  const posts = await loadPosts(blogDir);
  const selectedPosts = selectedSlug ? posts.filter((post) => post.slug === selectedSlug) : posts;

  if (selectedPosts.length === 0) {
    throw new Error(selectedSlug ? `No post found for slug: ${selectedSlug}` : `No markdown posts found in ${blogDir}`);
  }

  validateUniqueCanonicals(selectedPosts);

  console.log(`${shouldPublish ? 'Publishing' : 'Dry run for'} ${selectedPosts.length} post(s) from ${path.relative(process.cwd(), blogDir) || blogDir}`);
  console.log(`Target: ${target}`);
  console.log('');

  let hashnodePublicationId = process.env.HASHNODE_PUBLICATION_ID;
  if (shouldPublish && needsHashnode(target)) {
    assertEnv('HASHNODE_TOKEN');
    if (!hashnodePublicationId) {
      assertEnv('HASHNODE_PUBLICATION_HOST');
      hashnodePublicationId = await fetchHashnodePublicationId(process.env.HASHNODE_PUBLICATION_HOST);
    }
  }
  if (shouldPublish && needsDevto(target)) assertEnv('DEVTO_API_KEY');

  for (const post of selectedPosts) {
    console.log(`• ${post.title}`);
    console.log(`  slug: ${post.slug}`);
    console.log(`  canonical: ${post.canonicalUrl}`);

    if (!shouldPublish) continue;

    if (needsDevto(target)) {
      const devtoResult = await publishToDevto(post);
      console.log(`  DEV.to: ${devtoResult.url || `created article ${devtoResult.id}`}`);
      await sleep(3500); // DEV API limit is 10 requests / 30 seconds; stay comfortably under it.
    }

    if (needsHashnode(target)) {
      const hashnodeResult = await publishToHashnode(post, hashnodePublicationId);
      console.log(`  Hashnode: ${hashnodeResult.url || `created post ${hashnodeResult.id}`}`);
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
    const canonicalUrl = buildCanonicalUrl(slug, frontmatter.canonical_url || frontmatter.canonicalUrl);

    posts.push({
      file,
      slug,
      title,
      description,
      tags,
      canonicalUrl,
      devtoCanonicalUrl: buildPlatformCanonicalUrl('DEVTO_CANONICAL_TEMPLATE', slug, canonicalUrl),
      hashnodeCanonicalUrl: buildPlatformCanonicalUrl('HASHNODE_CANONICAL_TEMPLATE', slug, canonicalUrl),
      markdown: ensureTitle(body, title),
    });
  }
  return posts;
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) return { frontmatter: {}, body: raw.trimStart() };
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: {}, body: raw.trimStart() };

  const yaml = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trimStart();
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

function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return list
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/[^A-Za-z0-9 ]/g, '').trim())
    .filter(Boolean);
}

function buildCanonicalUrl(slug, explicitCanonical) {
  if (explicitCanonical) return String(explicitCanonical).trim();
  return renderCanonicalTemplate(process.env.CANONICAL_TEMPLATE || `${siteUrl}/blog/{slug}`, slug);
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

async function publishToDevto(post) {
  const article = {
    title: post.title,
    body_markdown: post.markdown,
    published: true,
    tags: post.tags.map((tag) => tag.toLowerCase().replace(/\s+/g, '')).slice(0, 4),
    canonical_url: post.devtoCanonicalUrl,
  };

  if (post.description) article.description = post.description;
  if (process.env.DEVTO_ORGANIZATION_ID) article.organization_id = Number(process.env.DEVTO_ORGANIZATION_ID);

  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.DEVTO_API_KEY,
      'User-Agent': 'videotext-crosspost-script',
    },
    body: JSON.stringify({ article }),
  });

  return readApiResponse(response, 'DEV.to');
}

async function publishToHashnode(post, publicationId) {
  const variables = {
    input: {
      title: post.title,
      subtitle: post.description || undefined,
      contentMarkdown: post.markdown,
      slug: post.slug,
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

function assertEnv(name) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

function needsDevto(value) {
  return value === 'both' || value === 'devto';
}

function needsHashnode(value) {
  return value === 'both' || value === 'hashnode';
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
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
  node scripts/blog/publish-crossposts.js [--publish] [--target=both|devto|hashnode] [--slug=post-slug]

Examples:
  node scripts/blog/publish-crossposts.js
  DEVTO_API_KEY=... HASHNODE_TOKEN=... HASHNODE_PUBLICATION_ID=... node scripts/blog/publish-crossposts.js --publish
  node scripts/blog/publish-crossposts.js --target=devto --slug=why-transcription-tools-fail --publish

Canonical URLs:
  Each post gets its own canonical URL from CANONICAL_TEMPLATE, defaulting to ${siteUrl}/blog/{slug}.
  This avoids DEV.to duplicate-canonical failures caused by reusing one canonical URL for multiple articles.
`);
}
