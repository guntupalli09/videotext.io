#!/usr/bin/env node
/**
 * Renders a branded 1080x1080 social card (VideoText colors + logo) to PNG
 * using headless Chromium. No external image-gen dependency.
 *
 * Usage:
 *   node scripts/social/render-card.mjs \
 *     --tag "PRODUCT STATS" \
 *     --headline "47x REALTIME" \
 *     --subtext "A 2-hour video, transcribed in 2m 25s." \
 *     --out /tmp/card.png
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import path from 'path'

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '')
    out[key] = argv[i + 1]
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const tag = args.tag || 'VIDEOTEXT'
const headline = args.headline || ''
const subtext = args.subtext || ''
const outPath = args.out || '/tmp/card.png'

// Brand tokens, taken directly from client/public/logo.svg and the app's
// existing transactional email templates (server/src/jobs/*Cron.ts) — not
// invented for this script.
const BLUE_FROM = '#3b82f6'
const BLUE_TO = '#1d4ed8'
const BG = '#0f0f0f'
const CARD = '#161628'
const BORDER = '#2d2d4e'
const TEXT_MUTED = '#a5a5c8'

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face { font-family: 'Sys'; src: local('Arial'); }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1080px; background:${BG};
    background-image:
      radial-gradient(circle at 15% 10%, rgba(59,130,246,0.16), transparent 45%),
      radial-gradient(circle at 85% 90%, rgba(29,78,216,0.14), transparent 45%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    display:flex; flex-direction:column; justify-content:space-between;
    padding:72px;
  }
  .brand { display:flex; align-items:center; gap:16px; }
  .brand-name { color:#fff; font-size:28px; font-weight:700; letter-spacing:-0.02em; }
  .tag {
    display:inline-block; align-self:flex-start;
    color:${BLUE_FROM}; background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.35);
    font-size:20px; font-weight:700; letter-spacing:0.12em; padding:8px 18px; border-radius:999px;
    margin-bottom:28px;
  }
  .headline {
    color:#fff; font-size:${headline.length > 24 ? '68px' : '92px'}; font-weight:800; line-height:1.08;
    letter-spacing:-0.02em;
    background: linear-gradient(90deg, #ffffff 55%, ${BLUE_FROM} 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .subtext { color:${TEXT_MUTED}; font-size:32px; font-weight:500; margin-top:24px; line-height:1.4; max-width:880px; }
  .footer { display:flex; align-items:center; justify-content:space-between; border-top:1px solid ${BORDER}; padding-top:32px; }
  .url { color:#fff; font-size:26px; font-weight:700; }
  .waveform { display:flex; align-items:flex-end; gap:4px; height:36px; }
  .waveform div { width:5px; background:linear-gradient(180deg, ${BLUE_FROM}, ${BLUE_TO}); border-radius:3px; }
</style>
</head>
<body>
  <div>
    <div class="brand">
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BLUE_FROM}"/><stop offset="100%" style="stop-color:${BLUE_TO}"/>
        </linearGradient></defs>
        <path fill="url(#g)" d="M12 8v16l12-8-12-8z"/>
        <rect x="4" y="22" width="6" height="1.2" rx="0.4" fill="url(#g)" opacity="0.9"/>
        <rect x="4" y="25" width="8" height="1.2" rx="0.4" fill="url(#g)" opacity="0.7"/>
      </svg>
      <div class="brand-name">VideoText</div>
    </div>
  </div>
  <div>
    <div class="tag">${esc(tag)}</div>
    <div class="headline">${esc(headline)}</div>
    <div class="subtext">${esc(subtext)}</div>
  </div>
  <div class="footer">
    <div class="url">videotext.io</div>
    <div class="waveform">
      ${[14, 26, 18, 34, 22, 30, 16, 24].map((h) => `<div style="height:${h}px"></div>`).join('')}
    </div>
  </div>
</body>
</html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } })
await page.setContent(html, { waitUntil: 'networkidle' })
const format = (args.format || 'png').toLowerCase()
const buf = format === 'jpeg'
  ? await page.screenshot({ type: 'jpeg', quality: Number(args.quality || 75) })
  : await page.screenshot({ type: 'png' })
writeFileSync(path.resolve(outPath), buf)
await browser.close()
console.log('Wrote', outPath)
