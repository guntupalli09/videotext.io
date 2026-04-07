import { Link } from 'react-router-dom'
import { getPopularFooterLinks } from '../lib/seoRegistry'

export default function Footer() {
  const popularLinks = getPopularFooterLinks()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.svg" alt="VideoText" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-semibold text-white">VideoText</span>
            </div>

            <p className="text-sm text-gray-300">
              Turn speech into text: transcripts, subtitles, translation. For creators & teams. We don’t store your data.
            </p>

            {/* LaunchBoosts Badge */}
            <a
              href="https://launchboosts.com/project/videotext"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-4"
              aria-label="Featured on LaunchBoosts"
            >
              <img
                src="https://launchboosts.com/badges/featured-dark.svg"
                alt="Featured on LaunchBoosts"
                width={180}
                height={54}
              />
            </a>

            {/* IndieHunt Badge */}
            <a
              href="https://indiehunt.io/project/videotext"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-3"
              aria-label="Featured on IndieHunt"
            >
              <img
                src="https://indiehunt.io/badges/indiehunt-badge-dark.svg"
                alt="Featured on IndieHunt"
                width={265}
                height={58}
              />
            </a>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">All tools</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/guide" className="hover:text-white transition-colors">Guide</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/compare" className="hover:text-white transition-colors">Compare tools</Link></li>
              <li><Link to="/open" className="hover:text-white transition-colors">Open stats</Link></li>
              <li><Link to="/transcription-benchmark" className="hover:text-white transition-colors">Transcription benchmark</Link></li>
              <li><Link to="/accuracy-test" className="hover:text-white transition-colors">Accuracy test</Link></li>
              <li><Link to="/best-transcription-tool" className="hover:text-white transition-colors">Best transcription tool</Link></li>
              <li><Link to="/fastest-transcription-software" className="hover:text-white transition-colors">Fastest transcription software</Link></li>
              <li><Link to="/otter-vs-videotext" className="hover:text-white transition-colors">Otter vs VideoText</Link></li>
              <li><Link to="/descript-vs-videotext" className="hover:text-white transition-colors">Descript vs VideoText</Link></li>
              <li><Link to="/ai-transcription-tools" className="hover:text-white transition-colors">AI transcription tools</Link></li>
              <li><Link to="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Alternatives */}
          <div>
            <h3 className="text-white font-semibold mb-4">Alternatives</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/descript-alternative" className="hover:text-white transition-colors">Descript alternative</Link></li>
              <li><Link to="/otter-ai-alternative" className="hover:text-white transition-colors">Otter.ai alternative</Link></li>
              <li><Link to="/trint-alternative" className="hover:text-white transition-colors">Trint alternative</Link></li>
              <li><Link to="/rev-alternative" className="hover:text-white transition-colors">Rev alternative</Link></li>
              <li><Link to="/happyscribe-alternative" className="hover:text-white transition-colors">HappyScribe alternative</Link></li>
              <li><Link to="/sonix-alternative" className="hover:text-white transition-colors">Sonix alternative</Link></li>
              <li><Link to="/easyscribe-alternative" className="hover:text-white transition-colors">EasyScribe alternative</Link></li>
              <li><Link to="/notta-alternative" className="hover:text-white transition-colors">Notta alternative</Link></li>
              <li><Link to="/tactiq-alternative" className="hover:text-white transition-colors">Tactiq alternative</Link></li>
              <li><Link to="/subly-alternative" className="hover:text-white transition-colors">Subly alternative</Link></li>
            </ul>
          </div>

          {/* Product & resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product & resources</h3>
            <ul className="space-y-2 text-sm">
              {popularLinks.map(({ path, label }) => (
                <li key={path}>
                  <Link to={path} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('videotext:open-feedback'))}
                  className="text-left hover:text-white transition-colors"
                >
                  Feedback
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} VideoText. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}