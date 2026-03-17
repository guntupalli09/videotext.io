import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function getAspectRatio(w: number, h: number) {
  const g = gcd(w, h)
  return `${w / g}:${h / g}`
}

const COMMON_RATIOS = [
  { ratio: '16:9', desc: 'YouTube, TV, most cameras', w: 16, h: 9 },
  { ratio: '9:16', desc: 'TikTok, Reels, Shorts', w: 9, h: 16 },
  { ratio: '1:1', desc: 'Instagram square', w: 1, h: 1 },
  { ratio: '4:3', desc: 'Legacy TV, old cameras', w: 4, h: 3 },
  { ratio: '21:9', desc: 'Ultrawide cinematic', w: 21, h: 9 },
  { ratio: '4:5', desc: 'Instagram portrait', w: 4, h: 5 },
]

export default function AspectRatioCalculator() {
  const [widthIn, setWidthIn] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [ratioW, setRatioW] = useState('16')
  const [ratioH, setRatioH] = useState('9')
  const [knownDim, setKnownDim] = useState('width')
  const [knownVal, setKnownVal] = useState('')
  const [mode, setMode] = useState<'detect' | 'calculate'>('detect')

  const w = parseInt(widthIn)
  const h = parseInt(heightIn)
  const detectedRatio = w > 0 && h > 0 ? getAspectRatio(w, h) : null
  const decimalRatio = w > 0 && h > 0 ? (w / h).toFixed(4) : null

  const rw = parseFloat(ratioW)
  const rh = parseFloat(ratioH)
  const kv = parseFloat(knownVal)
  let calcResult: number | null = null
  if (rw > 0 && rh > 0 && kv > 0) {
    calcResult = knownDim === 'width' ? Math.round((kv * rh) / rw) : Math.round((kv * rw) / rh)
  }

  return (
    <FreeToolLayout
      title="Video Aspect Ratio Calculator — Free Online"
      description="Calculate video aspect ratios, find missing dimensions, and get crop sizes for YouTube (16:9), TikTok (9:16), Instagram, and more. Instant, browser-based."
      guideTitle="How to use the aspect ratio calculator"
      guideSteps={[
        { step: 'Detect mode: enter width and height', desc: 'Type your video\'s pixel dimensions to see its aspect ratio and how it compares to common formats.' },
        { step: 'Calculate mode: enter a ratio and one dimension', desc: 'Select a standard ratio (16:9, 9:16, etc.), enter width OR height, and the tool calculates the other dimension.' },
        { step: 'Use the result', desc: 'Use the output dimensions to set up your video editor, export settings, or crop parameters.' },
      ]}
      faqs={[
        { q: 'What is a 16:9 aspect ratio in pixels?', a: 'Common 16:9 resolutions: 1920×1080 (Full HD), 1280×720 (HD), 3840×2160 (4K), 2560×1440 (QHD). Any width divisible by 16 paired with the proportional height is valid 16:9.' },
        { q: 'What aspect ratio should I use for YouTube?', a: 'YouTube\'s native player is 16:9. Any other aspect ratio will have letterbox (black bars) added. Always film and export at 16:9 for the best YouTube experience.' },
        { q: 'What aspect ratio is best for TikTok and Instagram Reels?', a: 'TikTok, Instagram Reels, and YouTube Shorts all use 9:16 (vertical portrait). The recommended resolution is 1080×1920.' },
        { q: 'What does "aspect ratio" mean?', a: 'Aspect ratio is the proportional relationship between video width and height. 16:9 means for every 16 units of width, there are 9 units of height. It determines the shape of your video frame.' },
        { q: 'How do I change aspect ratio without distortion?', a: 'You must crop the video (removing pixels) rather than stretch it. Use your video editor\'s crop tool with locked aspect ratio. Stretching always causes distortion.' },
      ]}
      relatedTools={[
        { label: 'Video Bitrate Calculator', path: '/tools/video-bitrate-calculator', desc: 'Calculate bitrate for target file size' },
        { label: 'Timestamp Converter', path: '/tools/timestamp-converter', desc: 'Convert seconds to HH:MM:SS format' },
        { label: 'Compress Video', path: '/compress-video', desc: 'Reduce video file size online' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Add AI subtitles to your video' },
      ]}
    >
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
          {[{ key: 'detect', label: 'Detect ratio from dimensions' }, { key: 'calculate', label: 'Calculate dimension from ratio' }].map((m) => (
            <button key={m.key} onClick={() => setMode(m.key as typeof mode)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m.key ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'detect' ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Width (px)</label>
                <input type="number" min={1} value={widthIn} onChange={(e) => setWidthIn(e.target.value)} placeholder="1920" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <span className="text-gray-400 font-bold mt-5">×</span>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Height (px)</label>
                <input type="number" min={1} value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="1080" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>

            {detectedRatio && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-5 text-center">
                <p className="text-4xl font-display font-bold text-violet-700 dark:text-violet-300">{detectedRatio}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">decimal: {decimalRatio}</p>
                <p className="text-xs text-gray-400 mt-2">{widthIn}×{heightIn} pixels</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Select ratio</p>
              <div className="grid grid-cols-3 gap-2">
                {COMMON_RATIOS.map((r) => (
                  <button key={r.ratio} onClick={() => { setRatioW(String(r.w)); setRatioH(String(r.h)) }} className={`p-2 rounded-lg text-xs font-semibold border transition-colors ${ratioW === String(r.w) && ratioH === String(r.h) ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-violet-300'}`}>
                    {r.ratio}
                    <span className="block font-normal text-gray-400 text-xs">{r.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-3 items-end">
                <div className="flex-1"><label className="text-xs text-gray-500">Custom W</label><input type="number" min={1} value={ratioW} onChange={(e) => setRatioW(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
                <span className="text-gray-400 font-bold pb-2">:</span>
                <div className="flex-1"><label className="text-xs text-gray-500">Custom H</label><input type="number" min={1} value={ratioH} onChange={(e) => setRatioH(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">I know the…</p>
              <div className="flex gap-2 mb-3">
                {(['width', 'height'] as const).map((d) => (
                  <button key={d} onClick={() => setKnownDim(d)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${knownDim === d ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <input type="number" min={1} value={knownVal} onChange={(e) => setKnownVal(e.target.value)} placeholder={knownDim === 'width' ? '1920' : '1080'} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>

            {calcResult && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-5 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{knownDim === 'width' ? 'Height' : 'Width'}</p>
                <p className="text-4xl font-display font-bold text-violet-700 dark:text-violet-300 mt-1">{calcResult}px</p>
                <p className="text-xs text-gray-400 mt-2">
                  {knownDim === 'width' ? `${knownVal} × ${calcResult}` : `${calcResult} × ${knownVal}`} at {ratioW}:{ratioH}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reference table */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">Common aspect ratios</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {COMMON_RATIOS.map((r) => (
              <div key={r.ratio} className="flex justify-between items-center px-4 py-2 text-sm">
                <span className="font-mono font-semibold text-violet-700 dark:text-violet-400">{r.ratio}</span>
                <span className="text-gray-600 dark:text-gray-300">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FreeToolLayout>
  )
}
