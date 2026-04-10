/**
 * /developers — Public API documentation + API key management.
 * Revenue channel: developers pay per minute (Business plan required).
 * Beat strategy: 5x cheaper than AWS Transcribe, 3x cheaper than AssemblyAI.
 */
import { useState, useEffect, useCallback } from 'react'
import { Code2, Key, Plus, Trash2, Copy, Check, Terminal, Zap, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { trackEvent } from '../lib/analytics'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface ApiKeyInfo {
  label: string
  plan: string
  createdAt: string
  minutesUsed: number
}

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.videotext.io/api/v1/transcribe \\
  -H "Authorization: Bearer vtk_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "output": ["transcript", "summary", "chapters"],
    "speakers": true
  }'

# Response: { "jobId": "...", "status": "queued", "poll": "..." }

# Poll for result:
curl https://api.videotext.io/api/v1/jobs/{jobId} \\
  -H "Authorization: Bearer vtk_YOUR_API_KEY"`,

  python: `import requests
import time

API_KEY = "vtk_YOUR_API_KEY"
BASE = "https://api.videotext.io/api/v1"

# Submit transcription
resp = requests.post(f"{BASE}/transcribe",
  headers={"Authorization": f"Bearer {API_KEY}"},
  json={
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "output": ["transcript", "summary"],
    "speakers": True
  }
)
job = resp.json()
job_id = job["jobId"]

# Poll until complete
while True:
    r = requests.get(f"{BASE}/jobs/{job_id}",
      headers={"Authorization": f"Bearer {API_KEY}"})
    data = r.json()
    if data["status"] == "completed":
        print(data["result"]["transcript"])
        break
    elif data["status"] == "failed":
        print("Failed:", data["failReason"])
        break
    time.sleep(3)`,

  node: `const API_KEY = "vtk_YOUR_API_KEY";
const BASE = "https://api.videotext.io/api/v1";

// Submit transcription
const { jobId } = await fetch(\`\${BASE}/transcribe\`, {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    output: ["transcript", "summary", "chapters"],
    speakers: true,
  }),
}).then(r => r.json());

// Poll until done
const poll = async (jobId) => {
  const data = await fetch(\`\${BASE}/jobs/\${jobId}\`, {
    headers: { "Authorization": \`Bearer \${API_KEY}\` },
  }).then(r => r.json());
  if (data.status === "completed") return data.result;
  if (data.status === "failed") throw new Error(data.failReason);
  await new Promise(r => setTimeout(r, 3000));
  return poll(jobId);
};

const result = await poll(jobId);
console.log(result.transcript);`,
}

export default function Developers() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'node'>('curl')
  const [showEndpoints, setShowEndpoints] = useState(false)
  const loggedIn = isLoggedIn()

  const fetchKeys = useCallback(async () => {
    if (!loggedIn) return
    try {
      const resp = await api('/api/v1/keys')
      if (resp.ok) {
        const data = await resp.json()
        setKeys(data.keys || [])
      }
    } catch {
      // non-blocking
    }
  }, [loggedIn])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const createKey = async () => {
    if (!loggedIn) return
    setCreating(true)
    try {
      const resp = await api('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || 'Default' }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        if (data.upgrade) {
          toast.error('API access requires a Pro or Business plan.')
        } else {
          toast.error(data.error || 'Failed to create key')
        }
        return
      }
      setNewKey(data.key)
      setLabel('')
      trackEvent('api_key_created', {})
      toast.success('API key created! Copy it now — it won\'t be shown again.')
      await fetchKeys()
    } catch {
      toast.error('Failed to create API key. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (keyLabel: string) => {
    if (!confirm(`Revoke key "${keyLabel}"? This cannot be undone.`)) return
    try {
      await api(`/api/v1/keys/${encodeURIComponent(keyLabel)}`, { method: 'DELETE' })
      setKeys(prev => prev.filter(k => k.label !== keyLabel))
      toast.success('Key revoked.')
    } catch {
      toast.error('Failed to revoke key.')
    }
  }

  const copyCode = (lang: string, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(lang)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-semibold uppercase tracking-wider mb-4">
            <Terminal className="w-4 h-4" />
            VideoText API
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Transcription API<br className="hidden sm:block" /> for developers
          </h1>
          <p className="mt-4 text-lg text-gray-400 max-w-xl">
            Add AI transcription to any app in minutes. Submit a YouTube URL or video link, poll for results.
            <span className="text-gray-300 font-medium"> 5× cheaper than AWS Transcribe.</span>
          </p>

          {/* Pricing pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { label: 'VideoText API', price: '$0.005/min', highlight: true },
              { label: 'AWS Transcribe', price: '$0.024/min' },
              { label: 'AssemblyAI', price: '$0.015/min' },
              { label: 'Deepgram', price: '$0.008/min' },
            ].map(({ label, price, highlight }) => (
              <div
                key={label}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  highlight
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400'
                }`}
              >
                {label}: <span className={highlight ? 'text-violet-200 font-bold' : 'text-gray-300'}>{price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* Quick start */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick start
          </h2>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            {/* Language tabs */}
            <div className="flex border-b border-gray-800">
              {(['curl', 'python', 'node'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${
                    activeLang === lang
                      ? 'bg-gray-800 text-white border-b-2 border-violet-500'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {lang === 'node' ? 'Node.js' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
              <div className="ml-auto pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => copyCode(activeLang, CODE_EXAMPLES[activeLang])}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {copiedCode === activeLang ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === activeLang ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <pre className="p-6 text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {CODE_EXAMPLES[activeLang]}
            </pre>
          </div>
        </section>

        {/* API Endpoints */}
        <section>
          <button
            type="button"
            onClick={() => setShowEndpoints(v => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-violet-400" />
              API Reference
            </h2>
            {showEndpoints ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showEndpoints && (
            <div className="mt-6 space-y-4">
              {[
                {
                  method: 'POST', path: '/api/v1/transcribe',
                  desc: 'Submit a YouTube URL or direct video/audio URL for transcription.',
                  body: `{
  "url": "string (required) — YouTube URL or direct video URL",
  "language": "string (optional) — BCP-47 code e.g. 'en', 'es'. Auto-detect if omitted.",
  "output": "string[] — ['transcript', 'summary', 'chapters']. Default: ['transcript']",
  "speakers": "boolean — Enable speaker diarization. Default: false"
}`,
                  returns: `{ "jobId": "uuid", "status": "queued", "poll": "URL to poll" }`,
                },
                {
                  method: 'GET', path: '/api/v1/jobs/:jobId',
                  desc: 'Poll for transcription status and result.',
                  body: null,
                  returns: `{
  "status": "queued | processing | completed | failed",
  "progress": 0-100,
  "result": {
    "transcript": "Full text...",
    "summary": "AI summary...",
    "chapters": [{ "label": "...", "startTime": 0 }],
    "segments": [{ "start": 0, "end": 3.5, "text": "...", "speaker": "Speaker 1" }]
  }
}`,
                },
                {
                  method: 'POST', path: '/api/v1/keys',
                  desc: 'Create a new API key. Requires JWT auth (sign in first).',
                  body: `{ "label": "string (optional)" }`,
                  returns: `{ "key": "vtk_...", "label": "...", "createdAt": "ISO date" }`,
                },
              ].map((ep) => (
                <div key={ep.path} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                      ep.method === 'GET' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                        : 'bg-violet-900/50 text-violet-400 border border-violet-700/50'
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-sm text-gray-200 font-mono">{ep.path}</code>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-sm text-gray-400">{ep.desc}</p>
                    {ep.body && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Request body</p>
                        <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded-lg p-3 overflow-x-auto">{ep.body}</pre>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Response</p>
                      <pre className="text-xs text-gray-300 font-mono bg-gray-950 rounded-lg p-3 overflow-x-auto">{ep.returns}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* API Key management */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-400" />
            Your API Keys
          </h2>

          {!loggedIn ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center space-y-4">
              <Lock className="w-8 h-8 text-gray-600 mx-auto" />
              <p className="text-gray-400">Sign in to manage your API keys.</p>
              <div className="flex gap-3 justify-center">
                <Link to="/login" className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors">
                  Sign in
                </Link>
                <Link to="/pricing" className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                  Get Pro access
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* New key just created */}
              {newKey && (
                <div className="rounded-xl border border-emerald-700/50 bg-emerald-900/20 p-4">
                  <p className="text-sm text-emerald-400 font-semibold mb-2">
                    Your new API key — copy it now, it won't be shown again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-emerald-300 bg-gray-950 rounded-lg px-3 py-2 truncate">
                      {newKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newKey)
                        setCopiedKey(true)
                        setTimeout(() => setCopiedKey(false), 2000)
                        toast.success('Copied!')
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedKey ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewKey(null)}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-400"
                  >
                    I've saved my key ✓
                  </button>
                </div>
              )}

              {/* Existing keys */}
              {keys.length > 0 && (
                <div className="rounded-xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">
                  {keys.map((k) => (
                    <div key={k.label} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{k.label}</p>
                        <p className="text-xs text-gray-500">
                          {k.plan} plan · Created {new Date(k.createdAt).toLocaleDateString()} · {k.minutesUsed} min used
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revokeKey(k.label)}
                        className="shrink-0 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create new key form */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <p className="text-sm font-semibold text-gray-300 mb-3">Create a new API key</p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Key label (e.g. Production, Dev)"
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                    maxLength={60}
                    onKeyDown={(e) => e.key === 'Enter' && createKey()}
                  />
                  <button
                    type="button"
                    onClick={createKey}
                    disabled={creating}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {creating ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">API access requires a Pro or Business plan. <Link to="/pricing" className="text-violet-400 hover:underline">Upgrade →</Link></p>
              </div>
            </div>
          )}
        </section>

        {/* Rate limits + pricing */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Rate limits & pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { plan: 'Pro', rpm: '10 req/min', cost: 'Included in plan', detail: 'Fair use, no overage' },
              { plan: 'Business', rpm: '60 req/min', cost: 'Included in plan', detail: '8 concurrent jobs' },
              { plan: 'Pay-as-you-go', rpm: 'Coming soon', cost: '$0.005/min', detail: 'No subscription needed' },
            ].map(({ plan, rpm, cost, detail }) => (
              <div key={plan} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-sm font-bold text-white">{plan}</p>
                <p className="text-xs text-violet-400 font-medium mt-1">{rpm}</p>
                <p className="text-sm font-semibold text-gray-200 mt-2">{cost}</p>
                <p className="text-xs text-gray-500 mt-1">{detail}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
