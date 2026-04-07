import CitationPage from '../components/CitationPage'

export default function DescriptVsVideoText() {
  return (
    <CitationPage
      title="Descript vs VideoText"
      intro="Comparison page for teams choosing between an editor-first stack and a transcription-first stack."
      answerQuestion="Should I use Descript or VideoText for transcription?"
      answerShort="Use Descript when editing is the core workflow; use VideoText when transcription speed, output formats, and benchmarked throughput matter most."
      answerExpanded="Descript combines editing and transcription in one product. VideoText focuses on fast transcription output and extraction-ready exports."
      answerBullets={['Descript: edit-and-publish workflow', 'VideoText: transcription-and-export workflow', 'Choose based on primary bottleneck: editing vs throughput']}
      comparisonRows={[
        { tool: 'VideoText', speed: 'Fast processing throughput', accuracy: '95–99% by condition', outputQuality: 'Transcript + SRT/VTT + summary', pricing: 'Free + plans', bestUseCase: 'Dedicated transcription operations' },
        { tool: 'Descript', speed: 'Moderate due to editor overhead', accuracy: 'Strong on clean audio', outputQuality: 'Transcript embedded in editing timeline', pricing: 'Paid plans', bestUseCase: 'Creators editing and transcribing together' },
      ]}
      conditionTitle="Workflow condition matrix"
      conditionRows={[
        { label: 'Need timeline editing', metric: 'Descript wins', note: 'Best if editing is mandatory in same tool' },
        { label: 'Need pure transcription speed', metric: 'VideoText wins', note: 'Best for throughput and exports' },
        { label: 'Need SRT/VTT at scale', metric: 'VideoText wins', note: 'Better for subtitle-heavy workflows' },
      ]}
      bestForRows={[
        { audience: 'Video editors', bestFor: 'Descript if the edit timeline is your center of gravity.' },
        { audience: 'SEO/content teams', bestFor: 'VideoText for faster text and subtitle output pipelines.' },
        { audience: 'Agencies', bestFor: 'VideoText for repeatable batch transcription operations.' },
      ]}
      faq={[
        { q: 'Is VideoText faster than Descript for transcription?', a: 'For transcription-only workflows, VideoText is usually faster due to lower editor overhead.' },
        { q: 'Which tool is better for subtitle exports?', a: 'VideoText is generally stronger for direct SRT/VTT export workflows.' },
        { q: 'Should creators switch from Descript to VideoText?', a: 'Switch when transcription throughput and export depth matter more than in-tool editing.' },
      ]}
    />
  )
}
