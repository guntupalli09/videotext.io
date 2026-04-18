import { Link } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import Seo from '../components/Seo'

const ALTERNATIVE_CATEGORIES = [
  {
    title: 'Transcription & Speech Recognition',
    description: 'AI-powered transcription alternatives',
    links: [
      { path: '/otter-alternative', label: 'Otter Alternative' },
      { path: '/descript-alternative', label: 'Descript Alternative' },
      { path: '/trint-alternative', label: 'Trint Alternative' },
      { path: '/rev-alternative', label: 'Rev Alternative' },
      { path: '/sonix-alternative', label: 'Sonix Alternative' },
      { path: '/happyscribe-alternative', label: 'HappyScribe Alternative' },
      { path: '/easyscribe-alternative', label: 'EasyScribe Alternative' },
      { path: '/notta-alternative', label: 'Notta Alternative' },
      { path: '/tactiq-alternative', label: 'Tactiq Alternative' },
      { path: '/turboscribe-alternative', label: 'TurboScribe Alternative' },
      { path: '/deepgram-alternative', label: 'Deepgram Alternative' },
      { path: '/fireflies-alternative', label: 'Fireflies Alternative' },
      { path: '/riverside-alternative', label: 'Riverside Alternative' },
      { path: '/maestra-alternative', label: 'Maestra Alternative' },
      { path: '/speechmatics-alternative', label: 'Speechmatics Alternative' },
      { path: '/assembly-ai-alternative', label: 'Assembly AI Alternative' },
      { path: '/whisperx-alternative', label: 'WhisperX Alternative' },
      { path: '/allscribe-alternative', label: 'Allscribe Alternative' },
      { path: '/skribo-alternative', label: 'Skribo Alternative' },
    ],
  },
  {
    title: 'Voice Recording & Speech-to-Text',
    description: 'Direct voice input and dictation tools',
    links: [
      { path: '/dragon-dictate-alternative', label: 'Dragon Dictate Alternative' },
      { path: '/superwhisper-alternative', label: 'SuperWhisper Alternative' },
      { path: '/speechtexter-alternative', label: 'SpeechTexter Alternative' },
      { path: '/speechnotes-alternative', label: 'SpeechNotes Alternative' },
      { path: '/whisper-notes-alternative', label: 'Whisper Notes Alternative' },
      { path: '/voice-to-text', label: 'Voice to Text' },
      { path: '/voice-to-text-online', label: 'Voice to Text Online' },
      { path: '/voice-recorder-online', label: 'Voice Recorder Online' },
      { path: '/online-voice-recorder', label: 'Online Voice Recorder' },
      { path: '/google-docs-voice-typing-alternative', label: 'Google Docs Voice Typing Alternative' },
      { path: '/dictation-io-alternative', label: 'Dictation.io Alternative' },
    ],
  },
  {
    title: 'Meeting & Conference Recording',
    description: 'Meeting transcription and recording tools',
    links: [
      { path: '/microsoft-teams-alternative', label: 'Microsoft Teams Alternative' },
      { path: '/zoom-alternative', label: 'Zoom Alternative' },
      { path: '/webex-alternative', label: 'Webex Alternative' },
      { path: '/teams-meeting-transcript', label: 'Teams Meeting Transcript' },
      { path: '/meetgeek-alternative', label: 'MeetGeek Alternative' },
      { path: '/scribe-alternative', label: 'Scribe Alternative' },
    ],
  },
  {
    title: 'Subtitle & Caption Tools',
    description: 'Subtitle creation and editing alternatives',
    links: [
      { path: '/subly-alternative', label: 'Subly Alternative' },
      { path: '/submagic-alternative', label: 'SubMagic Alternative' },
      { path: '/notability-alternative', label: 'Notability Alternative' },
      { path: '/movavi-alternative', label: 'Movavi Alternative' },
      { path: '/capcut-alternative', label: 'CapCut Alternative' },
      { path: '/subtitle-edit-alternative', label: 'Subtitle Edit Alternative' },
      { path: '/adobe-premiere-captions-alternative', label: 'Adobe Premiere Captions Alternative' },
      { path: '/microsoft-word-transcription-alternative', label: 'Microsoft Word Transcription Alternative' },
    ],
  },
  {
    title: 'Podcast & Audio Production',
    description: 'Podcasting and audio creation alternatives',
    links: [
      { path: '/spreaker-alternative', label: 'Spreaker Alternative' },
      { path: '/headliner-alternative', label: 'Headliner Alternative' },
      { path: '/castmagic-alternative', label: 'CastMagic Alternative' },
      { path: '/krisp-alternative', label: 'Krisp Alternative' },
      { path: '/elevenlabs-alternative', label: 'ElevenLabs Alternative' },
      { path: '/speechify-alternative', label: 'Speechify Alternative' },
      { path: '/hedy-ai-alternative', label: 'Hedy AI Alternative' },
    ],
  },
  {
    title: 'Video Editing & Content Creation',
    description: 'Video creation and editing tool alternatives',
    links: [
      { path: '/panopto-alternative', label: 'Panopto Alternative' },
      { path: '/videoProc-alternative', label: 'VideoProc Alternative' },
      { path: '/invideo-alternative', label: 'InVideo Alternative' },
      { path: '/fliki-alternative', label: 'Fliki Alternative' },
      { path: '/kapwing-alternative', label: 'Kapwing Alternative' },
      { path: '/vizard-alternative', label: 'Vizard Alternative' },
      { path: '/whispertype-alternative', label: 'WhisperType Alternative' },
      { path: '/mem-ai-alternative', label: 'Mem AI Alternative' },
      { path: '/vocallab-alternative', label: 'VocalLab Alternative' },
      { path: '/vomo-alternative', label: 'Vomo Alternative' },
    ],
  },
  {
    title: 'Intelligent Search & Knowledge',
    description: 'AI-powered search and knowledge management',
    links: [
      { path: '/glean-alternative', label: 'Glean Alternative' },
      { path: '/granola-alternative', label: 'Granola Alternative' },
    ],
  },
  {
    title: 'Online Generation & Automation',
    description: 'Content generation and automation alternatives',
    links: [
      { path: '/genio-alternative', label: 'Genio Alternative' },
      { path: '/ditto-transcripts-alternative', label: 'Ditto Transcripts Alternative' },
      { path: '/zubtitle-alternative', label: 'Zubtitle Alternative' },
      { path: '/youtube-auto-captions-alternative', label: 'YouTube Auto Captions Alternative' },
    ],
  },
]

export default function AlternativesHub() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Seo
        title="Transcription & Subtitle Tool Alternatives | VideoText"
        description="Explore alternatives to Otter.ai, Descript, Rev, Sonix, and 40+ other transcription tools. Find the perfect AI transcription solution for your needs."
        canonicalPath="/alternatives"
      />
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Transcription & Subtitle Tool Alternatives
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Explore alternatives to popular transcription, voice recording, meeting, and subtitle tools. Find the perfect solution for your workflow.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {ALTERNATIVE_CATEGORIES.map((category, idx) => (
            <div key={idx} className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  {category.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
              </div>
              <ul className="space-y-2">
                {category.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <span className="text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {link.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-blue-50 dark:bg-gray-800 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to switch to VideoText?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            All-in-one transcription, translation, and subtitle solution. Fast, accurate, and built for creators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/video-to-transcript"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Start Transcribing <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/compare"
              className="inline-flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Compare Tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
