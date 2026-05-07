import { Link } from 'react-router-dom'
import { Mic, Video, MessageSquare, Zap, ArrowRight, BookOpen } from 'lucide-react'
import Seo from '../components/Seo'

const TRANSCRIPTION_TOOLS = [
  {
    title: 'Core Transcription Tools',
    icon: Mic,
    description: 'Turn speech into text from any source',
    links: [
      { path: '/video-to-transcript', label: 'Video to Transcript' },
      { path: '/youtube-transcript-generator', label: 'YouTube Transcript Generator' },
      { path: '/youtube-to-transcript', label: 'YouTube to Transcript' },
      { path: '/voice-recorder', label: 'Voice to Text Recorder' },
      { path: '/podcast-transcription-tool', label: 'Podcast Transcription' },
      { path: '/meeting-transcription', label: 'Meeting Transcription' },
      { path: '/interview-transcription-tool', label: 'Interview Transcription' },
    ],
  },
  {
    title: 'Transcription Use Cases',
    icon: Video,
    description: 'Specialized transcription for different scenarios',
    links: [
      { path: '/podcast-transcription', label: 'Podcast Transcription' },
      { path: '/webinar-transcription', label: 'Webinar Transcription' },
      { path: '/video-interview-transcription', label: 'Video Interview Transcription' },
      { path: '/zoom-recording-transcription', label: 'Zoom Recording Transcription' },
      { path: '/loom-transcription', label: 'Loom Transcription' },
      { path: '/google-meet-transcription', label: 'Google Meet Transcription' },
      { path: '/teams-meeting-transcription', label: 'Teams Meeting Transcription' },
      { path: '/teams-meeting-transcript', label: 'Teams Meeting Transcript' },
      { path: '/vimeo-transcription', label: 'Vimeo Transcription' },
      { path: '/tiktok-to-transcript', label: 'TikTok to Transcript' },
      { path: '/transcribe-video-online', label: 'Transcribe Video Online' },
      { path: '/press-conference-transcription', label: 'Press Conference Transcription' },
    ],
  },
  {
    title: 'Comparison & Benchmarks',
    icon: Zap,
    description: 'Find the best tool for your needs',
    links: [
      { path: '/best-transcription-tool', label: 'Best Transcription Tool' },
      { path: '/fastest-transcription-tool', label: 'Fastest Transcription Tool' },
      { path: '/fastest-transcription-software', label: 'Fastest Transcription Software' },
      { path: '/best-youtube-transcription-tool', label: 'Best YouTube Transcription Tool' },
      { path: '/best-podcast-transcription-tool', label: 'Best Podcast Transcription Tool' },
      { path: '/transcription-benchmark', label: 'Transcription Benchmark' },
      { path: '/otter-vs-videotext', label: 'Otter vs VideoText' },
      { path: '/descript-vs-videotext', label: 'Descript vs VideoText' },
      { path: '/videotext-vs-rev', label: 'VideoText vs Rev' },
      { path: '/videotext-vs-turboscribe', label: 'VideoText vs TurboScribe' },
    ],
  },
  {
    title: 'Features & Tutorials',
    icon: BookOpen,
    description: 'Learn how to use transcription features',
    links: [
      { path: '/ai-transcription-tools', label: 'AI Transcription Tools' },
      { path: '/ai-transcription-workflow', label: 'AI Transcription Workflow' },
      { path: '/free-speech-to-text', label: 'Free Speech to Text' },
      { path: '/free-video-transcription-tool', label: 'Free Video Transcription Tool' },
      { path: '/accuracy-test', label: 'Accuracy Test' },
    ],
  },
  {
    title: 'Post-Transcription Tools',
    icon: Zap,
    description: 'Process and enhance transcripts and video',
    links: [
      { path: '/translate-subtitles', label: 'Translate Subtitles' },
      { path: '/compress-video', label: 'Compress Video' },
      { path: '/batch-process', label: 'Batch Process Videos' },
    ],
  },
]

export default function TranscriptionToolsHub() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Seo
        title="Transcription Tools & Resources | VideoText"
        description="Complete collection of transcription tools, guides, and comparisons. From podcasts to interviews to video files — transcription solutions for every use case."
        canonicalPath="/transcription-tools"
      />
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Transcription Tools & Resources
          </h1>
          <p className="text-lg text-violet-100 max-w-2xl">
            Complete collection of transcription tools, guides, and comparisons. From podcasts to interviews to video files — we've got you covered.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {TRANSCRIPTION_TOOLS.map((category, idx) => {
            const Icon = category.icon
            return (
              <div key={idx} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Icon className="w-6 h-6 text-violet-600" />
                    {category.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
                </div>
                <ul className="space-y-2">
                  {category.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <span className="text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {link.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600 transition-colors" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Featured Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Mic className="w-5 h-5 text-violet-600" />
              Quick Start
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              New to VideoText? Get up and running in minutes with our quick transcription tutorial.
            </p>
            <Link
              to="/guide"
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-semibold text-sm flex items-center gap-1"
            >
              Read Guide <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              Compare & Choose
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              See how VideoText compares to other transcription tools. Find the right fit for your needs.
            </p>
            <Link
              to="/compare"
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-semibold text-sm flex items-center gap-1"
            >
              View Comparison <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-600" />
              Start Transcribing
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Ready to transcribe? Upload a video, paste a link, or record your voice.
            </p>
            <Link
              to="/video-to-transcript"
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-semibold text-sm flex items-center gap-1"
            >
              Start Now <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
