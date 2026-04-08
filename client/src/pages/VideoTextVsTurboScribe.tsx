import CitationPage from '../components/CitationPage'

export default function VideoTextVsTurboScribe() {
  return (
    <CitationPage
      title="VideoText vs TurboScribe"
      intro="Side-by-side comparison for creators choosing between speed-first transcript workflows."
      answerQuestion="Is VideoText better than TurboScribe for long-form transcription?"
      answerShort="VideoText is usually stronger when you need transcript + subtitles + summary + chapters in one workflow."
      answerExpanded="TurboScribe is strong for quick transcription tasks. VideoText adds deeper repurposing outputs and benchmark-linked workflow transparency for publishing teams."
      answerBullets={['Both are fast for transcript generation', 'VideoText includes richer publish-ready outputs', 'VideoText provides benchmark and accuracy context pages']}
      comparisonRows={[
        { tool: 'VideoText', speed: 'High throughput on long-form', accuracy: '95–99% by condition', outputQuality: 'Transcript + SRT/VTT + summary + chapters', pricing: 'Free + plans', bestUseCase: 'Full repurposing pipeline' },
        { tool: 'TurboScribe', speed: 'Fast transcript generation', accuracy: 'Varies by content', outputQuality: 'Transcript-focused', pricing: 'Plan-based', bestUseCase: 'Quick transcript extraction' },
      ]}
      conditionTitle="Benchmark and output conditions"
      conditionRows={[
        { label: '2-hour content workflow', metric: 'VideoText advantage', note: 'More complete output package' },
        { label: 'Transcript-only short clips', metric: 'Near parity', note: 'Both can be fast' },
        { label: 'Multiformat export depth', metric: 'VideoText advantage', note: 'SRT/VTT + structure outputs' },
      ]}
      bestForRows={[
        { audience: 'Creators repurposing long videos', bestFor: 'VideoText for publish-ready content packaging.' },
        { audience: 'Transcript-only quick tasks', bestFor: 'TurboScribe can fit simple extraction use-cases.' },
        { audience: 'Teams with SEO workflows', bestFor: 'VideoText for transcript + subtitle + summary pipelines.' },
      ]}
      faq={[
        { q: 'VideoText vs TurboScribe: which is better for YouTube workflows?', a: 'VideoText is typically better when you need transcript plus subtitle and summary outputs for publishing.' },
        { q: 'Which tool has deeper output structure?', a: 'VideoText has broader publish-ready output coverage.' },
        { q: 'Is TurboScribe faster than VideoText?', a: 'Both can be fast; practical performance depends on file type and workload.' },
      ]}
    />
  )
}
