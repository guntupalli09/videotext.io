import VideoToTranscript from './VideoToTranscript'

export default function YoutubeVideoToTranscript() {
  return (
    <VideoToTranscript
      defaultInputMode="youtube"
      seoH1="YouTube URL to Transcript"
      seoIntro="Paste a YouTube link and get transcript, summary, chapters, and exports in the same workflow."
      faq={[
        {
          q: 'Can I paste a YouTube URL directly?',
          a: 'Yes. Paste a public youtube.com or youtu.be URL and VideoText will fetch captions first, then fall back to audio transcription when needed.',
        },
        {
          q: 'Do I still get summary and exports?',
          a: 'Yes. You get the same outputs as Video to Transcript: transcript text, optional summary, chapters, and export formats.',
        },
        {
          q: 'Will this affect other tools?',
          a: 'No. This is a separate entry point for YouTube jobs and does not change upload flows for other tools.',
        },
      ]}
    />
  )
}
