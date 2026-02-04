/**
 * SEO entry point: /mp4-to-text
 * Reuses the same tool as /video-to-transcript. Do NOT duplicate upload, polling, or API logic here.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  {
    q: 'Can I convert MP4 to text?',
    a: 'Yes. Upload your MP4 file and we extract the spoken audio as text. MP4, MOV, AVI, WebM, and MKV are all supported.',
  },
  {
    q: 'How long does it take?',
    a: 'Most videos are transcribed in 30–60 seconds. Queue position is shown while your job is processing.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'Large files are supported; check the upload zone for the current limit. You can also trim the video to a segment before transcribing.',
  },
  {
    q: 'Can I translate the transcript?',
    a: 'Yes. After transcribing, click Translate and choose English, Hindi, Telugu, Spanish, Chinese, or Russian to view the transcript in that language.',
  },
]

export default function Mp4ToTextPage() {
  return (
    <VideoToTranscript
      seoH1="MP4 to Text Online"
      seoIntro="Convert MP4 video to text online. Upload your MP4, get an accurate transcript, then view it in Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. No signup for free tier."
      faq={FAQ}
    />
  )
}
