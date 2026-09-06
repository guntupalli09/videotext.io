#!/usr/bin/env node
/**
 * Fix Hashnode canonical URLs (originalArticleURL) for posts whose live slug differs from the
 * markdown frontmatter slug. Self-canonicalizes each post to its live blog.videotext.io URL.
 *
 * Dry-run by default. Pass --apply to send updates.
 *
 * Requires: HASHNODE_TOKEN, HASHNODE_PUBLICATION_HOST or HASHNODE_PUBLICATION_ID
 *
 * Usage:
 *   node scripts/blog/fix-hashnode-canonicals.js
 *   node scripts/blog/fix-hashnode-canonicals.js --apply
 */
const fsSync = require('node:fs');
const path = require('node:path');
const {
  BLOG_URL,
  hashnodePostUrl,
  loadHashnodeSlugMap,
  contentSlugFromLive,
} = require('./hashnode-slug-map');

const hashnodeEndpoint = process.env.HASHNODE_ENDPOINT || 'https://gql.hashnode.com';
const shouldApply = process.argv.slice(2).some((a) => a === '--apply' || a === '--publish');

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});

async function main() {
  loadOptionalEnvFiles();
  assertEnv('HASHNODE_TOKEN');
  let publicationId = process.env.HASHNODE_PUBLICATION_ID || process.env.HASHNODE_PUB_ID;
  if (!publicationId) {
    assertEnv('HASHNODE_PUBLICATION_HOST');
    publicationId = await fetchHashnodePublicationId(process.env.HASHNODE_PUBLICATION_HOST);
  }

  const slugMap = loadHashnodeSlugMap();
  const liveSlugs = new Set(Object.values(slugMap));
  const posts = await fetchAllPublicationPosts(publicationId);

  console.log(`${shouldApply ? 'Applying' : 'Dry run —'} Hashnode canonical fixes (${posts.length} posts scanned)\n`);

  let fixCount = 0;
  for (const post of posts) {
    if (!liveSlugs.has(post.slug)) continue;

    const contentSlug = contentSlugFromLive(post.slug) || post.slug;
    const targetCanonical = hashnodePostUrl(contentSlug);
    const current = (post.originalArticleURL || post.canonicalUrl || '').replace(/\/+$/, '');
    const expected = targetCanonical.replace(/\/+$/, '');

    if (current === expected) {
      console.log(`✓ ${post.slug} — canonical OK`);
      continue;
    }

    fixCount++;
    console.log(`• ${post.slug}`);
    console.log(`  current:  ${current || '(none)'}`);
    console.log(`  target:   ${expected}`);

    if (!shouldApply) continue;

    await updatePostCanonical(post.id, expected);
    console.log('  updated');
  }

  console.log(`\n${fixCount} post(s) need canonical fix${shouldApply ? ' — applied' : '. Re-run with --apply to update Hashnode.'}`);
}

async function fetchAllPublicationPosts(publicationId) {
  const posts = [];
  let after = null;

  for (;;) {
    const query = `query PublicationPosts($id: ObjectId!, $first: Int!, $after: String) {
      publication(id: $id) {
        posts(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              slug
              title
              url
              canonicalUrl
              originalArticleURL
            }
          }
        }
      }
    }`;

    const payload = await hashnodeGql(query, { id: publicationId, first: 50, after });
    const connection = payload.data?.publication?.posts;
    if (!connection) break;

    for (const edge of connection.edges || []) {
      if (edge?.node) posts.push(edge.node);
    }

    if (!connection.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor;
  }

  return posts;
}

async function updatePostCanonical(postId, originalArticleURL) {
  const mutation = `mutation UpdatePost($input: UpdatePostInput!) {
    updatePost(input: $input) {
      post { id slug originalArticleURL }
    }
  }`;

  const payload = await hashnodeGql(mutation, {
    input: { id: postId, originalArticleURL },
  });

  if (payload.errors?.length) {
    throw new Error(`Hashnode updatePost failed: ${JSON.stringify(payload.errors, null, 2)}`);
  }
  return payload.data?.updatePost?.post;
}

async function fetchHashnodePublicationId(host) {
  const query = `query Publication($host: String!) {
    publication(host: $host) { id title }
  }`;
  const payload = await hashnodeGql(query, { host });
  if (payload.errors?.length) {
    throw new Error(`Hashnode GraphQL error: ${JSON.stringify(payload.errors, null, 2)}`);
  }
  const publication = payload.data?.publication;
  if (!publication?.id) throw new Error(`Hashnode publication not found for host: ${host}`);
  return publication.id;
}

async function hashnodeGql(query, variables) {
  const response = await fetch(hashnodeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.HASHNODE_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Hashnode API HTTP ${response.status}: ${JSON.stringify(payload, null, 2)}`);
  }
  return payload;
}

function assertEnv(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function loadOptionalEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), '.env.blog-publish'),
    path.resolve(process.cwd(), 'scripts/blog/.env.blog-publish'),
  ];
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
    } catch {
      // ignore
    }
  }
}
