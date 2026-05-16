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
      hubLink={{ label: 'Free Video Tools', path: '/tools' }}
      contentSections={[
        { heading: 'What is aspect ratio?', body: 'Aspect ratio describes the proportional relationship between a video\'s width and height, expressed as two numbers separated by a colon — for example, 16:9. It defines the shape of the frame, not the actual pixel dimensions. A 1920×1080 video and a 1280×720 video are both 16:9 because they share the same proportional relationship. Aspect ratio affects how your video appears on different screens and platforms, and choosing the wrong one can result in black bars, cropping, or distortion when your content is displayed.' },
        { heading: 'Common aspect ratios for video platforms', body: '16:9 is the universal standard for YouTube, TV, and most desktop players. 9:16 (vertical) is the native format for TikTok, Instagram Reels, and YouTube Shorts. 1:1 (square) works well in social media feeds and retains more screen space on mobile than 16:9. 4:5 (portrait) is Instagram\'s recommended format for feed videos because it takes up maximum vertical space without going fully vertical. 21:9 (ultrawide) is used in cinematic productions for a widescreen theatrical feel. Knowing which ratio suits your platform avoids wasted space and re-editing.' },
        { heading: 'What happens when aspect ratios don\'t match?', body: 'When a video\'s native aspect ratio does not match the player or platform, one of two things happens: letterboxing adds black bars on top and bottom (for widescreen content in a square player) or pillarboxing adds black bars on the sides (for square content in a widescreen player). Some platforms automatically crop the video to fill the frame, cutting off part of the image. To avoid surprises, always check the required aspect ratio for your target platform before shooting or exporting, and use this calculator to confirm your dimensions before editing.' },
      ]}
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
        { q: 'What aspect ratio is best for LinkedIn video?', a: 'LinkedIn supports multiple aspect ratios, but 16:9 (landscape) performs best in the desktop feed, while 1:1 (square) and 4:5 (portrait) get more screen real estate on mobile. LinkedIn\'s recommended resolution is 1920×1080 for landscape. Vertical 9:16 is supported but less common on LinkedIn compared to TikTok or Instagram.' },
        { q: 'Can I upload 4:3 video to YouTube?', a: 'Yes. YouTube accepts 4:3 video and will display it with black pillarbox bars on either side within its 16:9 player. The video itself is not cropped or distorted. For the best viewing experience, convert 4:3 footage to 16:9 by adding letterbox bars or cropping before uploading.' },
        { q: 'What aspect ratio is iPhone video?', a: 'iPhones record in 16:9 by default in landscape orientation, which means the actual pixel dimensions are 1920×1080 or 3840×2160 (4K). Holding the phone vertically gives 9:16. iPhone 15 and later models also support Action Mode, which may slightly crop the frame. Cinematic mode on iPhone records at approximately 2.39:1 for a widescreen look.' },
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
            <button key={m.key} onClick={() => setMode(m.key as typeof mode)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m.key ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'detect' ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Width (px)</label>
                <input type="number" min={1} value={widthIn} onChange={(e) => setWidthIn(e.target.value)} placeholder="1920" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <span className="text-gray-400 font-bold mt-5">×</span>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Height (px)</label>
                <input type="number" min={1} value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="1080" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {detectedRatio && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-5 text-center">
                <p className="text-4xl font-display font-bold text-blue-700 dark:text-blue-300">{detectedRatio}</p>
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
                  <button key={r.ratio} onClick={() => { setRatioW(String(r.w)); setRatioH(String(r.h)) }} className={`p-2 rounded-lg text-xs font-semibold border transition-colors ${ratioW === String(r.w) && ratioH === String(r.h) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300'}`}>
                    {r.ratio}
                    <span className="block font-normal text-gray-400 text-xs">{r.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-3 items-end">
                <div className="flex-1"><label className="text-xs text-gray-500">Custom W</label><input type="number" min={1} value={ratioW} onChange={(e) => setRatioW(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <span className="text-gray-400 font-bold pb-2">:</span>
                <div className="flex-1"><label className="text-xs text-gray-500">Custom H</label><input type="number" min={1} value={ratioH} onChange={(e) => setRatioH(e.target.value)} className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">I know the…</p>
              <div className="flex gap-2 mb-3">
                {(['width', 'height'] as const).map((d) => (
                  <button key={d} onClick={() => setKnownDim(d)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${knownDim === d ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
              <input type="number" min={1} value={knownVal} onChange={(e) => setKnownVal(e.target.value)} placeholder={knownDim === 'width' ? '1920' : '1080'} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {calcResult && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-5 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{knownDim === 'width' ? 'Height' : 'Width'}</p>
                <p className="text-4xl font-display font-bold text-blue-700 dark:text-blue-300 mt-1">{calcResult}px</p>
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
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{r.ratio}</span>
                <span className="text-gray-600 dark:text-gray-300">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FreeToolLayout>
  )
}
