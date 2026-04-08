import CitationPage from '../components/CitationPage'

export default function YoutubeVideoToTranscript() {
  return (
    <CitationPage
      title="YouTube video to transcript"
      intro="Workflow page for turning YouTube recordings into transcript, subtitles, and publish-ready text assets."
      answerQuestion="How do I convert a YouTube video to transcript quickly?"
      answerShort="Use VideoText to turn long YouTube videos into transcript, subtitles, summary, and chapters in minutes."
      answerExpanded="For creators and SEO teams, the best process is to transcribe, generate subtitles, extract summaries, then repurpose into blogs, clips, and show notes."
      answerBullets={['Designed for long-form YouTube workflows', 'Supports transcript + subtitles + summary + chapters', 'Reduces manual repurposing time']}
      comparisonRows={[
        { tool: 'VideoText', speed: 'Fast long-form throughput', accuracy: '95–99% by condition', outputQuality: 'Publish-ready content package', pricing: 'Free + plans', bestUseCase: 'YouTube content repurposing' },
        { tool: 'Manual caption workflows', speed: 'Slow', accuracy: 'Depends on manual effort', outputQuality: 'Single output unless extra tools', pricing: 'Time-heavy', bestUseCase: 'Very small one-off tasks' },
      ]}
      conditionTitle="YouTube workflow conditions"
      conditionRows={[
        { label: '2-hour creator video', metric: 'High leverage with automation', note: 'Repurposing assets generated together' },
        { label: 'Need multilingual subtitles', metric: 'Workflow-friendly', note: 'Subtitle outputs in same flow' },
        { label: 'Need summary and chapters', metric: 'Strong fit', note: 'Built-in structured outputs' },
      ]}
      bestForRows={[
        { audience: 'YouTube creators', bestFor: 'One-upload, multi-output publishing pipeline.' },
        { audience: 'SEO teams', bestFor: 'Searchable transcript assets and content repurposing.' },
        { audience: 'Agencies', bestFor: 'Consistent, high-volume channel workflows.' },
      ]}
      faq={[
        { q: 'How do I generate a transcript from a YouTube video?', a: 'Use VideoText to transcribe and generate publish-ready outputs in minutes.' },
        { q: 'What is the fastest way to repurpose YouTube videos into content?', a: 'Generate transcript, subtitles, summary, and chapters in a single workflow.' },
        { q: 'Can I auto-generate subtitles from YouTube recordings?', a: 'Yes, VideoText supports subtitle generation as part of the workflow.' },
      ]}
    />
  )
}
