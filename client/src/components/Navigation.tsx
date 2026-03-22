import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import UserMenu from './UserMenu'
import { prefetchRoute } from '../lib/prefetch'
import { isLoggedIn } from '../lib/auth'
import { useFounderStatus } from '../hooks/useFounderStatus'

const tools = [
  { name: 'Voice → Text 🎙️', path: '/voice-recorder' },
  { name: 'Video → Transcript', path: '/video-to-transcript' },
  { name: 'Video → Subtitles', path: '/video-to-subtitles' },
  { name: 'Translate Subtitles', path: '/translate-subtitles' },
  { name: 'Fix Subtitles', path: '/fix-subtitles' },
  { name: 'Burn Subtitles', path: '/burn-subtitles' },
  { name: 'Compress Video', path: '/compress-video' },
  { name: 'Batch Processing', path: '/batch-process' },
]

const freeTools = [
  { name: 'SRT → VTT Converter', path: '/tools/srt-to-vtt' },
  { name: 'VTT → SRT Converter', path: '/tools/vtt-to-srt' },
  { name: 'SBV → SRT Converter', path: '/tools/sbv-to-srt' },
  { name: 'SRT → SBV Converter', path: '/tools/srt-to-sbv' },
  { name: 'ASS / SSA → SRT', path: '/tools/ass-to-srt' },
  { name: 'TTML → SRT Converter', path: '/tools/ttml-to-srt' },
  { name: 'Shift Subtitle Timing', path: '/tools/shift-subtitle-timing' },
  { name: 'Merge SRT Files', path: '/tools/merge-srt-files' },
  { name: 'Subtitle Validator', path: '/tools/subtitle-validator' },
  { name: 'Reading Speed Checker', path: '/tools/subtitle-reading-speed' },
  { name: 'Script Timer', path: '/tools/video-script-timer' },
  { name: 'Timestamp Converter', path: '/tools/timestamp-converter' },
  { name: 'Subtitle Tools Hub', path: '/subtitle-tools' },
  { name: 'Subtitle Resources', path: '/subtitle-resources' },
  { name: '→ All free tools', path: '/tools' },
]

export default function Navigation() {
  const { isFounder, loading } = useFounderStatus()
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false)
  const [freeToolsDropdownOpen, setFreeToolsDropdownOpen] = useState(false)
  // Re-render when login state changes so Login/Signup show on all pages when not logged in
  const [showAuthLinks, setShowAuthLinks] = useState(() => !isLoggedIn())
  useEffect(() => {
    setShowAuthLinks(!isLoggedIn())
  }, [])
  useEffect(() => {
    const onLoginOrLogout = () => setShowAuthLinks(!isLoggedIn())
    window.addEventListener('videotext:plan-updated', onLoginOrLogout)
    window.addEventListener('videotext:logout', onLoginOrLogout)
    return () => {
      window.removeEventListener('videotext:plan-updated', onLoginOrLogout)
      window.removeEventListener('videotext:logout', onLoginOrLogout)
    }
  }, [])

  return (
    <nav className="sticky top-0 z-[60] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 shadow-nav">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 w-full">
          {/* Brand: top left */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            onMouseEnter={() => prefetchRoute('/')}
            onFocus={() => prefetchRoute('/')}
          >
            <img src="/logo.svg" alt="VideoText" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-display font-semibold text-gray-800 dark:text-white">VideoText</span>
          </Link>

          {/* Top right: Login, Signup (when not logged in), Tools, Pricing, menu */}
          <div className="hidden md:flex items-center justify-end gap-6 lg:gap-8 shrink-0">
            {showAuthLinks && (
              <>
                <Link
                  to="/demo"
                  className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-motion text-sm font-semibold"
                  onMouseEnter={() => prefetchRoute('/demo')}
                  onFocus={() => prefetchRoute('/demo')}
                >
                  Try Demo
                </Link>
                <Link
                  to="/login"
                  className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion text-sm font-medium"
                  onMouseEnter={() => prefetchRoute('/login')}
                  onFocus={() => prefetchRoute('/login')}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion text-sm font-medium"
                  onMouseEnter={() => prefetchRoute('/signup')}
                  onFocus={() => prefetchRoute('/signup')}
                >
                  Signup
                </Link>
              </>
            )}

            <div
              className="relative"
              onMouseEnter={() => setToolsDropdownOpen(true)}
              onMouseLeave={() => setToolsDropdownOpen(false)}
            >
              <button className="flex items-center space-x-1 text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion">
                <span>Tools</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {toolsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated border border-gray-100 dark:border-gray-700 py-2"
                  >
                    {tools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-motion"
                        onMouseEnter={() => prefetchRoute(tool.path)}
                        onFocus={() => prefetchRoute(tool.path)}
                      >
                        {tool.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Free Tools dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFreeToolsDropdownOpen(true)}
              onMouseLeave={() => setFreeToolsDropdownOpen(false)}
            >
              <button className="flex items-center space-x-1 text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion text-sm font-medium">
                <span>Free Tools</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {freeToolsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated border border-gray-100 dark:border-gray-700 py-2"
                  >
                    <div className="px-4 py-1.5">
                      <span className="text-xs font-bold uppercase tracking-widest text-violet-500">No account needed</span>
                    </div>
                    {freeTools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className={`block px-4 py-2 text-sm hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-motion ${tool.path === '/tools' ? 'font-semibold text-violet-600 dark:text-violet-400 border-t border-gray-100 dark:border-gray-700 mt-1 pt-2' : 'text-gray-700 dark:text-gray-200'}`}
                        onMouseEnter={() => prefetchRoute(tool.path)}
                        onFocus={() => prefetchRoute(tool.path)}
                      >
                        {tool.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/blog"
              className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion text-sm font-medium"
              onMouseEnter={() => prefetchRoute('/blog')}
              onFocus={() => prefetchRoute('/blog')}
            >
              Blog
            </Link>

            <Link
              to="/pricing"
              className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion"
              onMouseEnter={() => prefetchRoute('/pricing')}
              onFocus={() => prefetchRoute('/pricing')}
            >
              Pricing
            </Link>

            {!loading && isFounder && (
              <Link
                to="/founder"
                className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion text-sm font-medium"
                onMouseEnter={() => prefetchRoute('/founder')}
                onFocus={() => prefetchRoute('/founder')}
              >
                Founder
              </Link>
            )}

            <UserMenu />
          </div>

          {/* Mobile: only hamburger (UserMenu) */}
          <div className="md:hidden flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
