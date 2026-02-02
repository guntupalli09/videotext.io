/**
 * SEO entry point: /video-to-text
 * Reuses the same tool as /video-to-transcript. Do NOT duplicate upload, polling, or API logic here.
 */
import VideoToTranscript from '../VideoToTranscript'

const FAQ = [
  {
    q: 'What video formats are supported?',
    a: 'We support MP4, MOV, AVI, WebM, and MKV. Upload your file and get a plain-text transcript in seconds.',
  },
  {
    q: 'Is the transcript accurate?',
    a: 'Yes. We use AI speech recognition to transcribe speech accurately. You can trim the video before processing to focus on the part you need.',
  },
  {
    q: 'Can I copy the transcript?',
    a: 'Yes. After processing, you can download the transcript file or copy the text to your clipboard from the preview.',
  },
]

export default function VideoToTextPage() {
  return (
    <VideoToTranscript
      seoH1="Video to Text Online"
      seoIntro="Turn any video into text in seconds. Upload a video, get a plain-text transcript. No signup required for the free tier."
      faq={FAQ}
    />
  )
}
