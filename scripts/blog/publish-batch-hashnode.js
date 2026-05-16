#!/usr/bin/env node
/**
 * Publish a fixed list of slugs to Hashnode only (one post per invocation of publish-crossposts.js).
 *
 * Usage:
 *   npm run blog:publish-batch:hashnode
 *   npm run blog:publish-batch:hashnode -- --dry-run
 *   node scripts/blog/publish-batch-hashnode.js --file=content/blog/my-slugs.txt
 *
 * Slugs file: one slug per line, # comments allowed. Paths are relative to cwd.
 *
 * Requires same env as publish-crossposts.js: HASHNODE_TOKEN, publication id/host, etc.
 */

const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/** Matches the 12 editorial posts you added under content/blog/ */
const DEFAULT_SLUGS = [
  'videotext-vs-turboscribe-vs-descript-speed-test',
  'whisper-large-v3-accuracy-difficult-audio',
  'rev-style-guide-formatting-errors',
  'why-ai-transcripts-fail-qa',
  'human-qa-vs-ai-qa-where-errors-happen',
  'how-professional-transcriptionists-clean-transcripts',
  'real-workflow-behind-qa-review',
  'speaker-diarization-problems-nobody-talks-about',
  'how-agencies-process-100-hours-audio',
  'manual-timestamp-fixing-is-wasting-hours',
  'why-formatting-is-the-most-annoying-part-of-transcription',
  'hidden-cost-of-multi-tool-transcription-workflows',
];

function parseArgs() {
  const argv = process.argv.slice(2);
  let dryRun = false;
  let filePath;
  for (const a of argv) {
    if (a === '--dry-run' || a === '-n') dryRun = true;
    if (a.startsWith('--file=')) filePath = a.slice('--file='.length);
  }
  return { dryRun, filePath };
}

function loadSlugsFromFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const text = fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  const slugs = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    slugs.push(t);
  }
  return slugs;
}

function pauseMs(ms) {
  if (ms <= 0) return;
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
    } else {
      execSync(`sleep ${Math.ceil(ms / 1000)}`, { stdio: 'ignore' });
    }
  } catch {
    /* ignore */
  }
}

function main() {
  const { dryRun, filePath } = parseArgs();
  const slugs = filePath ? loadSlugsFromFile(filePath) : DEFAULT_SLUGS;

  if (slugs.length === 0) {
    console.error('No slugs to publish.');
    process.exit(1);
  }

  const script = path.join(__dirname, 'publish-crossposts.js');
  console.log(`Hashnode batch: ${slugs.length} slug(s)${dryRun ? ' (dry-run)' : ''}\n`);

  let failed = 0;
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const args = [script, '--publish', '--target=hashnode', `--slug=${slug}`];
    console.log(`[${i + 1}/${slugs.length}] ${slug}`);

    if (dryRun) {
      console.log(`  → node ${args.join(' ')}`);
      continue;
    }

    const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: process.cwd() });
    if (r.status !== 0) {
      console.error(`  ❌ Failed (exit ${r.status})`);
      failed++;
    }

    if (i < slugs.length - 1 && !dryRun) pauseMs(1500);
  }

  if (failed > 0) {
    console.error(`\nDone with ${failed} failure(s).`);
    process.exit(1);
  }
  console.log('\nAll batch publishes finished.');
}

main();
