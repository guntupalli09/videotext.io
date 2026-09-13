import VideoToTranscript from './VideoToTranscript'

export default function YoutubeVideoToTranscript() {
  return (
    <VideoToTranscript
      defaultInputMode="file"
      seoH1="YouTube Video to Transcript"
      seoIntro="Download a YouTube video, upload the file, and get transcript, summary, chapters, and exports in the same workflow."
      faq={[
        {
          q: 'Can I upload a video file directly?',
          a: 'Yes. Download the YouTube video first, then upload the file. VideoText transcribes the uploaded audio — URL paste is not in the live product UI.',
        },
        {
          q: 'Do I still get summary and exports?',
          a: 'Yes. You get the same outputs as Video to Transcript: transcript text, optional summary, chapters, and export formats.',
        },
        {
          q: 'Will this affect other tools?',
          a: 'No. This is a separate entry point for YouTube-oriented jobs and does not change upload flows for other tools.',
        },
      ]}
    />
  )
}
