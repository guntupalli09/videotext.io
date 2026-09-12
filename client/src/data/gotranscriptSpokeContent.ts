/**
 * GoTranscript hub-and-spoke SEO content.
 * Sourced from official guidelines (verified 2026-09-12).
 */

export interface SpokeExample {
  label: string
  wrong?: string
  right: string
}

export interface SpokeSection {
  heading: string
  paragraphs: string[]
  examples?: SpokeExample[]
  codeBlock?: string
}

export interface GoTranscriptSpoke {
  path: string
  hubLabel: string
  hubDescription: string
  sections: SpokeSection[]
}

export const GOTRANSCRIPT_HUB_SPOKE_LINKS: {
  path: string
  label: string
  description: string
}[] = [
  {
    path: '/gotranscript-transcription-format',
    label: 'Timestamp format',
    description: 'Bold [00:00:00], every 2 min vs speaker change, file-relative time, test job exception',
  },
  {
    path: '/gotranscript-style-guide',
    label: 'Speaker labels',
    description: 'Bold labels, names vs roles, ? prefix when uncertain',
  },
  {
    path: '/gotranscript-inaudible-tags',
    label: 'Inaudible & crosstalk tags',
    description: '[inaudible 00:00:00], [unintelligible 00:00:00], [crosstalk] — not interchangeable',
  },
  {
    path: '/gotranscript-transcription-rules',
    label: 'Verbatim rules',
    description: 'Clean vs full verbatim, slang expansion, test job format',
  },
]

const SPOKE_BY_PATH: Record<string, GoTranscriptSpoke> = {
  '/gotranscript-transcription-format': {
    path: '/gotranscript-transcription-format',
    hubLabel: 'Timestamp format',
    hubDescription: 'When and how to use bold [00:00:00] on GoTranscript jobs',
    sections: [
      {
        heading: 'Timestamping is job-dependent — not universal',
        paragraphs: [
          'GoTranscript jobs specify whether timestamping is required and which type to use. Check the job instructions before you start. The qualification test is clean verbatim with no timestamping.',
          'When timestamping is required, there are two types: every 2 minutes, or every time the speaker changes. Only one applies per job — follow the file instructions.',
        ],
      },
      {
        heading: 'Exact format: bold [00:00:00]',
        paragraphs: [
          'Timestamps use full hours:minutes:seconds inside square brackets and must be bold. Speaker labels with timestamps are also bold.',
          'Time is file-relative: if you transcribe minutes 20–30 of a recording, your first stamp is [00:20:00], not [00:00:00].',
        ],
        examples: [
          {
            label: 'Every speaker change',
            wrong: 'Speaker 1: Hello.\nSpeaker 2: Hi there.',
            right: '[00:01:12] Speaker 1: Hello.\n[00:01:18] Speaker 2: Hi there.',
          },
          {
            label: 'Every 2 minutes',
            wrong: '[00:02] Speaker 1: We need to discuss the budget.',
            right: '[00:02:00] Speaker 1: We need to discuss the budget.',
          },
        ],
      },
      {
        heading: 'Common timestamp mistakes',
        paragraphs: [
          'Adding timestamps on the qualification test (explicitly not required).',
          'Using short form [3:45] instead of full [00:03:45].',
          'Forgetting bold formatting on timestamps and time-stamped tags.',
          'Starting file-relative segments at [00:00:00] when the clip begins mid-file.',
        ],
      },
    ],
  },
  '/gotranscript-style-guide': {
    path: '/gotranscript-style-guide',
    hubLabel: 'Speaker labels',
    hubDescription: 'Bold labels, roles, names, and ? prefix for uncertain speakers',
    sections: [
      {
        heading: 'Speaker label format',
        paragraphs: [
          'Speaker labels are bold, followed by a colon and a single space (never a tab). Use names when known, descriptive roles when not, and numbered speakers as a fallback.',
          'Always include a speaker label — even on single-speaker files.',
        ],
        codeBlock:
          'Mark: Hello.\nInterviewer: When did you start?\nInterviewee: Last year.\nSpeaker 1: Next question.',
      },
      {
        heading: 'Names, roles, and uncertainty',
        paragraphs: [
          'If a full name appears once (David Butterfield:), you may shorten to first name later (David:). Titles like Doctor or Pastor can be dropped after first mention — optional, not an error.',
          'When you cannot identify who is speaking, prefix a question mark before the label: ?David:, ?Interviewee 2:, ?Speaker 3:. This rule has been required since GoTranscript\'s 2022-03-09 update.',
        ],
        examples: [
          {
            label: 'Uncertain speaker',
            wrong: 'Speaker 2: I agree with that point.',
            right: '?Speaker 2: I agree with that point.',
          },
          {
            label: 'Descriptive role',
            wrong: '[Host]: Welcome to the show.',
            right: 'Host: Welcome to the show.',
          },
        ],
      },
    ],
  },
  '/gotranscript-inaudible-tags': {
    path: '/gotranscript-inaudible-tags',
    hubLabel: 'Inaudible & crosstalk tags',
    hubDescription: '[inaudible], [unintelligible], and [crosstalk] — when to use each',
    sections: [
      {
        heading: 'Inaudible vs unintelligible',
        paragraphs: [
          'GoTranscript allows only two tags for unclear speech — do not invent other markings.',
          '[inaudible 00:00:00] — speech cannot be heard due to poor recording or background noise.',
          '[unintelligible 00:00:00] — speech can be heard but not understood (accent, manner of speech, etc.).',
          'Both require full HH:MM:SS timestamps and must be bold.',
        ],
        examples: [
          {
            label: 'Cannot hear the word',
            right: 'The budget was [inaudible 00:03:45] according to the CFO.',
          },
          {
            label: 'Heard but not understood',
            right: 'She mentioned [unintelligible 00:12:08] during the introduction.',
          },
        ],
      },
      {
        heading: 'Crosstalk is not inaudible',
        paragraphs: [
          'When speakers talk over each other, use [crosstalk] — on its own line or inline where the overlap occurs.',
          'Do not substitute [inaudible] for overlapping speech. Editors treat these as different tags.',
        ],
        examples: [
          {
            label: 'Overlapping speech',
            wrong: '[inaudible 00:05:20]',
            right: '[crosstalk]',
          },
        ],
      },
      {
        heading: 'Related sound events',
        paragraphs: [
          '[silence] — short pause in speech (4–10 seconds). [pause 00:00:00] — bold, separate line, pauses longer than 10 seconds.',
          '[background noise] — ambiance or significant unidentified sound while someone is talking.',
          'Sound notes use brackets, lowercase, present tense, max two words.',
        ],
      },
    ],
  },
  '/gotranscript-transcription-rules': {
    path: '/gotranscript-transcription-rules',
    hubLabel: 'Verbatim rules',
    hubDescription: 'Clean vs full verbatim, slang, fillers, and test job requirements',
    sections: [
      {
        heading: 'Clean verbatim (most jobs)',
        paragraphs: [
          'Remove speech errors, false starts, stutters, and repetitions — but keep emphasis repetitions (No, no, no. / very, very happy).',
          'Remove filler words (uh, um, you know, like, I mean, so, kind of, well, sort of) unless they change meaning.',
          'Expand slang in clean verbatim: gonna → going to, wanna → want to, gotcha → got you. Yeah/yep → yes. Always spell Okay — never OK or Ok.',
          'Keep "Oh" expressions regardless of verbatim type. Never use exclamation marks.',
        ],
        examples: [
          {
            label: 'Clean verbatim',
            wrong: 'Um, I\'m gonna, you know, wanna finish this today.',
            right: 'I am going to want to finish this today.',
          },
        ],
      },
      {
        heading: 'Full verbatim (when job specifies)',
        paragraphs: [
          'Transcribe exactly as spoken: speech errors, false starts, fillers, slang, stutters, and repetitions stay in.',
          'Affirmative/negative only as: Mm-hmm / Mm (yes) or Mm-mm (no); Uh-huh (yes) or Uh-uh (no).',
        ],
      },
      {
        heading: 'Qualification test format',
        paragraphs: [
          'The GoTranscript test job is clean verbatim with no timestamping. Focus on accurate transcription, bold speaker labels, correct inaudible tags, and clean-verbatim filler removal — not timestamps.',
        ],
      },
    ],
  },
}

export function getGoTranscriptSpoke(pathname: string): GoTranscriptSpoke | null {
  return SPOKE_BY_PATH[pathname] ?? null
}

export function isGoTranscriptHub(pathname: string): boolean {
  return pathname === '/gotranscript-guidelines'
}
