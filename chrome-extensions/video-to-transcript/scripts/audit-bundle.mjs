/**
 * Security audit of the built extension bundle.
 *
 * Runs as the last step of the production build (and again from the test suite)
 * over exactly the files that ship in dist/ — not over the sources — so what is
 * checked is what Chrome and the Web Store reviewer will actually run.
 *
 * Every finding fails the build.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Secret-shaped tokens that must never appear in client-side extension code. */
const SECRET_PATTERNS = [
  { name: 'OpenAI API key', re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: 'Stripe secret key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe restricted key', re: /\brk_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe webhook secret', re: /\bwhsec_[A-Za-z0-9]{16,}/ },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Replicate API token', re: /\br8_[A-Za-z0-9]{20,}/ },
  { name: 'PostHog project key', re: /\bphc_[A-Za-z0-9]{20,}/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'Database connection string', re: /\b(?:postgres(?:ql)?|redis|rediss|mysql|mongodb(?:\+srv)?):\/\/[^\s"'`]*:[^\s"'`@]+@/ },
  { name: 'JWT secret assignment', re: /JWT_SECRET\s*[:=]\s*['"][^'"]+['"]/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'Hardcoded bearer token', re: /Bearer\s+eyJ[A-Za-z0-9_-]{10,}/ },
]

/** Dynamic-code and remote-code patterns Chrome Web Store policy prohibits. */
const CODE_PATTERNS = [
  { name: 'eval()', re: /(?<![A-Za-z0-9_$.])eval\s*\(/ },
  { name: 'new Function()', re: /new\s+Function\s*\(/ },
  { name: 'setTimeout/setInterval with a string body', re: /set(?:Timeout|Interval)\s*\(\s*['"`]/ },
  { name: 'document.write', re: /document\s*\.\s*write\s*\(/ },
  { name: 'innerHTML assignment', re: /\.innerHTML\s*=/ },
  { name: 'remotely hosted script tag', re: /<script[^>]+src\s*=\s*['"]https?:/i },
  { name: 'import() of a remote URL', re: /import\s*\(\s*['"`]https?:/ },
  { name: 'executeScript with a code string', re: /executeScript\s*\(\s*\{[^}]*\bcode\b\s*:/ },
]

/** Non-production endpoints that must never ship. */
const URL_PATTERNS = [
  { name: 'localhost URL', re: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/ },
  { name: 'tunnel URL', re: /\bhttps?:\/\/[A-Za-z0-9-]+\.(?:ngrok(?:-free)?\.(?:io|app)|trycloudflare\.com|loca\.lt)/ },
  { name: 'staging/dev host', re: /\bhttps?:\/\/(?:staging|dev|test|preview)[.-][A-Za-z0-9.-]*videotext/i },
  { name: 'vercel preview URL', re: /\bhttps?:\/\/[A-Za-z0-9-]+\.vercel\.app/ },
]

/** Origins the shipped code is allowed to reference. */
const ALLOWED_ORIGINS = ['https://api.videotext.io', 'https://videotext.io']

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.json', '.map', '.txt', '.md'])

function listFiles(dir, base = dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listFiles(full, base))
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'))
  }
  return out
}

function extensionOf(name) {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

/**
 * Audit a built extension directory.
 * @returns {{ files: string[], checks: {name: string, ok: boolean, detail: string}[], findings: string[] }}
 */
export function auditBundle(distDir) {
  const files = listFiles(distDir)
  const findings = []
  const checks = []

  const record = (name, ok, detail) => {
    checks.push({ name, ok, detail })
    if (!ok) findings.push(`${name}: ${detail}`)
  }

  const textFiles = files.filter((f) => TEXT_EXTENSIONS.has(extensionOf(f)))
  const sources = new Map(textFiles.map((f) => [f, readFileSync(join(distDir, f), 'utf8')]))

  // Secrets
  const secretHits = []
  for (const { name, re } of SECRET_PATTERNS) {
    for (const [file, text] of sources) {
      if (re.test(text)) secretHits.push(`${name} in ${file}`)
    }
  }
  record(
    'No API keys, tokens or credentials in the bundle',
    secretHits.length === 0,
    secretHits.length ? secretHits.join('; ') : `${SECRET_PATTERNS.length} secret patterns checked across ${sources.size} files`
  )

  // Dynamic / remote code
  const codeHits = []
  for (const { name, re } of CODE_PATTERNS) {
    for (const [file, text] of sources) {
      if (re.test(text)) codeHits.push(`${name} in ${file}`)
    }
  }
  record(
    'No eval, dynamic code execution or remotely hosted JavaScript',
    codeHits.length === 0,
    codeHits.length ? codeHits.join('; ') : `${CODE_PATTERNS.length} patterns checked`
  )

  // Dev / non-production URLs
  const urlHits = []
  for (const { name, re } of URL_PATTERNS) {
    for (const [file, text] of sources) {
      const match = text.match(re)
      if (match) urlHits.push(`${name} (${match[0]}) in ${file}`)
    }
  }
  record(
    'No localhost, tunnel, staging or preview URLs',
    urlHits.length === 0,
    urlHits.length ? urlHits.join('; ') : `${URL_PATTERNS.length} patterns checked`
  )

  // Every http(s) origin referenced must be a known production VideoText origin.
  const foreignOrigins = new Set()
  for (const [, text] of sources) {
    for (const match of text.matchAll(/https?:\/\/[A-Za-z0-9.-]+(?::\d+)?/g)) {
      if (!ALLOWED_ORIGINS.includes(match[0])) foreignOrigins.add(match[0])
    }
  }
  record(
    'Only production VideoText origins are referenced',
    foreignOrigins.size === 0,
    foreignOrigins.size ? [...foreignOrigins].join(', ') : ALLOWED_ORIGINS.join(', ')
  )

  // Source maps must not ship (they can carry original sources).
  const maps = files.filter((f) => f.endsWith('.map'))
  const mapRefs = [...sources].filter(([, text]) => /sourceMappingURL/.test(text)).map(([f]) => f)
  record(
    'No source maps in the bundle',
    maps.length === 0 && mapRefs.length === 0,
    maps.length || mapRefs.length ? [...maps, ...mapRefs].join(', ') : 'no .map files, no sourceMappingURL comments'
  )

  // Manifest: permissions and CSP
  const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'))
  const permissions = manifest.permissions ?? []
  const hostPermissions = manifest.host_permissions ?? []

  const PROHIBITED_PERMISSIONS = [
    '<all_urls>', 'tabs', 'cookies', 'webRequest', 'webRequestBlocking', 'history',
    'bookmarks', 'management', 'debugger', 'proxy', 'privacy', 'nativeMessaging',
    'declarativeNetRequest', 'clipboardRead', 'geolocation', 'topSites', 'browsingData',
    'contentSettings', 'desktopCapture', 'pageCapture', 'tabCapture', 'downloads',
  ]
  const prohibited = [...permissions, ...hostPermissions].filter((p) => PROHIBITED_PERMISSIONS.includes(p))
  record(
    'No broad or unrelated permissions requested',
    prohibited.length === 0,
    prohibited.length ? prohibited.join(', ') : `permissions: [${permissions.join(', ')}]`
  )

  const broadHosts = hostPermissions.filter((h) => /^\*:\/\//.test(h) || h === '<all_urls>' || /:\/\/\*\//.test(h))
  record(
    'No wildcard host permissions',
    broadHosts.length === 0,
    broadHosts.length ? broadHosts.join(', ') : `host_permissions: [${hostPermissions.join(', ')}]`
  )

  const contentScriptMatches = (manifest.content_scripts ?? []).flatMap((cs) => cs.matches ?? [])
  const broadMatches = contentScriptMatches.filter((m) => m === '<all_urls>' || /:\/\/\*\/\*$/.test(m) || /\/\*$/.test(m))
  record(
    'Content scripts are scoped to a single page',
    broadMatches.length === 0,
    broadMatches.length ? broadMatches.join(', ') : contentScriptMatches.join(', ') || 'none'
  )

  const csp = manifest.content_security_policy?.extension_pages ?? ''
  const cspOk = /script-src\s+'self'/.test(csp) && !/unsafe-eval|unsafe-inline/.test(csp)
  record("Extension-pages CSP is script-src 'self' with no unsafe directives", cspOk, csp || 'not set')

  // No inline handlers or inline <script> in the packaged HTML.
  const htmlFiles = textFiles.filter((f) => f.endsWith('.html'))
  const inlineHits = []
  for (const file of htmlFiles) {
    const text = sources.get(file) ?? ''
    if (/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(text)) {
      inlineHits.push(`inline <script> in ${file}`)
    }
    if (/\son[a-z]+\s*=\s*["']/i.test(text)) inlineHits.push(`inline event handler in ${file}`)
  }
  record(
    'No inline scripts or inline event handlers in packaged HTML',
    inlineHits.length === 0,
    inlineHits.length ? inlineHits.join('; ') : `${htmlFiles.length} HTML file(s) checked`
  )

  // Manifest must reference only files that exist in the bundle.
  const referenced = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
    manifest.action?.default_popup,
    ...(manifest.content_scripts ?? []).flatMap((cs) => cs.js ?? []),
    manifest.background?.service_worker,
  ].filter(Boolean)
  const missing = referenced.filter((path) => !files.includes(path))
  record(
    'Every file referenced by manifest.json exists in the bundle',
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${referenced.length} references resolved`
  )

  return { files, checks, findings }
}

export function formatAuditReport(report, { manifest, zipPath }) {
  const status = report.findings.length === 0 ? 'PASS' : 'FAIL'
  const lines = [
    `# Security audit — ${manifest.name} v${manifest.version}`,
    '',
    'Generated by `scripts/audit-bundle.mjs` during `npm run build`. It inspects the files in',
    '`dist/` — the exact bytes packaged into the Web Store ZIP — not the TypeScript sources.',
    '',
    `**Result: ${status}** (${report.checks.length} checks, ${report.findings.length} finding(s))`,
    '',
    `Bundle: ${report.files.length} files · Package: \`${zipPath}\``,
    '',
    '| Check | Result | Detail |',
    '| --- | --- | --- |',
    ...report.checks.map((c) => `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '\\|')} |`),
    '',
    '## Files in the shipped bundle',
    '',
    ...report.files.map((f) => `- \`${f}\``),
    '',
    '## Notes',
    '',
    '- The extension holds **no credentials of its own**. The only secret it ever handles is the',
    "  signed-in user's VideoText session JWT, which the website itself issued, kept in",
    '  `chrome.storage.local` (per-profile, not readable by web pages or other extensions).',
    '- There is no bundler and no minifier: every `.js` file in `dist/` is readable `tsc` output,',
    '  so the absence of dynamic and remote code can be verified by reading it.',
    '- No analytics, telemetry, or third-party SDK is included.',
  ]
  return `${lines.join('\n')}\n`
}
