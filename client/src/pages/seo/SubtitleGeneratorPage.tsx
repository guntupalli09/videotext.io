/**
 * SEO entry point: /subtitle-generator
 * Reuses the same tool as /video-to-subtitles. Do NOT duplicate upload, polling, or API logic here.
 */
import VideoToSubtitles from '../VideoToSubtitles'

const FAQ = [
  {
    q: 'What is a subtitle generator?',
    a: 'It creates timed subtitle files (SRT or VTT) from video by transcribing speech and aligning text to timestamps. You upload a video and download captions.',
  },
  {
    q: 'Which formats can I get?',
    a: 'SRT (best for YouTube and most apps) and VTT (for web players). Both are generated from the same upload.',
  },
  {
    q: 'Do I need to sign up?',
    a: 'No. The free tier works without signup. Create an account or upgrade when you need more minutes or extra features like multi-language output.',
  },
]

export default function SubtitleGeneratorPage() {
  return (
    <VideoToSubtitles
      seoH1="Subtitle Generator Online"
      seoIntro="Generate subtitles from video in one click. Upload any video, get SRT or VTT with accurate timestamps. Fast and free tier available."
      faq={FAQ}
    />
  )
}
