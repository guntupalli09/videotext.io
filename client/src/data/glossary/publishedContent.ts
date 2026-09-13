import type { GlossaryPublishedContent } from './types'

const D = '2026-09-13'

export const PUBLISHED_GLOSSARY_CONTENT: Record<string, GlossaryPublishedContent> = {
  transcription: {
    slug: 'transcription',
    h1: 'What Is Transcription?',
    definition: 'Transcription is the conversion of spoken words in audio or video into written text. A transcript may be plain text or include timestamps, speaker labels, and notes about inaudible or overlapping speech.',
    metaTitle: 'What Is Transcription? Definition, Types & Uses',
    metaDescription: 'Transcription is speech converted to text. Learn verbatim vs clean verbatim, how ASR fits, and how transcripts differ from captions and subtitles.',
    takeaways: [
      'Transcription produces a readable text record of speech — not necessarily timed captions.',
      'Verbatim and clean-verbatim transcripts follow different style rules.',
      'Automatic speech recognition can draft a transcript; humans still review names, overlap, and formatting.',
    ],
    sections: [
      {
        heading: 'How transcription works',
        paragraphs: [
          'A transcriber or a speech-recognition system listens to an audio track, decides what words were spoken, and writes them in order. Optional extras include speaker labels, timestamps, and tags such as [inaudible].',
          'In a video workflow the audio is usually extracted first, then recognized, then formatted. VideoText’s video-to-transcript path follows that order: extract audio, run speech recognition, then offer a transcript plus optional subtitle files.',
        ],
      },
      {
        heading: 'Why transcription matters',
        paragraphs: [
          'A transcript makes speech searchable, quotable, and readable without playing the media. It is also the source file many teams later turn into captions or translations.',
          'Accessibility is one reason, not the only one. Journalists, researchers, students, and editors use transcripts to review what was said without scrubbing a timeline.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['A 40-minute interview exported as a timestamped transcript lets an editor jump to “00:18:12” instead of relistening to the whole file.'],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: [
          'A transcript is not automatically a caption file. Captions and subtitles add timing and display rules so the text can appear on screen. You can make captions from a transcript, but the two deliverables are not the same.',
        ],
      },
      {
        heading: 'Transcription vs speech-to-text',
        paragraphs: [
          'Speech-to-text is the technical process of mapping audio to words. Transcription is the resulting document and the editorial rules applied to it. Everyday usage overlaps; the distinction matters when a client specifies verbatim style or speaker labels.',
        ],
      },
    ],
    faqs: [
      { q: 'Is transcription the same as captioning?', a: 'No. Transcription is the text record. Captioning adds timing and on-screen presentation for viewers who cannot or do not hear the audio.' },
      { q: 'Can software replace a human transcript?', a: 'Automatic speech recognition can produce a strong first draft on clean audio. Names, overlap, punctuation, and style-guide rules still need a review pass for delivery-quality work.' },
    ],
    relatedTerms: ['speech-to-text', 'automatic-speech-recognition', 'verbatim-transcription', 'clean-verbatim', 'word-error-rate', 'speaker-diarization'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Turn a video into a transcript' }],
    sources: [
      { organization: 'W3C', title: 'Making Audio and Video Media Accessible', url: 'https://www.w3.org/WAI/media/av/' },
      { organization: 'WebAIM', title: 'Captions, Transcripts, and Audio Descriptions', url: 'https://webaim.org/techniques/captions/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'automatic-speech-recognition': {
    slug: 'automatic-speech-recognition',
    h1: 'What Is Automatic Speech Recognition (ASR)?',
    definition: 'Automatic speech recognition (ASR) is software that maps an audio waveform to text without a human typing every word. Modern ASR systems are statistical or neural models trained on large collections of speech and transcripts.',
    metaTitle: 'What Is Automatic Speech Recognition (ASR)?',
    metaDescription: 'ASR is software that turns speech into text. Learn how it relates to transcription, WER, and models such as Whisper.',
    takeaways: [
      'ASR is the engine; a transcript is the document it helps produce.',
      'Accuracy is condition-specific. Clean read speech is not the same as a noisy meeting.',
      'Word error rate is the usual research metric, not a consumer “percent accurate” slogan.',
    ],
    sections: [
      {
        heading: 'How ASR works',
        paragraphs: [
          'An ASR system converts sound into features, then predicts a sequence of tokens or words. Training data and decoding rules determine how it handles accents, noise, and punctuation.',
          'The 2022 Whisper paper showed that a model trained on 680,000 hours of weakly labeled web audio can be evaluated zero-shot on public test sets. That is a research result, not a promise about every real recording.',
        ],
      },
      {
        heading: 'Why ASR matters',
        paragraphs: [
          'ASR makes it practical to draft transcripts and captions for long media. It does not, by itself, guarantee an accessible caption file. Organizations in 3Play’s 2024 survey still treated unedited automatic captions as insufficient.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['The same Whisper Large V2 checkpoint scored 2.7% WER on LibriSpeech Clean and 25.5% WER on CHiME-6 in the authors’ table — one model, two very different conditions.'],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: ['“ASR accuracy” is not a single number. Always ask: which dataset, which language, which microphone, how many speakers, and was the text normalized?'],
      },
    ],
    faqs: [
      { q: 'Is ASR the same as transcription?', a: 'ASR is the recognition step. Transcription also includes formatting, speaker labels, and any human review.' },
    ],
    relatedTerms: ['speech-to-text', 'transcription', 'word-error-rate', 'speech-recognition-model', 'hallucination', 'confidence-score'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Transcribe video with speech recognition' }],
    sources: [
      { organization: 'OpenAI', title: 'Robust Speech Recognition via Large-Scale Weak Supervision', url: 'https://arxiv.org/abs/2212.04356' },
      { organization: 'W3C', title: 'Speech Recognition (MDN overview of the Web Speech API concept)', url: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'speech-to-text': {
    slug: 'speech-to-text',
    h1: 'What Is Speech-to-Text?',
    definition: 'Speech-to-text is the process of converting spoken language into written words. The phrase describes the technical mapping from audio to text and is often used interchangeably with automatic speech recognition.',
    metaTitle: 'What Is Speech-to-Text? Definition vs Transcription',
    metaDescription: 'Speech-to-text converts spoken audio into words. See how it differs from a finished transcript and from on-screen captions.',
    takeaways: [
      'Speech-to-text is the conversion step; transcription is the finished text product.',
      'VideoText’s /speech-to-text page is a product workflow. This page only defines the term.',
      'Output may still need punctuation, speakers, and a quality pass.',
    ],
    sections: [
      {
        heading: 'How speech-to-text works',
        paragraphs: [
          'Audio is captured from a file, a microphone, or a video soundtrack. A recognition model predicts words. Some systems add punctuation restoration or speaker labels in a second stage.',
        ],
      },
      {
        heading: 'Why the term matters',
        paragraphs: [
          'People searching “speech to text” often want a tool. The definition still matters: if you need a client-ready transcript, speech-to-text is the draft engine, not the entire job.',
        ],
      },
      {
        heading: 'Speech-to-text vs captions',
        paragraphs: [
          'Speech-to-text does not automatically create a caption file. Captions need cue timing, line length, and reading-speed limits before they are safe to publish on screen.',
        ],
      },
    ],
    relatedTerms: ['automatic-speech-recognition', 'transcription', 'punctuation-restoration', 'closed-captions'],
    relatedTools: [
      { path: '/video-to-transcript', label: 'Video to transcript' },
      { path: '/speech-to-text', label: 'Speech-to-text workflow' },
    ],
    sources: [
      { organization: 'W3C WAI', title: 'Making Audio and Video Media Accessible', url: 'https://www.w3.org/WAI/media/av/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'verbatim-transcription': {
    slug: 'verbatim-transcription',
    h1: 'What Is Verbatim Transcription?',
    definition: 'Verbatim transcription records speech as spoken, including fillers, false starts, and repetitions, according to a stated style guide. “Verbatim” is not one universal standard — clients specify full verbatim or clean verbatim.',
    metaTitle: 'What Is Verbatim Transcription?',
    metaDescription: 'Verbatim transcription captures speech as spoken. Learn how full verbatim and clean verbatim differ, and when each is used.',
    takeaways: [
      'Ask whether the client wants full verbatim or clean verbatim.',
      'Marketplace style guides (Rev, GoTranscript, and others) define the details.',
      'ASR drafts are rarely delivery-ready verbatim without a review pass.',
    ],
    sections: [
      {
        heading: 'How verbatim work is specified',
        paragraphs: [
          'A style guide says whether to keep um/uh, stutters, nonverbal sounds, and exact repetitions. Without that spec, two transcribers will disagree on the same recording.',
        ],
      },
      {
        heading: 'Why it matters',
        paragraphs: [
          'Legal, qualitative research, and some journalism jobs need the mess of real speech. Training videos and blog-ready notes usually do not.',
        ],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: [
          'Calling a lightly edited transcript “verbatim” is a common delivery error. If fillers were removed, it is clean verbatim or edited text — say so.',
        ],
      },
    ],
    relatedTerms: ['clean-verbatim', 'full-verbatim', 'transcription-qa', 'transcription'],
    relatedTools: [{ path: '/guideline-format', label: 'Format a transcript to a client style guide' }],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide (verbatim rules)', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'clean-verbatim': {
    slug: 'clean-verbatim',
    h1: 'What Is Clean Verbatim?',
    definition: 'Clean verbatim is a transcript style that preserves meaning and sentence structure but removes fillers, false starts, and obvious stutters. It is more readable than full verbatim and still closer to the speaker than a rewritten summary.',
    metaTitle: 'What Is Clean Verbatim Transcription?',
    metaDescription: 'Clean verbatim keeps the speaker’s words but drops fillers and false starts. See how it differs from full verbatim.',
    takeaways: [
      'Clean verbatim is an editorial style, not a different ASR model.',
      'Do not silently rewrite sentences; remove noise, keep wording.',
      'Confirm the client’s style guide before deleting “um.”',
    ],
    sections: [
      {
        heading: 'How clean verbatim works',
        paragraphs: [
          'The transcriber (or a reviewer after ASR) deletes specified noise tokens and may tidy obvious restarts, while leaving vocabulary and clause order intact.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['Spoken: “I, I just — um — I think we should ship Friday.” Clean verbatim: “I think we should ship Friday.” Full verbatim would keep the restart and the filler.'],
      },
      {
        heading: 'Clean verbatim vs full verbatim',
        paragraphs: [
          'Full verbatim is for evidence of how something was said. Clean verbatim is for a readable record of what was said. VideoText’s guideline formatter exists to apply those rule sets after the words are captured — it does not invent a new verbatim standard.',
        ],
      },
    ],
    relatedTerms: ['full-verbatim', 'verbatim-transcription', 'transcription-qa'],
    relatedTools: [{ path: '/guideline-format', label: 'Apply clean-verbatim style rules' }],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'full-verbatim': {
    slug: 'full-verbatim',
    h1: 'What Is Full Verbatim?',
    definition: 'Full verbatim (sometimes called true verbatim) records speech with fillers, stutters, repetitions, and often nonverbal sounds, following the client’s notation rules. It is used when how something was said is part of the evidence.',
    metaTitle: 'What Is Full Verbatim Transcription?',
    metaDescription: 'Full verbatim keeps fillers, restarts, and specified nonverbal sounds. Learn when it is required and how it differs from clean verbatim.',
    takeaways: [
      'Full verbatim is slower to read and more expensive to produce.',
      'Notation for [laughs] or [inaudible] must match the style guide.',
      'ASR output is a poor substitute for specified full-verbatim delivery.',
    ],
    sections: [
      {
        heading: 'When full verbatim is used',
        paragraphs: [
          'Qualitative interviews, some legal and disciplinary recordings, and user-research playback sessions often require it. Marketing transcripts almost never do.',
        ],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: [
          'Full verbatim is not “type every breath.” Style guides still drop coughs or specify brackets. Read the guide; do not invent symbols.',
        ],
      },
    ],
    relatedTerms: ['clean-verbatim', 'verbatim-transcription', 'overlapping-speech'],
    relatedTools: [{ path: '/guideline-format', label: 'Check verbatim rules before delivery' }],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'word-error-rate': {
    slug: 'word-error-rate',
    h1: 'What Is Word Error Rate (WER)?',
    definition: 'Word error rate (WER) is the standard research metric for speech recognition. It counts substitutions, deletions, and insertions against a reference transcript, then divides by the number of words in that reference.',
    metaTitle: 'What Is Word Error Rate (WER)?',
    metaDescription: 'WER measures ASR mistakes as (S + D + I) / N. Learn why a 2.5% LibriSpeech score is not a real-world accuracy promise.',
    takeaways: [
      'WER = (substitutions + deletions + insertions) / reference words.',
      'Lower is better. WER can exceed 100% if the system inserts many extra words.',
      'Always name the dataset and text-normalization rules next to a WER figure.',
    ],
    sections: [
      {
        heading: 'How WER is computed',
        paragraphs: [
          'Align the hypothesis to the reference with an edit distance. Each wrong word, missing word, or extra word is an error. Divide by N, the reference word count.',
        ],
      },
      {
        heading: 'Why WER matters',
        paragraphs: [
          'It lets researchers compare systems on the same audio and the same reference. The Whisper paper reports many WERs so readers can see robustness, not just LibriSpeech Clean.',
        ],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: [
          'Converting WER to “percent accurate” (100 − WER) hides insertions and treats every word as equal. A 2.5% WER on clean audiobooks does not mean 97.5% accurate captions on a Zoom call.',
        ],
      },
    ],
    faqs: [
      { q: 'Is VideoText’s 2.52% pilot the same as Whisper’s 2.5%?', a: 'No. The VideoText research page reports a small Phase 1 pilot on Whisper small. The Whisper paper’s 2.5% figure is a different model and evaluation. Do not average them.' },
    ],
    relatedTerms: ['character-error-rate', 'transcription-accuracy', 'automatic-speech-recognition', 'hallucination'],
    relatedTools: [{ path: '/research/transcription-accuracy-benchmark-2026', label: 'VideoText WER pilot (first-party)' }],
    sources: [
      { organization: 'OpenAI', title: 'Whisper paper (WER tables)', url: 'https://cdn.openai.com/papers/whisper.pdf' },
      { organization: 'VideoText', title: 'AI Transcription Accuracy Benchmark — Phase 1', url: 'https://videotext.io/research/transcription-accuracy-benchmark-2026' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'transcription-accuracy': {
    slug: 'transcription-accuracy',
    h1: 'What Is Transcription Accuracy?',
    definition: 'Transcription accuracy is how closely a transcript matches what was said, under a stated definition of “match.” Researchers usually report word error rate. Clients may mean names, numbers, and style-guide compliance instead.',
    metaTitle: 'What Is Transcription Accuracy?',
    metaDescription: 'Transcription accuracy is not one percentage. Learn WER, condition effects, and why marketing “98% accurate” claims need a dataset.',
    takeaways: [
      'Ask for the metric, the audio condition, and the sample.',
      'Names and numbers can be “wrong” even when WER looks low.',
      'VideoText product accuracy claims live on /open and the research page — not on this definition.',
    ],
    sections: [
      {
        heading: 'How accuracy is judged',
        paragraphs: [
          'Research: align to a reference and compute WER or CER. Delivery work: a reviewer checks speakers, proper nouns, and the requested verbatim level.',
        ],
      },
      {
        heading: 'Why condition matters',
        paragraphs: [
          'The Whisper paper’s Table 2 is the clearest public illustration: the same model’s WER ranges from a few percent on clean read speech to the mid-twenties or worse on noisy multi-speaker sets.',
        ],
      },
    ],
    relatedTerms: ['word-error-rate', 'confidence-score', 'transcription-qa', 'automatic-speech-recognition'],
    relatedTools: [
      { path: '/video-to-transcript', label: 'Create a transcript to review' },
      { path: '/research/transcription-accuracy-benchmark-2026', label: 'Read the open WER methodology' },
    ],
    sources: [
      { organization: 'OpenAI', title: 'Robust Speech Recognition via Large-Scale Weak Supervision', url: 'https://cdn.openai.com/papers/whisper.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'confidence-score': {
    slug: 'confidence-score',
    h1: 'What Is a Confidence Score in Speech Recognition?',
    definition: 'A confidence score is the recognizer’s own estimate that a word or segment is correct. It is not an independent accuracy measurement and is not comparable across vendors without a shared calibration study.',
    metaTitle: 'What Is an ASR Confidence Score?',
    metaDescription: 'A confidence score is the model’s self-estimate, not a verified WER. Learn how to use it in review workflows.',
    takeaways: [
      'High confidence can still be wrong, especially on names.',
      'Do not average confidence scores from different APIs.',
      'Use low-confidence spans as a review queue, not as a published accuracy rate.',
    ],
    sections: [
      {
        heading: 'How confidence is used',
        paragraphs: [
          'Some pipelines highlight low-confidence words for a human. That is a workflow heuristic. It does not replace word error rate on a labeled set.',
        ],
      },
      {
        heading: 'The thing people often get wrong',
        paragraphs: ['Reporting “average confidence 0.94” as “94% accurate” confuses a model’s softmax with measured error.'],
      },
    ],
    relatedTerms: ['word-error-rate', 'transcription-accuracy', 'transcription-qa'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Generate a transcript for review' }],
    sources: [
      { organization: 'NIST', title: 'Speech recognition evaluation concepts (Open Speech Analytic Technologies overview)', url: 'https://www.nist.gov/itl/iad/mig/open-speech-analytic-technologies' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'speaker-diarization': {
    slug: 'speaker-diarization',
    h1: 'What Is Speaker Diarization?',
    definition: 'Speaker diarization answers “who spoke when?” It segments audio into speaker turns and assigns labels such as Speaker 1 and Speaker 2. It does not, by itself, name those people.',
    metaTitle: 'What Is Speaker Diarization?',
    metaDescription: 'Speaker diarization labels who spoke when. Learn how it differs from speaker identification and why overlap is hard.',
    takeaways: [
      'Diarization produces anonymous speaker labels, not legal identities.',
      'Overlapping speech is a common failure mode.',
      'VideoText can attach speaker labels when diarization is enabled on a transcript job — confirm in the product UI; this page does not add features.',
    ],
    sections: [
      {
        heading: 'How diarization works',
        paragraphs: [
          'The system finds change points in the audio, clusters segments that sound like the same voice, and writes a label per turn. A later human pass can rename Speaker 2 to “Maya.”',
        ],
      },
      {
        heading: 'Why it matters',
        paragraphs: [
          'Interviews, meetings, and podcasts are hard to read as an unlabeled wall of text. Diarization is also a prerequisite for some caption styles that put a speaker name on each cue.',
        ],
      },
      {
        heading: 'Speaker diarization vs speaker identification',
        paragraphs: [
          'Identification matches a voice to a known person or enrollment profile. Diarization only separates voices in this recording. Teams often run diarization first, then rename labels.',
        ],
      },
    ],
    relatedTerms: ['speaker-identification', 'speaker-labels', 'overlapping-speech', 'transcription'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Transcribe with speaker labels' }],
    sources: [
      { organization: 'NIST', title: 'Speaker diarization evaluation (Rich Transcription / diarization literature hosted by NIST)', url: 'https://www.nist.gov/itl/iad/mig/rich-transcription-evaluation' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'speaker-identification': {
    slug: 'speaker-identification',
    h1: 'What Is Speaker Identification?',
    definition: 'Speaker identification matches a voice to a known person or a previously enrolled profile. It is a biometric or lookup task, not just splitting a file into Speaker 1 and Speaker 2.',
    metaTitle: 'What Is Speaker Identification?',
    metaDescription: 'Speaker identification names a known voice. It is different from diarization, which only separates unlabeled speakers.',
    takeaways: [
      'Identification needs a gallery or enrollment data.',
      'Diarization can run without knowing anyone’s name.',
      'VideoText’s labeled speakers are diarization-style labels unless a reviewer names them.',
    ],
    sections: [
      {
        heading: 'The thing people often get wrong',
        paragraphs: [
          'Product pages that say “identify speakers” often mean diarization. Ask whether the system knows the people in advance or only separates voices.',
        ],
      },
    ],
    relatedTerms: ['speaker-diarization', 'speaker-labels'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Create labeled speaker turns' }],
    sources: [
      { organization: 'NIST', title: 'Speaker Recognition Evaluation', url: 'https://www.nist.gov/itl/iad/mig/speaker-recognition' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'speaker-labels': {
    slug: 'speaker-labels',
    h1: 'What Are Speaker Labels?',
    definition: 'Speaker labels are the names or codes written next to each turn in a transcript — “Alex:”, “Speaker 2:”, or “Interviewer:”. They come from diarization, a human, or both.',
    metaTitle: 'What Are Speaker Labels in a Transcript?',
    metaDescription: 'Speaker labels mark who is talking in a transcript. Learn formatting conventions and how they relate to diarization.',
    takeaways: [
      'Pick one format and keep it consistent (name, role, or Speaker N).',
      'Style guides specify punctuation and whether labels sit on their own line.',
      'Wrong labels are a QA failure even if the words are right.',
    ],
    sections: [
      {
        heading: 'Example',
        paragraphs: ['Speaker 1: Did the export include VTT?\nSpeaker 2: Yes, and the SRT.'],
      },
    ],
    relatedTerms: ['speaker-diarization', 'transcription-qa', 'verbatim-transcription'],
    relatedTools: [
      { path: '/video-to-transcript', label: 'Generate a labeled transcript' },
      { path: '/guideline-format', label: 'Normalize speaker-label format' },
    ],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide (speaker labels)', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'overlapping-speech': {
    slug: 'overlapping-speech',
    h1: 'What Is Overlapping Speech?',
    definition: 'Overlapping speech is two or more people talking at the same time. It is one of the hardest conditions for automatic speech recognition and for diarization.',
    metaTitle: 'What Is Overlapping Speech?',
    metaDescription: 'Overlapping speech is simultaneous talk. Learn why WER and diarization degrade, and how transcripts mark it.',
    takeaways: [
      'Style guides often use [crosstalk] or parallel speaker lines.',
      'Distant-microphone meeting sets show much higher WER than headset audio.',
      'Do not pretend an ASR draft resolved overlap if the audio is unintelligible.',
    ],
    sections: [
      {
        heading: 'Why it is hard',
        paragraphs: [
          'Models trained mostly on single-speaker read speech under-represent overlap. The Whisper paper’s AMI distant-microphone WER (36.4% for Large V2) is a public reminder that meetings are not LibriSpeech.',
        ],
      },
    ],
    relatedTerms: ['speaker-diarization', 'word-error-rate', 'full-verbatim'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Draft a multi-speaker transcript' }],
    sources: [
      { organization: 'OpenAI', title: 'Whisper paper, AMI rows in Table 2', url: 'https://cdn.openai.com/papers/whisper.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'srt-file': {
    slug: 'srt-file',
    h1: 'What Is an SRT File?',
    definition: 'An SRT (SubRip) file is a plain-text subtitle format. Each cue has an index, a start and end timecode using comma milliseconds, one or two lines of text, and a blank line.',
    metaTitle: 'What Is an SRT File? Format and Example',
    metaDescription: 'SRT is the SubRip subtitle format: numbered cues, HH:MM:SS,mmm times, and plain text. See how it differs from WebVTT.',
    takeaways: [
      'SRT is widely supported by editors, YouTube, and most subtitle tools.',
      'Timestamps use a comma before milliseconds, not a dot.',
      'Creating an SRT from video is a workflow (/video-to-srt). This page only defines the file.',
    ],
    sections: [
      {
        heading: 'How an SRT cue is structured',
        paragraphs: ['A minimal cue looks like this:'],
        bullets: ['1', '00:00:01,000 --> 00:00:04,000', 'Welcome to the recording.', '(blank line)'],
      },
      {
        heading: 'Why SRT is common',
        paragraphs: [
          'It is simple to edit in any text editor and easy to validate. It does not natively carry the styling and region features of WebVTT or TTML.',
        ],
      },
      {
        heading: 'SRT vs WebVTT',
        paragraphs: [
          'WebVTT is a W3C format for HTML5 video. It uses a WEBVTT header and dot milliseconds. Convert, do not rename the extension, if a player expects VTT.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I just change .srt to .vtt?', a: 'No. VTT needs a header and usually dot milliseconds. Use a converter such as /tools/srt-to-vtt.' },
    ],
    relatedTerms: ['webvtt', 'caption-file', 'timecode', 'subtitle-synchronization'],
    relatedTools: [
      { path: '/video-to-srt', label: 'Create an SRT from video' },
      { path: '/how-to-create-srt-file', label: 'Step-by-step SRT guide' },
      { path: '/tools/srt-to-vtt', label: 'Convert SRT to WebVTT' },
    ],
    sources: [
      { organization: 'Matroska / SubRip community documentation', title: 'SRT subtitle format (widely documented cue layout)', url: 'https://matroska.org/technical/subtitles.html' },
      { organization: 'W3C', title: 'WebVTT: The Web Video Text Tracks Format', url: 'https://www.w3.org/TR/webvtt1/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  webvtt: {
    slug: 'webvtt',
    h1: 'What Is WebVTT?',
    definition: 'WebVTT (Web Video Text Tracks) is a W3C subtitle and caption format for HTML5 video. A file begins with WEBVTT and uses cues with start and end times, typically with dot milliseconds.',
    metaTitle: 'What Is WebVTT? VTT File Format Explained',
    metaDescription: 'WebVTT is the W3C text-track format for HTML5 video. Learn the header, cue timing, and how it differs from SRT.',
    takeaways: [
      'The first line must be WEBVTT.',
      'WebVTT can carry voice spans, regions, and comments that SRT cannot.',
      'Use a real converter between SRT and VTT.',
    ],
    sections: [
      {
        heading: 'How WebVTT works',
        paragraphs: [
          'A user agent (browser or player) parses the file as a text track, matches the current playback time to cues, and renders the cue text. The W3C Recommendation defines the syntax.',
        ],
      },
      {
        heading: 'Example',
        paragraphs: ['WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nWelcome to the recording.'],
      },
    ],
    relatedTerms: ['srt-file', 'ttml', 'closed-captions', 'caption-file'],
    relatedTools: [
      { path: '/tools/vtt-to-srt', label: 'Convert WebVTT to SRT' },
      { path: '/video-to-subtitles', label: 'Generate SRT or VTT from video' },
    ],
    sources: [
      { organization: 'W3C', title: 'WebVTT: The Web Video Text Tracks Format (W3C Recommendation)', url: 'https://www.w3.org/TR/webvtt1/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  ttml: {
    slug: 'ttml',
    h1: 'What Is TTML?',
    definition: 'TTML (Timed Text Markup Language) is a W3C XML format for timed text. Streaming and broadcast pipelines often use a constrained profile such as IMSC rather than unrestricted TTML.',
    metaTitle: 'What Is TTML? Timed Text Markup Language',
    metaDescription: 'TTML is W3C timed-text XML used in broadcast and streaming. Learn how it relates to IMSC, SRT, and WebVTT.',
    takeaways: [
      'TTML is XML, not a numbered plain-text cue list.',
      'Ask which profile (IMSC, EBU-TT) a platform requires.',
      'VideoText’s browser tool can convert TTML to SRT; that is conversion, not a claim that VideoText authors native IMSC packages.',
    ],
    sections: [
      {
        heading: 'Why profiles exist',
        paragraphs: [
          'Full TTML is large. Netflix, IMSC, and EBU profiles limit features so players can interoperate. Delivering “a TTML file” without the profile name is incomplete.',
        ],
      },
    ],
    relatedTerms: ['webvtt', 'srt-file', 'scc'],
    relatedTools: [{ path: '/tools/ttml-to-srt', label: 'Convert TTML to SRT' }],
    sources: [
      { organization: 'W3C', title: 'Timed Text Markup Language 2 (TTML2)', url: 'https://www.w3.org/TR/ttml2/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  scc: {
    slug: 'scc',
    h1: 'What Is an SCC File?',
    definition: 'SCC (Scenarist Closed Caption) is a file format that stores CEA-608 caption data as hexadecimal byte pairs with timecodes. It is common in North American broadcast and finishing workflows.',
    metaTitle: 'What Is an SCC File? CEA-608 Captions',
    metaDescription: 'SCC files hold CEA-608 closed-caption data for broadcast. Learn how they differ from SRT and WebVTT.',
    takeaways: [
      'SCC is caption data for 608/708 pipelines, not a casual subtitle edit format.',
      'Converting SCC to SRT loses channel and positioning information unless the tool maps it.',
      'Do not assume every “caption file” is SRT.',
    ],
    sections: [
      {
        heading: 'How SCC is used',
        paragraphs: [
          'Finishing tools encode pop-on or roll-up captions into 608 byte sequences. Players and broadcast encoders — not web <track> elements — are the usual consumers.',
        ],
      },
    ],
    relatedTerms: ['closed-captions', 'caption-file', 'ttml'],
    relatedTools: [{ path: '/video-to-subtitles', label: 'Create SRT/VTT captions from video' }],
    sources: [
      { organization: 'FCC', title: 'Closed captioning of televised video programming (47 CFR § 79.1)', url: 'https://www.law.cornell.edu/cfr/text/47/79.1' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'closed-captions': {
    slug: 'closed-captions',
    h1: 'What Are Closed Captions?',
    definition: 'Closed captions are timed text that can be turned on or off by the viewer. They encode the spoken words and, for accessibility captions, relevant non-speech sounds. They travel as a separate track, not painted into the picture.',
    metaTitle: 'What Are Closed Captions?',
    metaDescription: 'Closed captions are switchable timed text for dialogue and non-speech audio. See how they differ from open captions and subtitles.',
    takeaways: [
      'Closed means the viewer can toggle the track.',
      'U.S. television captioning is regulated in 47 C.F.R. § 79.1.',
      'The comparison of open vs closed captions already lives at /open-captions-vs-closed-captions.',
    ],
    sections: [
      {
        heading: 'Closed captions vs subtitles',
        paragraphs: [
          'In U.S. accessibility usage, captions assume the viewer cannot hear the audio and therefore include sound cues. Subtitles often assume the viewer can hear but needs another language. Everyday speech blurs the words; legal and broadcast documents do not.',
        ],
      },
      {
        heading: 'Why they matter',
        paragraphs: [
          'WHO estimates that more than 1.5 billion people live with some hearing loss. Captions are one of the practical ways video remains usable for that audience — and for anyone watching without sound.',
        ],
      },
    ],
    relatedTerms: ['open-captions', 'subtitles', 'sdh', 'caption-accessibility', 'webvtt'],
    relatedTools: [
      { path: '/video-to-subtitles', label: 'Generate caption files from video' },
      { path: '/open-captions-vs-closed-captions', label: 'Open vs closed captions (comparison)' },
    ],
    sources: [
      { organization: 'W3C WAI', title: 'Captions/Subtitles in Making Audio and Video Media Accessible', url: 'https://www.w3.org/WAI/media/av/captions/' },
      { organization: 'FCC', title: '47 CFR § 79.1', url: 'https://www.law.cornell.edu/cfr/text/47/79.1' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'open-captions': {
    slug: 'open-captions',
    h1: 'What Are Open Captions?',
    definition: 'Open captions are timed text burned into the video frames. Viewers cannot turn them off. They are also called hardcoded or burned-in captions.',
    metaTitle: 'What Are Open Captions?',
    metaDescription: 'Open captions are burned into the picture and cannot be toggled off. Compare with closed captions and burned-in subtitles.',
    takeaways: [
      'Open captions always display; closed captions are optional tracks.',
      'Burning in is a separate VideoText workflow from generating an SRT.',
      'Social platforms sometimes prefer open captions because auto-play is muted.',
    ],
    sections: [
      {
        heading: 'When open captions are used',
        paragraphs: [
          'Silent autoplay, venues without caption decoders, or a requirement that every viewer see the same words. The tradeoff is that you cannot restyle or translate the track without re-exporting the video.',
        ],
      },
    ],
    relatedTerms: ['closed-captions', 'subtitles', 'caption-file'],
    relatedTools: [
      { path: '/burn-subtitles', label: 'Burn subtitles into a video' },
      { path: '/open-captions-vs-closed-captions', label: 'Open vs closed captions' },
    ],
    sources: [
      { organization: 'W3C WAI', title: 'Captions/Subtitles', url: 'https://www.w3.org/WAI/media/av/captions/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  subtitles: {
    slug: 'subtitles',
    h1: 'What Are Subtitles?',
    definition: 'Subtitles are timed text shown with a video, usually as a toggleable track. In many locales they translate dialogue. In accessibility contexts the same file family also carries captions for viewers who cannot hear the audio.',
    metaTitle: 'What Are Subtitles? Definition vs Captions',
    metaDescription: 'Subtitles are timed on-screen text. Learn how the word differs from closed captions and from a transcript.',
    takeaways: [
      'A subtitle file is timed; a transcript may not be.',
      'Language subtitles and SDH/captions can share a format (SRT, WebVTT) with different content rules.',
      '/subtitles-vs-closed-captions is the on-site comparison page.',
    ],
    sections: [
      {
        heading: 'How subtitles are delivered',
        paragraphs: [
          'Soft subtitles travel as SRT, WebVTT, TTML, or similar. Open subtitles are burned in. Players map current time to the active cue.',
        ],
      },
    ],
    relatedTerms: ['closed-captions', 'srt-file', 'webvtt', 'forced-subtitles', 'sdh'],
    relatedTools: [
      { path: '/video-to-subtitles', label: 'Generate subtitles from video' },
      { path: '/translate-subtitles', label: 'Translate an SRT or VTT file' },
    ],
    sources: [
      { organization: 'W3C', title: 'WebVTT Recommendation', url: 'https://www.w3.org/TR/webvtt1/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  sdh: {
    slug: 'sdh',
    h1: 'What Is SDH?',
    definition: 'SDH means Subtitles for the Deaf and Hard of Hearing. An SDH track includes dialogue plus sound cues and speaker identification so viewers who cannot hear the audio still get that information.',
    metaTitle: 'What Is SDH? Subtitles for the Deaf and Hard of Hearing',
    metaDescription: 'SDH subtitles include dialogue, speakers, and non-speech sounds. See how SDH relates to closed captions.',
    takeaways: [
      'SDH is a content profile, not a file extension.',
      'The VideoText page /sdh-subtitles is the create-SDH workflow. This page is the definition.',
      'Sound effects belong in SDH/captions; they are usually omitted from translation-only subtitles.',
    ],
    sections: [
      {
        heading: 'SDH vs closed captions',
        paragraphs: [
          'In practice the content goals overlap. “Closed captions” describes how the track is toggled. “SDH” describes who the text is written for. A closed SDH track is common on discs and streaming stores.',
        ],
      },
    ],
    relatedTerms: ['closed-captions', 'subtitles', 'caption-accessibility', 'speaker-labels'],
    relatedTools: [{ path: '/sdh-subtitles', label: 'SDH subtitle workflow' }],
    sources: [
      { organization: 'W3C WAI', title: 'Captions/Subtitles', url: 'https://www.w3.org/WAI/media/av/captions/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'forced-subtitles': {
    slug: 'forced-subtitles',
    h1: 'What Are Forced Subtitles?',
    definition: 'Forced subtitles are cues that appear even when the viewer has subtitles turned off, typically for foreign-language lines, signs, or in-world text that the story requires everyone to read.',
    metaTitle: 'What Are Forced Subtitles?',
    metaDescription: 'Forced subtitles show selected lines — often foreign dialogue or signs — even when the main subtitle track is off.',
    takeaways: [
      'Forced tracks are a subset of cues, not a full translation.',
      'Naming conventions vary by platform (forced, forced narrative).',
      'They are not a substitute for SDH or closed captions.',
    ],
    sections: [
      {
        heading: 'Example',
        paragraphs: ['An English-language film leaves French radio chatter untranslated in the mix and uses a forced cue only for those lines.'],
      },
    ],
    relatedTerms: ['subtitles', 'closed-captions', 'localization'],
    relatedTools: [{ path: '/video-to-subtitles', label: 'Create a subtitle file you can trim to forced cues' }],
    sources: [
      { organization: 'W3C', title: 'WebVTT (timed text tracks in HTML)', url: 'https://www.w3.org/TR/webvtt1/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'caption-file': {
    slug: 'caption-file',
    h1: 'What Is a Caption File?',
    definition: 'A caption file is a timed-text document a player can load as a track — commonly SRT, WebVTT, TTML, or SCC. It stores cues, not the video pixels.',
    metaTitle: 'What Is a Caption File?',
    metaDescription: 'A caption file holds timed cues in SRT, WebVTT, TTML, SCC, or similar. Learn how it differs from a transcript and from burned-in text.',
    takeaways: [
      'The extension tells you the syntax, not whether the content is SDH or a translation.',
      'Validate timing and reading speed before delivery.',
      'Open captions are in the picture; they are not a caption file.',
    ],
    sections: [
      {
        heading: 'How caption files are used',
        paragraphs: [
          'Upload the sidecar to YouTube, a streaming packager, or an HTML5 <track> element. Fix-subtitles and translate-subtitles workflows in VideoText operate on these files, not on baked-in pixels.',
        ],
      },
    ],
    relatedTerms: ['srt-file', 'webvtt', 'ttml', 'scc', 'closed-captions'],
    relatedTools: [
      { path: '/fix-subtitles', label: 'Fix an SRT or VTT file' },
      { path: '/tools/subtitle-validator', label: 'Validate a caption file' },
    ],
    sources: [
      { organization: 'W3C', title: 'WebVTT', url: 'https://www.w3.org/TR/webvtt1/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'subtitle-synchronization': {
    slug: 'subtitle-synchronization',
    h1: 'What Is Subtitle Synchronization?',
    definition: 'Subtitle synchronization is the alignment of each cue’s start and end times with the spoken words (and any required shot changes). Out-of-sync cues appear too early, too late, or drift across the file.',
    metaTitle: 'What Is Subtitle Synchronization?',
    metaDescription: 'Subtitle sync means cue times match the audio. Learn offset, drift, and how fix-subtitles workflows differ from this definition.',
    takeaways: [
      'A constant offset is different from progressive drift.',
      'Frame-rate mismatches (23.976 vs 24, drop-frame vs non-drop) are a common cause.',
      '/fix-subtitles is the VideoText action page for repairing files.',
    ],
    sections: [
      {
        heading: 'How sync is checked',
        paragraphs: [
          'Play the video with the track enabled and sample cues at the beginning, middle, and end. A file that starts aligned and ends several seconds off has drift, not a one-time offset.',
        ],
      },
    ],
    relatedTerms: ['timecode', 'frame-rate', 'drop-frame-timecode', 'srt-file'],
    relatedTools: [
      { path: '/fix-subtitles', label: 'Fix subtitle timing' },
      { path: '/tools/shift-subtitle-timing', label: 'Shift every cue by a fixed offset' },
    ],
    sources: [
      { organization: 'W3C', title: 'WebVTT cue timing model', url: 'https://www.w3.org/TR/webvtt1/#timing' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  timecode: {
    slug: 'timecode',
    h1: 'What Is Timecode?',
    definition: 'Timecode is a numeric label for a position in media, usually hours:minutes:seconds plus frames or milliseconds. Transcripts and subtitle files both use timecode, but they may use different precision.',
    metaTitle: 'What Is Timecode? Transcripts vs Subtitles',
    metaDescription: 'Timecode marks a time position in media. Learn SRT commas, WebVTT dots, and how SMPTE frames differ from milliseconds.',
    takeaways: [
      'SRT uses HH:MM:SS,mmm. WebVTT typically uses HH:MM:SS.mmm.',
      'Broadcast tools often use HH:MM:SS:FF with a stated frame rate.',
      'Never mix drop-frame and non-drop-frame labels on the same project without converting.',
    ],
    sections: [
      {
        heading: 'How timecode is used in transcripts',
        paragraphs: [
          'A timestamped transcript might mark every speaker change or every 30 seconds. That is a navigation aid, not a broadcast caption track.',
        ],
      },
    ],
    relatedTerms: ['timestamp', 'smpte-timecode', 'frame-rate', 'srt-file'],
    relatedTools: [{ path: '/tools/timestamp-converter', label: 'Convert timestamp formats' }],
    sources: [
      { organization: 'Society of Motion Picture and Television Engineers', title: 'SMPTE ST 12-1 timecode family (overview via SMPTE)', url: 'https://www.smpte.org/standards' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'smpte-timecode': {
    slug: 'smpte-timecode',
    h1: 'What Is SMPTE Timecode?',
    definition: 'SMPTE timecode is the broadcast family of address codes defined by SMPTE (notably ST 12). It counts hours, minutes, seconds, and frames, and exists in drop-frame and non-drop-frame varieties for NTSC-related rates.',
    metaTitle: 'What Is SMPTE Timecode?',
    metaDescription: 'SMPTE timecode addresses video by hour, minute, second, and frame. Learn why frame rate and drop-frame flags matter.',
    takeaways: [
      'Always store the frame rate with SMPTE values.',
      'Drop-frame is a counting convention, not dropped video frames.',
      'Subtitle milliseconds are not the same as frame counts.',
    ],
    sections: [
      {
        heading: 'Why it matters for captions',
        paragraphs: [
          'If an SCC or broadcast package is labeled 29.97 drop-frame and your SRT was aligned as if it were 30 fps non-drop, cues will drift.',
        ],
      },
    ],
    relatedTerms: ['drop-frame-timecode', 'frame-rate', 'timecode'],
    relatedTools: [{ path: '/tools/timestamp-converter', label: 'Inspect and convert timestamps' }],
    sources: [
      { organization: 'SMPTE', title: 'SMPTE Standards', url: 'https://www.smpte.org/standards' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'frame-rate': {
    slug: 'frame-rate',
    h1: 'What Is Frame Rate?',
    definition: 'Frame rate is how many video frames are displayed per second — 24, 23.976, 25, 29.97, 30, 50, 59.94, and others. Caption timing that assumes the wrong rate will drift.',
    metaTitle: 'What Is Frame Rate? Why Captions Drift',
    metaDescription: 'Frame rate is frames per second. Learn how 23.976 vs 24 and 29.97 drop-frame affect subtitle synchronization.',
    takeaways: [
      'Confirm fps before converting between frame-based and millisecond cues.',
      '23.976 is not 24. 29.97 is not 30.',
      'Players that ignore the source fps will still play the video; your sidecar file may not stay aligned.',
    ],
    sections: [
      {
        heading: 'Example',
        paragraphs: ['A one-hour program at 23.976 vs 24 “loses” a few seconds of alignment if someone treats the counts as identical. That error is visible at the end of a long SRT.'],
      },
    ],
    relatedTerms: ['drop-frame-timecode', 'smpte-timecode', 'subtitle-synchronization'],
    relatedTools: [{ path: '/fix-subtitles', label: 'Repair drifting subtitle files' }],
    sources: [
      { organization: 'SMPTE', title: 'SMPTE Standards', url: 'https://www.smpte.org/standards' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'drop-frame-timecode': {
    slug: 'drop-frame-timecode',
    h1: 'What Is Drop-Frame Timecode?',
    definition: 'Drop-frame timecode is a numbering system for 29.97 fps (and 59.94) video. It skips certain frame numbers so the timecode display stays close to real elapsed time. It does not delete video frames.',
    metaTitle: 'What Is Drop-Frame Timecode?',
    metaDescription: 'Drop-frame skips frame numbers at 29.97 fps so clocks stay aligned. It does not drop picture frames.',
    takeaways: [
      'Drop-frame is a label convention, not a render mode.',
      'Mixing DF and NDF on one sequence is a classic sync bug.',
      'SRT milliseconds are wall-clock; SMPTE DF is a different counting system.',
    ],
    sections: [
      {
        heading: 'The thing people often get wrong',
        paragraphs: ['Editors sometimes hear “drop-frame” and think frames were removed from the movie. Only numbers in the clock are skipped.'],
      },
    ],
    relatedTerms: ['smpte-timecode', 'frame-rate', 'timecode'],
    relatedTools: [{ path: '/tools/timestamp-converter', label: 'Convert timestamp formats' }],
    sources: [
      { organization: 'SMPTE', title: 'SMPTE ST 12 timecode family', url: 'https://www.smpte.org/standards' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'audio-description': {
    slug: 'audio-description',
    h1: 'What Is Audio Description?',
    definition: 'Audio description (AD) is spoken narration that explains important visual information during pauses in the dialogue, for viewers who are blind or have low vision. It is a separate access service from captions.',
    metaTitle: 'What Is Audio Description?',
    metaDescription: 'Audio description narrates key visuals between dialogue lines. It is not a transcript and not a caption track.',
    takeaways: [
      'AD describes images; captions represent audio.',
      'Ofcom reports AD on a far smaller share of on-demand hours than subtitles.',
      'VideoText does not claim to generate audio description on this page.',
    ],
    sections: [
      {
        heading: 'How AD is produced',
        paragraphs: [
          'A writer scripts what to say, when it fits, and how to say it. Extended AD pauses the program when there is no gap. Standard AD fits existing pauses.',
        ],
      },
    ],
    relatedTerms: ['caption-accessibility', 'wcag', 'closed-captions'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Create a dialogue transcript (not AD)' }],
    sources: [
      { organization: 'W3C WAI', title: 'Audio Description', url: 'https://www.w3.org/WAI/media/av/description/' },
      { organization: 'Ofcom', title: 'Access services reports', url: 'https://www.ofcom.org.uk/tv-radio-and-on-demand/accessibility' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  wcag: {
    slug: 'wcag',
    h1: 'What Is WCAG?',
    definition: 'WCAG (Web Content Accessibility Guidelines) is the W3C standard for making web content more accessible. For video, Success Criterion 1.2.2 requires captions for prerecorded synchronized media, with related criteria for live captions and audio description.',
    metaTitle: 'What Is WCAG? Captions and Video Criteria',
    metaDescription: 'WCAG is the W3C accessibility standard. See which success criteria cover captions, transcripts, and audio description.',
    takeaways: [
      'WCAG is a standard, not a law — laws often reference it.',
      '1.2.2 Captions (Prerecorded) is the usual starting point for recorded video.',
      '/video-accessibility is VideoText’s compliance-oriented product page; this page defines the standard.',
    ],
    sections: [
      {
        heading: 'How WCAG relates to captions',
        paragraphs: [
          'Meeting 1.2.2 means a synchronized caption track exists and is accurate enough to convey the audio. Auto-generated text that is not corrected may fail that requirement in practice even if a track is present.',
        ],
      },
    ],
    relatedTerms: ['caption-accessibility', 'closed-captions', 'audio-description'],
    relatedTools: [{ path: '/video-accessibility', label: 'Video accessibility workflow' }],
    sources: [
      { organization: 'W3C', title: 'WCAG 2.2', url: 'https://www.w3.org/TR/WCAG22/' },
      { organization: 'W3C', title: 'Understanding Success Criterion 1.2.2: Captions (Prerecorded)', url: 'https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'caption-accessibility': {
    slug: 'caption-accessibility',
    h1: 'What Is Caption Accessibility?',
    definition: 'Caption accessibility means the timed text actually works for people who cannot hear the audio: accurate words, sync, completeness, useful sound cues, and a player that can display the track.',
    metaTitle: 'What Is Caption Accessibility?',
    metaDescription: 'Accessible captions are accurate, synchronous, complete, and available in the player. See FCC quality terms and WCAG 1.2.2.',
    takeaways: [
      'A file that exists but is wrong is not an accessible caption track.',
      'FCC quality language: accurate, synchronous, complete, appropriately placed.',
      'Only 14% of 3Play’s 2024 respondents believed raw auto captions were accessible.',
    ],
    sections: [
      {
        heading: 'How accessibility is judged',
        paragraphs: [
          'Legal regimes use different tests. WCAG 1.2.2 is a web standard. 47 C.F.R. § 79.1 states television quality attributes. Neither is satisfied by an unreviewed ASR dump on difficult audio.',
        ],
      },
    ],
    relatedTerms: ['wcag', 'closed-captions', 'sdh', 'word-error-rate'],
    relatedTools: [
      { path: '/video-to-subtitles', label: 'Create a caption file to review' },
      { path: '/ada-video-captions', label: 'ADA-oriented caption workflow' },
    ],
    sources: [
      { organization: 'FCC', title: '47 CFR § 79.1 captioning quality', url: 'https://www.law.cornell.edu/cfr/text/47/79.1' },
      { organization: '3Play Media', title: '2024 State of Captioning Report', url: 'https://go.3playmedia.com/hubfs/WP%20PDFs/2024%20State%20of%20Captioning%20Report%20by%203Play%20Media_Remediated.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'punctuation-restoration': {
    slug: 'punctuation-restoration',
    h1: 'What Is Punctuation Restoration?',
    definition: 'Punctuation restoration is the step that adds periods, commas, question marks, and often capitalization to raw ASR output that was predicted as an unpunctuated word stream.',
    metaTitle: 'What Is Punctuation Restoration in ASR?',
    metaDescription: 'Punctuation restoration turns unpunctuated ASR words into readable sentences. It is separate from word recognition.',
    takeaways: [
      'Word error rate can look fine while punctuation is unusable.',
      'Question vs statement errors change meaning.',
      'This is an NLP post-process, not a microphone setting.',
    ],
    sections: [
      {
        heading: 'Why it matters',
        paragraphs: [
          'Captions that lack sentence boundaries become reading-speed problems. Transcripts without punctuation fail QA even if every lexical word is right.',
        ],
      },
    ],
    relatedTerms: ['automatic-speech-recognition', 'transcription-qa', 'transcription-accuracy'],
    relatedTools: [{ path: '/guideline-format', label: 'Review punctuation against a style guide' }],
    sources: [
      { organization: 'OpenAI', title: 'Whisper paper (text normalizer discussion)', url: 'https://cdn.openai.com/papers/whisper.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  hallucination: {
    slug: 'hallucination',
    h1: 'What Is an ASR Hallucination?',
    definition: 'In speech recognition, a hallucination is invented text that does not correspond to the audio — for example, repeated phrases, leftover prompt language, or fluent sentences during silence or music.',
    metaTitle: 'What Is an ASR Hallucination?',
    metaDescription: 'An ASR hallucination is text the model invented. Learn how it differs from ordinary word errors.',
    takeaways: [
      'Hallucinations are insertions, often fluent and therefore dangerous.',
      'They are not the same as a misheard homophone.',
      'Always spot-check silence, music beds, and the start of files.',
    ],
    sections: [
      {
        heading: 'How to treat them in QA',
        paragraphs: [
          'Delete invented spans. Do not “lightly edit” a hallucination into something that sounds plausible. If the audio is inaudible, use the style guide’s inaudible mark.',
        ],
      },
    ],
    relatedTerms: ['word-error-rate', 'transcription-qa', 'automatic-speech-recognition'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Draft a transcript and review it' }],
    sources: [
      { organization: 'OpenAI', title: 'Whisper paper (robustness and error analysis context)', url: 'https://arxiv.org/abs/2212.04356' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'audio-extraction': {
    slug: 'audio-extraction',
    h1: 'What Is Audio Extraction?',
    definition: 'Audio extraction is pulling the soundtrack out of a video container so a speech recognizer can process it. The picture is not required for transcription, only the audio stream.',
    metaTitle: 'What Is Audio Extraction in Transcription?',
    metaDescription: 'Audio extraction isolates a video’s soundtrack before speech recognition. Learn why fps and video codecs do not drive WER.',
    takeaways: [
      'Recognition quality depends on the audio track, not the video resolution.',
      'A 4K file with a noisy mic still yields a noisy transcript.',
      'VideoText’s documented pipeline extracts audio with FFmpeg before Whisper — that is an implementation detail, not a user-facing product name.',
    ],
    sections: [
      {
        heading: 'How it fits the workflow',
        paragraphs: [
          'Upload or URL download → optional trim → extract audio → recognize → format transcript or SRT/VTT. Extraction failures (no audio stream, unsupported codec) stop the job before ASR starts.',
        ],
      },
    ],
    relatedTerms: ['transcription', 'automatic-speech-recognition', 'video-transcription'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Transcribe a video file or URL' }],
    sources: [
      { organization: 'FFmpeg', title: 'FFmpeg documentation', url: 'https://ffmpeg.org/documentation.html' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'multilingual-transcription': {
    slug: 'multilingual-transcription',
    h1: 'What Is Multilingual Transcription?',
    definition: 'Multilingual transcription produces text for speech in more than one language — either one file per language, a language-id plus recognition pipeline, or a single transcript that follows code-switching.',
    metaTitle: 'What Is Multilingual Transcription?',
    metaDescription: 'Multilingual transcription handles more than one spoken language. Learn how it differs from subtitle translation.',
    takeaways: [
      'Recognizing Spanish audio is not the same as translating an English SRT into Spanish.',
      'Code-switching inside one conversation is harder than a single-language file.',
      'VideoText translation tools operate on subtitle files; do not read this page as a claim about every language pair.',
    ],
    sections: [
      {
        heading: 'Multilingual transcription vs subtitle translation',
        paragraphs: [
          'Transcription starts from audio. Translation starts from existing text cues and should preserve timecodes. /translate-subtitles is the latter.',
        ],
      },
    ],
    relatedTerms: ['localization', 'speech-to-text', 'automatic-speech-recognition'],
    relatedTools: [
      { path: '/video-to-transcript', label: 'Transcribe source-language audio' },
      { path: '/translate-subtitles', label: 'Translate existing SRT/VTT' },
    ],
    sources: [
      { organization: 'Mozilla', title: 'Common Voice multilingual dataset', url: 'https://www.mozillafoundation.org/en/blog/common-voice-20-is-now-available/' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'character-error-rate': {
    slug: 'character-error-rate',
    h1: 'What Is Character Error Rate (CER)?',
    definition: 'Character error rate (CER) is the same edit-distance idea as WER, computed on characters instead of words. It is common for languages without clear word boundaries and as a complement to WER.',
    metaTitle: 'What Is Character Error Rate (CER)?',
    metaDescription: 'CER measures ASR errors at the character level. See when to use CER instead of or beside word error rate.',
    takeaways: [
      'CER = (S + D + I) / number of reference characters.',
      'A low WER can hide character-level mess in punctuation or morphology.',
      'Do not convert CER to “percent accurate” without stating the metric.',
    ],
    sections: [
      {
        heading: 'When CER is preferred',
        paragraphs: [
          'Mandarin and other scripts are often scored with CER. Some punctuation studies also report CER because a period is a character, not a word.',
        ],
      },
    ],
    relatedTerms: ['word-error-rate', 'transcription-accuracy'],
    relatedTools: [{ path: '/research/transcription-accuracy-benchmark-2026', label: 'See VideoText’s WER methodology' }],
    sources: [
      { organization: 'OpenAI', title: 'Whisper paper (evaluation / normalizer context)', url: 'https://cdn.openai.com/papers/whisper.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'transcription-qa': {
    slug: 'transcription-qa',
    h1: 'What Is Transcript QA?',
    definition: 'Transcript QA is the review pass after drafting — checking words, speakers, timestamps, tags, and style-guide rules before delivery. It is separate from the act of capturing speech.',
    metaTitle: 'What Is Transcript QA?',
    metaDescription: 'Transcript QA is the checklist pass after ASR or typing. Learn what reviewers catch that models miss.',
    takeaways: [
      'QA is a job step, not a confidence score.',
      'Proper nouns and glossary terms are the usual first search.',
      '/guideline-format is VideoText’s style-guide workspace; the Hashnode “what is transcript QA” post is narrative.',
    ],
    sections: [
      {
        heading: 'What a QA pass usually includes',
        paragraphs: [
          'Listen against the text for misses, confirm speaker labels, scan for hallucinated sentences, apply verbatim rules, and verify timestamp interval if the client asked for them.',
        ],
      },
    ],
    relatedTerms: ['clean-verbatim', 'speaker-labels', 'hallucination', 'verbatim-transcription'],
    relatedTools: [
      { path: '/guideline-format', label: 'Run a style-guide QA pass' },
      { path: '/video-to-transcript', label: 'Produce the draft transcript' },
    ],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  timestamp: {
    slug: 'timestamp',
    h1: 'What Is a Timestamp in a Transcript?',
    definition: 'A timestamp is a time marker placed in a transcript to show when a span of speech occurred. Intervals (every 30 seconds, every speaker change) are a client rule, not a property of ASR.',
    metaTitle: 'What Is a Transcript Timestamp?',
    metaDescription: 'Timestamps mark when words were spoken in a transcript. Learn common intervals and how they differ from subtitle cue times.',
    takeaways: [
      'Transcript timestamps are navigation; subtitle cue times are display schedules.',
      'State the interval in the job brief.',
      'Inconsistent placement is a frequent marketplace rejection.',
    ],
    sections: [
      {
        heading: 'Example',
        paragraphs: ['[00:12:40] Speaker 2: We should export VTT as well as SRT.'],
      },
    ],
    relatedTerms: ['timecode', 'srt-file', 'transcription-qa'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Create a timestamped transcript' }],
    sources: [
      { organization: 'Rev', title: 'Rev Transcription Style Guide (timestamps)', url: 'https://www.rev.com/blog/resources/rev-transcription-styleguide' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  localization: {
    slug: 'localization',
    h1: 'What Is Localization (for Video and Subtitles)?',
    definition: 'Localization adapts media for another language and market. For video that may mean translated subtitles, dubbed audio, or culturally adjusted on-screen text. It is broader than word-for-word translation.',
    metaTitle: 'What Is Localization for Subtitles and Video?',
    metaDescription: 'Localization adapts video for another market. Learn how subtitle translation differs from dubbing and from source-language transcription.',
    takeaways: [
      '3Play’s 2024 survey found subtitling was the most common localization method among respondents.',
      'Preserving cue times is part of subtitle localization quality.',
      '/translate-subtitles is VideoText’s file-translation workflow.',
    ],
    sections: [
      {
        heading: 'Localization vs transcription',
        paragraphs: [
          'Transcription writes down the source language. Localization starts from that meaning and produces a target-language experience. Doing both is two jobs.',
        ],
      },
    ],
    relatedTerms: ['multilingual-transcription', 'subtitles', 'forced-subtitles'],
    relatedTools: [{ path: '/translate-subtitles', label: 'Translate SRT or VTT' }],
    sources: [
      { organization: '3Play Media', title: '2024 State of Captioning Report (localization chapter)', url: 'https://go.3playmedia.com/hubfs/WP%20PDFs/2024%20State%20of%20Captioning%20Report%20by%203Play%20Media_Remediated.pdf' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
  'speech-recognition-model': {
    slug: 'speech-recognition-model',
    h1: 'What Is a Speech Recognition Model?',
    definition: 'A speech recognition model is the trained statistical or neural system that maps audio features to tokens or words. Examples include the Whisper family of checkpoints. The model is not the same thing as the product UI around it.',
    metaTitle: 'What Is a Speech Recognition Model?',
    metaDescription: 'A speech recognition model is the trained ASR engine. Learn how model size, training data, and evaluation sets differ from a product name.',
    takeaways: [
      'Model cards and papers report WER on named sets.',
      '“Powered by Whisper” is not a WER number.',
      'VideoText documents Whisper large-v3 in product copy; this definition does not add unpublished model comparisons.',
    ],
    sections: [
      {
        heading: 'How models are compared',
        paragraphs: [
          'Fix the dataset, the decoding settings, and the text normalizer. Then compare WER. Changing any of those three invalidates a head-to-head claim.',
        ],
      },
    ],
    relatedTerms: ['automatic-speech-recognition', 'word-error-rate', 'confidence-score'],
    relatedTools: [{ path: '/video-to-transcript', label: 'Run VideoText’s transcription workflow' }],
    sources: [
      { organization: 'OpenAI', title: 'Robust Speech Recognition via Large-Scale Weak Supervision', url: 'https://arxiv.org/abs/2212.04356' },
    ],
    publishedAt: D,
    updatedAt: D,
  },
}
