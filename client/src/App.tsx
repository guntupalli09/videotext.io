import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, getOrganizationJsonLd, getWebApplicationJsonLd } from './lib/seoMeta'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import VideoToTranscript from './pages/VideoToTranscript'
import VideoToSubtitles from './pages/VideoToSubtitles'
import BatchProcess from './pages/BatchProcess'
import TranslateSubtitles from './pages/TranslateSubtitles'
import FixSubtitles from './pages/FixSubtitles'
import BurnSubtitles from './pages/BurnSubtitles'
import CompressVideo from './pages/CompressVideo'

function AppSeo() {
  const { pathname } = useLocation()
  const meta = ROUTE_SEO[pathname] || ROUTE_SEO['/']
  const isHome = pathname === '/'
  return (
    <Seo
      title={meta.title}
      description={meta.description}
      canonicalPath={pathname}
      jsonLd={isHome ? [getOrganizationJsonLd(), getWebApplicationJsonLd()] : undefined}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppSeo />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main id="main" className="flex-grow" role="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<BatchProcess />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/compress-video" element={<CompressVideo />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
