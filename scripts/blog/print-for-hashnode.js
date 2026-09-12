#!/usr/bin/env node
/**
 * Print blog posts formatted for manual Hashnode paste (free tier, no API).
 *
 * Usage:
 *   node scripts/blog/print-for-hashnode.js capcut-alternative
 *   node scripts/blog/print-for-hashnode.js --all
 *   node scripts/blog/print-for-hashnode.js --priority   # 4 competitor posts
 */

const fs = require('node:fs');
const path = require('node:path');

const PRIORITY = [
  'capcut-alternative',
  'express-scribe-alternative',
  'bitc-timecode-transcription-workflow',
  'turboscribe-alternative',
];

const blogDir = path.resolve(process.cwd(), 'content/blog');

function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, '');
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { meta: {}, body: text };
  }
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { meta: {}, body: text };
  const yaml = text.slice(4, end);
  const body = text.slice(end + 4).replace(/^\r?\n/, '');
  const meta = {};
  let currentKey = null;
  for (const line of yaml.split(/\r?\n/)) {
    const arr = line.match(/^\s+-\s+(.+)\s*$/);
    if (arr && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(arr[1].trim());
      continue;
    }
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    currentKey = kv[1];
    const val = kv[2].trim().replace(/^["']|["']$/g, '');
    meta[currentKey] = val;
  }
  return { meta, body: body.trim() };
}

function printPost(slug) {
  const file = path.join(blogDir, `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.error(`Missing: ${file}`);
    return false;
  }
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const tags = Array.isArray(meta.tags) ? meta.tags : [];

  console.log('\n' + '='.repeat(72));
  console.log(`HASHNODE MANUAL PUBLISH — ${slug}`);
  console.log('='.repeat(72));
  console.log('\n--- SETTINGS (Hashnode editor sidebar) ---\n');
  console.log(`Title:    ${meta.title || slug}`);
  console.log(`Subtitle: ${meta.description || '(none)'}`);
  console.log(`Slug:     ${slug}`);
  console.log(`Tags:     ${tags.join(', ') || '(add manually)'}`);
  console.log('\n--- BODY (copy everything below this line into the editor) ---\n');
  console.log(body);
  console.log('\n--- END BODY ---\n');
  return true;
}

function main() {
  const args = process.argv.slice(2);
  let slugs = [];
  if (args.includes('--all')) {
    slugs = fs.readdirSync(blogDir)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .map((f) => f.replace(/\.md$/, ''))
      .sort();
  } else if (args.includes('--priority')) {
    slugs = PRIORITY;
  } else if (args.length) {
    slugs = args;
  } else {
    slugs = PRIORITY;
  }

  let ok = 0;
  for (const slug of slugs) {
    if (printPost(slug)) ok++;
  }
  if (!ok) process.exit(1);
}

main();
