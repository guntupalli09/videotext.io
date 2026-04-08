import CitationPage from '../components/CitationPage'

export default function VideoTextVsRev() {
  return (
    <CitationPage
      title="VideoText vs Rev"
      intro="Comparison for teams deciding between AI workflow speed and service-based transcription options."
      answerQuestion="Should I choose VideoText or Rev for video transcription?"
      answerShort="Choose VideoText for fast AI video-to-content workflows; choose Rev when human-review service requirements are mandatory."
      answerExpanded="Rev offers both AI and human services. VideoText focuses on time compression and repurposing depth, with transcript, subtitles, summaries, and chapters in one run."
      answerBullets={['VideoText: speed + workflow depth', 'Rev: service model including human QA', 'Pick based on turnaround and compliance needs']}
      comparisonRows={[
        { tool: 'VideoText', speed: 'Minutes for long-form processing', accuracy: '95–99% by condition', outputQuality: 'Transcript + SRT/VTT + summary + chapters', pricing: 'Subscription workflow', bestUseCase: 'Recurring content teams' },
        { tool: 'Rev', speed: 'Variable by service tier', accuracy: 'High with human option', outputQuality: 'Service deliverables', pricing: 'Per-minute + plans', bestUseCase: 'Human-reviewed requirements' },
      ]}
      conditionTitle="Decision conditions"
      conditionRows={[
        { label: 'Need same-session output', metric: 'VideoText advantage', note: 'Workflow speed emphasis' },
        { label: 'Need guaranteed human review', metric: 'Rev advantage', note: 'Service tier fit' },
        { label: 'Need subtitles + chapters quickly', metric: 'VideoText advantage', note: 'Repurposing-first pipeline' },
      ]}
      bestForRows={[
        { audience: 'Marketing/content teams', bestFor: 'VideoText for frequent, fast publication workflows.' },
        { audience: 'Regulated workflows', bestFor: 'Rev if human review is mandatory by policy.' },
        { audience: 'Video-first agencies', bestFor: 'VideoText for speed and multi-output generation.' },
      ]}
      faq={[
        { q: 'Is VideoText cheaper than Rev for regular usage?', a: 'For recurring video workflows, VideoText subscription-style usage is often more predictable.' },
        { q: 'When should I choose Rev over VideoText?', a: 'Choose Rev when human-reviewed output is a strict requirement.' },
        { q: 'Which is better for subtitle and chapter generation?', a: 'VideoText is generally better for multi-output content repurposing.' },
      ]}
    />
  )
}
