import { useState } from 'react'
import FreeToolLayout from '../../components/FreeToolLayout'
import FreeToolResultGate from '../../components/FreeToolResultGate'

const PRESETS = [
  { label: '4K 60fps', width: 3840, height: 2160, fps: 60 },
  { label: '4K 30fps', width: 3840, height: 2160, fps: 30 },
  { label: '1080p 60fps', width: 1920, height: 1080, fps: 60 },
  { label: '1080p 30fps', width: 1920, height: 1080, fps: 30 },
  { label: '720p 30fps', width: 1280, height: 720, fps: 30 },
  { label: '480p 30fps', width: 854, height: 480, fps: 30 },
]

function formatBitrate(kbps: number) {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`
  return `${Math.round(kbps)} kbps`
}

function formatSize(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(0)} MB`
}

export default function VideoBitrateCalculator() {
  const [mode, setMode] = useState<'size-to-bitrate' | 'bitrate-to-size'>('size-to-bitrate')
  const [fileSizeMb, setFileSizeMb] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [durationSec, setDurationSec] = useState('')
  const [audioBitrate, setAudioBitrate] = useState('192')
  const [targetBitrate, setTargetBitrate] = useState('')
  const [duration2Min, setDuration2Min] = useState('')
  const [duration2Sec, setDuration2Sec] = useState('')

  const totalSec = (parseFloat(durationMin) || 0) * 60 + (parseFloat(durationSec) || 0)
  const totalSec2 = (parseFloat(duration2Min) || 0) * 60 + (parseFloat(duration2Sec) || 0)
  const audioKbps = parseFloat(audioBitrate) || 192

  // Mode A: file size + duration → recommended bitrate
  const sizeKbits = (parseFloat(fileSizeMb) || 0) * 8 * 1024
  const totalBitrate = totalSec > 0 ? sizeKbits / totalSec : 0
  const videoBitrate = Math.max(0, totalBitrate - audioKbps)

  // Mode B: bitrate + duration → file size
  const bKbps = parseFloat(targetBitrate) || 0
  const totalBitrateB = bKbps + audioKbps
  const fileSizeB = totalSec2 > 0 ? (totalBitrateB * totalSec2) / 8 / 1024 : 0

  return (
    <FreeToolLayout
      title="Video Bitrate Calculator — File Size & Quality Estimator"
      description="Calculate the ideal video bitrate for a target file size, or estimate how large a video will be at a given bitrate. Free, instant, browser-based."
      hubLink={{ label: 'Free Video Tools', path: '/tools' }}
      contentSections={[
        { heading: 'What is video bitrate?', body: 'Video bitrate is the amount of data encoded per second of video, expressed in kilobits per second (kbps) or megabits per second (Mbps). It is the single biggest factor in the trade-off between file size and visual quality. A higher bitrate captures more detail and handles fast motion better, but produces larger files. A lower bitrate compresses more aggressively, reducing file size at the cost of artifacts like blockiness or blurring in motion-heavy scenes. Understanding bitrate lets you make informed decisions about encoding settings for any platform or storage constraint.' },
        { heading: 'Bitrate recommendations by platform', body: 'Every major platform has its own bitrate guidelines. YouTube recommends 8 Mbps for 1080p at 30fps, 12 Mbps at 60fps, and 35–45 Mbps for 4K at 30fps. Vimeo suggests up to 20 Mbps for 1080p. Instagram and TikTok accept up to 25 Mbps but re-encode uploaded content. For email delivery or self-hosted web video, targeting 2–5 Mbps at 1080p is a practical balance. Always consider the audience\'s internet speed and device storage when selecting a target bitrate.' },
        { heading: 'CBR vs VBR encoding', body: 'Constant Bitrate (CBR) keeps the data rate fixed throughout the video, making bandwidth usage predictable — ideal for live streaming and broadcast workflows. Variable Bitrate (VBR) dynamically adjusts the bitrate based on scene complexity, spending more bits on action sequences and fewer on static shots. VBR generally achieves better visual quality for the same average file size compared to CBR. Two-pass VBR encoding analyses the video first, then encodes with optimal bit distribution. Choose CBR when consistent delivery matters; choose VBR when quality-per-gigabyte is the priority.' },
      ]}
      guideTitle="How to use the video bitrate calculator"
      guideSteps={[
        { step: 'Choose your goal', desc: '"Target size → bitrate": enter the file size limit and video duration to get the recommended bitrate. "Bitrate → file size": enter a bitrate to see the resulting file size.' },
        { step: 'Enter video duration', desc: 'Type the video length in minutes and seconds. This is required for both modes.' },
        { step: 'Read the result', desc: 'The calculator separates video bitrate from audio bitrate so you know exactly how to configure your video encoder.' },
      ]}
      faqs={[
        { q: 'What is video bitrate?', a: 'Bitrate is the amount of data used per second of video, measured in kilobits per second (kbps) or megabits per second (Mbps). Higher bitrate = better quality and larger file size.' },
        { q: 'What bitrate should I use for YouTube?', a: 'YouTube recommends: 1080p/30fps: 8 Mbps, 1080p/60fps: 12 Mbps, 4K/30fps: 35–45 Mbps. However, YouTube re-encodes uploaded videos, so uploading higher bitrate than recommended is fine.' },
        { q: 'What bitrate for Vimeo uploads?', a: 'Vimeo recommends up to 20 Mbps for 1080p and up to 60 Mbps for 4K. For Standard Definition, 5 Mbps is sufficient.' },
        { q: 'Does audio bitrate affect video quality?', a: 'No. Audio and video are separate streams. The calculator shows video bitrate after reserving the specified audio bitrate from the total file size budget.' },
        { q: 'What is the formula for video bitrate?', a: 'Video bitrate (kbps) = (target file size in MB × 8 × 1024 ÷ duration in seconds) − audio bitrate. This gives the maximum video bitrate that fits within the size limit.' },
        { q: 'What is the difference between CBR and VBR?', a: 'CBR (Constant Bitrate) uses the same bitrate throughout the entire video, making file sizes predictable. VBR (Variable Bitrate) adjusts bitrate based on scene complexity — allocating more bits to fast motion and fewer to static scenes. VBR generally produces better quality at the same average file size, while CBR is preferred for streaming where consistent bandwidth is required.' },
        { q: 'What bitrate for 4K video?', a: 'For 4K (3840×2160) video: YouTube recommends 35–45 Mbps at 30fps and 53–68 Mbps at 60fps. For archival or editing purposes, 100–200 Mbps is common. Consumer cameras like the Sony A7 series shoot 4K at around 100 Mbps. The right bitrate depends on your delivery platform and whether you are mastering or distributing.' },
        { q: 'Does higher bitrate always mean better quality?', a: 'Not always. Beyond a certain threshold — which depends on resolution and content — additional bitrate produces no visible improvement. A well-encoded video at 8 Mbps can look better than a poorly encoded video at 20 Mbps. Codec efficiency also matters: H.265/HEVC achieves the same quality as H.264 at roughly half the bitrate.' },
      ]}
      relatedTools={[
        { label: 'Aspect Ratio Calculator', path: '/tools/aspect-ratio-calculator', desc: 'Calculate video crop dimensions' },
        { label: 'Video Metadata Viewer', path: '/tools/video-metadata-viewer', desc: 'Check actual bitrate of your video file' },
        { label: 'Compress Video', path: '/compress-video', desc: 'Reduce video file size with AI' },
        { label: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Add subtitles to your video' },
      ]}
    >
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
          {[
            { key: 'size-to-bitrate', label: 'Target size → bitrate' },
            { key: 'bitrate-to-size', label: 'Bitrate → file size' },
          ].map((m) => (
            <button key={m.key} onClick={() => setMode(m.key as typeof mode)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m.key ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'size-to-bitrate' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Target file size (MB)</label>
                <input type="number" min={1} value={fileSizeMb} onChange={(e) => setFileSizeMb(e.target.value)} placeholder="500" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Audio bitrate (kbps)</label>
                <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {['96', '128', '192', '256', '320'].map((v) => <option key={v} value={v}>{v} kbps</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Video duration</p>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-gray-500">Minutes</label><input type="number" min={0} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="10" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">Seconds</label><input type="number" min={0} max={59} value={durationSec} onChange={(e) => setDurationSec(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
              </div>
            </div>
            {videoBitrate > 0 && (
              <FreeToolResultGate title="Your bitrate calculation is ready">
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[{ label: 'Video bitrate', val: formatBitrate(videoBitrate), note: 'Set this in your encoder' }, { label: 'Total bitrate', val: formatBitrate(totalBitrate), note: `incl. ${audioBitrate} kbps audio` }].map((s) => (
                    <div key={s.label} className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-4 text-center">
                      <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{s.val}</p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{s.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>
                    </div>
                  ))}
                </div>
              </FreeToolResultGate>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Video bitrate (kbps)</label>
                <input type="number" min={100} value={targetBitrate} onChange={(e) => setTargetBitrate(e.target.value)} placeholder="8000" className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">Audio bitrate (kbps)</label>
                <select value={audioBitrate} onChange={(e) => setAudioBitrate(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {['96', '128', '192', '256', '320'].map((v) => <option key={v} value={v}>{v} kbps</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Video duration</p>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-gray-500">Minutes</label><input type="number" min={0} value={duration2Min} onChange={(e) => setDuration2Min(e.target.value)} placeholder="10" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
                <div className="flex-1"><label className="text-xs text-gray-500">Seconds</label><input type="number" min={0} max={59} value={duration2Sec} onChange={(e) => setDuration2Sec(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>
              </div>
            </div>
            {fileSizeB > 0 && (
              <FreeToolResultGate title="Your file size estimate is ready">
                <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-4 text-center mt-2">
                  <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{formatSize(fileSizeB)}</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">Estimated file size</p>
                  <p className="text-xs text-gray-400 mt-0.5">at {formatBitrate(bKbps)} video + {audioBitrate} kbps audio</p>
                </div>
              </FreeToolResultGate>
            )}
          </div>
        )}

        {/* Presets reference */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">YouTube recommended bitrates</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {PRESETS.map((p) => {
              const recBitrate = p.fps === 60 ? (p.height >= 2160 ? 66000 : p.height >= 1080 ? 12000 : 7500) : (p.height >= 2160 ? 45000 : p.height >= 1080 ? 8000 : p.height >= 720 ? 5000 : 2500)
              return (
                <div key={p.label} className="flex justify-between items-center px-4 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{p.label}</span>
                  <span className="font-semibold text-violet-700 dark:text-violet-400">{formatBitrate(recBitrate)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </FreeToolLayout>
  )
}
