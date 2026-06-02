export const PRESET_DATA = {
  rev: {
    id: 'rev',
    label: 'Rev — transcription style guide',
    rules: [
      {
        id: 'verbatim_default',
        category: 'Verbatim & Fillers',
        label: 'Default verbatim mode',
        defaultValue:
          'Non-verbatim: lightly edit for readability. Remove filler words (um, uh, like, you know), false starts, stutters, and active listening interjections (Okay, Yeah, Mm-hmm) that interrupt a speaker. Do not change the structure or meaning of speech.',
      },
      {
        id: 'verbatim_full',
        category: 'Verbatim & Fillers',
        label: 'Full verbatim mode',
        defaultValue:
          'Keep all filler words, stutters, repetitions, false starts. Non-speech speaker sounds: (laughs) or (laughing) only. All other sounds (coughs, sneezes, clapping) not transcribed.',
      },
      {
        id: 'false_starts',
        category: 'False Starts & Stutters',
        label: 'False starts',
        defaultValue:
          'Non-verbatim: remove false starts that are quickly reworded UNLESS they provide additional context — then keep. A complete sentence is never a false start. Full verbatim: keep all false starts.',
      },
      {
        id: 'stutters',
        category: 'False Starts & Stutters',
        label: 'Stutters',
        defaultValue:
          "Non-verbatim: remove stutters (e.g. 'the, the m- m- movies'). Full verbatim: keep all stutters exactly as spoken.",
      },
      {
        id: 'speaker_labels',
        category: 'Speaker Labels',
        label: 'Speaker label format',
        defaultValue:
          "Priority order: (1) use customer-provided labels always. (2) Use speaker's name if identified in audio. (3) Use process of elimination if names provided. (4) Default: Speaker 1, Speaker 2. (5) Professional role if name unknown: Interviewer, Doctor, Translator. (6) Group label if too many to track: Students, Audience, Camera Crew. NEVER use descriptive labels like 'Old man' or 'Blue shirt guy'. Max 15 chars — abbreviate surname initial if longer (e.g. Benedict C.).",
      },
      {
        id: 'inaudible_tag',
        category: 'Tags & Notation',
        label: 'Inaudible tag',
        defaultValue: '[inaudible HH:MM:SS] — timestamp required on every inaudible tag.',
      },
      {
        id: 'foreign_tag',
        category: 'Tags & Notation',
        label: 'Foreign language tag',
        defaultValue:
          '[foreign language HH:MM:SS] — mark where non-English audio begins. DO NOT transcribe non-English audio.',
      },
      {
        id: 'other_tags',
        category: 'Tags & Notation',
        label: 'Other notation tags',
        defaultValue:
          '(singing) — never transcribe lyrics. (laughs) or (laughing) — verbatim files only. (beep) or (censored) — intentionally censored words in audio only. Do not create any tags not listed here.',
      },
      {
        id: 'contractions',
        category: 'Contractions & Slang',
        label: 'Informal contractions (non-verbatim)',
        defaultValue:
          "Correct informal contractions to formal speech: 'cause → because | 'em → them | doin' → doing | gonna → going to | gotta → got to | kinda → kind of | wanna → want to",
      },
      {
        id: 'spelling',
        category: 'Spelling & Numbers',
        label: 'Spelling standard',
        defaultValue: 'Standard US English throughout.',
      },
      {
        id: 'numbers',
        category: 'Spelling & Numbers',
        label: 'Numbers',
        defaultValue:
          "Write as spoken — do not convert. 'nine thirty AM' → 9:30 a.m. Do not convert spoken phrases to numerals.",
      },
      {
        id: 'profanity',
        category: 'Profanity & Special Cases',
        label: 'Profanity',
        defaultValue:
          'ALWAYS transcribe profanity as spoken — never censor spoken words. If censored in audio with a sound: use (beep) or (censored).',
      },
      {
        id: 'special_instructions',
        category: 'Profanity & Special Cases',
        label: 'Special instructions',
        defaultValue:
          'If project is marked with Special Instructions in the editor, those override the standard style guide.',
      },
    ],
  },
  gotranscript: {
    id: 'gotranscript',
    label: 'GoTranscript — transcription style guide',
    rules: [
      {
        id: 'verbatim_full',
        category: 'Verbatim & Fillers',
        label: 'Full verbatim — keep all',
        defaultValue:
          'Transcribe exactly as spoken: speech errors, false starts, filler words (um, uh, kind of, sort of, I mean, you know), slang (kinda, gotta, gotcha, wanna, dunno), stutters (I-I went), repetitions (I went- I went). Affirmative: Mm-hmm or Uh-huh. Negative: Mm-mm or Uh-uh.',
      },
      {
        id: 'verbatim_clean',
        category: 'Verbatim & Fillers',
        label: 'Clean verbatim — remove these',
        defaultValue:
          "Remove: speech errors, false starts (unless they add information), stutters, repetitions (EXCEPTION: keep emphasis repetitions — 'No, no, no.' / 'very, very happy'), filler words (uh, um, you know, like, I mean, so, kind of, well, sort of — EXCEPTION: do NOT remove if they change meaning). Omit 'yeah'/'yes' reactions UNLESS they are answers to direct questions.",
      },
      {
        id: 'always_keep',
        category: 'Verbatim & Fillers',
        label: 'Always keep regardless of verbatim type',
        defaultValue:
          'Always keep: Oh, Oh my God, Oh dear, Oh my, Oh boy. Never use exclamation marks — not permitted in any file.',
      },
      {
        id: 'slang_clean',
        category: 'Contractions & Slang',
        label: 'Slang corrections (clean verbatim only)',
        defaultValue:
          "gonna → going to | wanna → want to | 'cause → because | gotcha → got you | kinda → kind of. Yeah/yep/yap/yup/mm-hmm → yes. Alright → all right. Always spell as 'Okay' — never OK or Ok.",
      },
      {
        id: 'contractions',
        category: 'Contractions & Slang',
        label: 'Spoken contractions',
        defaultValue:
          "Never change spoken contractions: y'all, ain't, don't, can't, it's — keep exactly as spoken in all verbatim types.",
      },
      {
        id: 'speaker_labels',
        category: 'Speaker Labels',
        label: 'Speaker label format',
        defaultValue:
          "Always use a speaker label even with only one speaker. Use full name if known: 'David Butterfield:' then first name only after: 'David:'. Titles (Doctor, Pastor) can be dropped after first mention — optional. Use descriptive roles where name unknown: Interviewer: | Interviewee: | Host: | Facilitator: | Caller: | Receiver: | Participant 1:",
      },
      {
        id: 'inaudible_tag',
        category: 'Tags & Notation',
        label: 'Inaudible tag',
        defaultValue: '[inaudible]',
      },
      {
        id: 'sound_events',
        category: 'Tags & Notation',
        label: 'Sound events',
        defaultValue:
          'Speaker sounds (same line, present tense, lowercase): [laughs] [snaps fingers]. Non-speaker sounds (separate line, lowercase): [laughter] [applause] [phone ringing] [coughing].',
      },
      {
        id: 'spelling',
        category: 'Spelling & Numbers',
        label: 'Spelling standard',
        defaultValue:
          'US English by default. Use different spelling ONLY if client specifies in file comments.',
      },
      {
        id: 'timestamps',
        category: 'Spelling & Numbers',
        label: 'Timestamps',
        defaultValue:
          'Not included by default. Add only if client requests in file instructions.',
      },
    ],
  },
  transcribeme: {
    id: 'transcribeme',
    label: 'TranscribeMe — clean verbatim style guide',
    rules: [
      {
        id: 'default_style',
        category: 'Verbatim & Fillers',
        label: 'Default style',
        defaultValue:
          'Clean Verbatim (CV): clean up speech for readability without editing what was said. Remove stutters, stammers, filler words, informal pronunciation, feedback, and false starts (with length rule — see below).',
      },
      {
        id: 'filler_words',
        category: 'Verbatim & Fillers',
        label: 'Filler words',
        defaultValue:
          'Remove: um, uh, er, hmm, uh-uh, mm-hmm. EXCEPTION: keep if it is the ONLY answer to a direct question. Kept spellings: uh-huh / mm-hmm (affirmative) | uh-uh / nuh-uh / mm-mm (negative).',
      },
      {
        id: 'crutch_words',
        category: 'Verbatim & Fillers',
        label: 'Crutch words',
        defaultValue:
          "ONLY remove 'like' and 'you know' when inessential. Keep 'like' when introducing a quote ('He was like, \"What?\"') or approximation ('gone for like a week'). Keep 'you know' in direct questions ('Do you know what time it is?'). Keep all other crutch words.",
      },
      {
        id: 'thinking_sounds',
        category: 'Verbatim & Fillers',
        label: 'Thinking sounds',
        defaultValue:
          'DO NOT transcribe meaningless thinking sounds (buh… tk tk tk…). Omit entirely.',
      },
      {
        id: 'false_starts',
        category: 'False Starts & Stutters',
        label: 'False starts',
        defaultValue:
          'Mark with double dash: word-- next word. Dashes attach to word before, space after, lowercase follows (unless proper noun). REMOVE false start if 3 or fewer words. KEEP false start if 4 or more words even if exact repetition. Apply 3-and-under rule to each false start separately when multiple occur in a row.',
      },
      {
        id: 'stutters',
        category: 'False Starts & Stutters',
        label: 'Stutters and stammers',
        defaultValue:
          "Remove all repeated sounds and stammers. EXCEPTION: keep repetitions that add meaning or emphasis ('Yeah, yeah, yeah.' / 'very, very important' / 'do do').",
      },
      {
        id: 'interruptions',
        category: 'False Starts & Stutters',
        label: 'Interruptions',
        defaultValue:
          'Continued interruptions: mark broken speech with -- on both sides. Unfinished questions after interruption: --? (question mark attached, no space). If interruption occurs as speaker finishes thought: end with punctuation, new line for interjecting speaker — no dashes needed.',
      },
      {
        id: 'feedback_words',
        category: 'False Starts & Stutters',
        label: 'Feedback words',
        defaultValue:
          'Remove generic feedback words (yeah, right, okay, got it, great) when spoken while another person is talking. KEEP if the word leads to further speech by the same speaker or someone responds to it.',
      },
      {
        id: 'speaker_labels',
        category: 'Speaker Labels',
        label: 'Speaker label format',
        defaultValue:
          'No speaker IDs added at transcription phase by default. If required: first name if known. If unknown: Man 1, Woman 1 — or descriptive role. Never invent names — use context only. New line for each speaker change.',
      },
      {
        id: 'contractions',
        category: 'Contractions & Slang',
        label: 'Informal pronunciation — expand to proper spelling',
        defaultValue:
          "gonna → going to | gotta → got to | wanna → want to | kinda → kind of | sorta → sort of | coulda → could've | 'cause or cuz → because | goin' → going | ya → you. EXCEPTIONS — keep as spoken: gotcha | y'all | ain't | I'ma",
      },
      {
        id: 'grammar',
        category: 'Contractions & Slang',
        label: 'Incorrect grammar and slang',
        defaultValue:
          'Transcribe incorrect grammar as spoken — do not correct. No [sic] tag. Nonstandard words and slang: include as spoken using most logical spelling.',
      },
      {
        id: 'tags',
        category: 'Tags & Notation',
        label: 'Approved tags (exact format — no others)',
        defaultValue:
          '[inaudible] | [crosstalk] | [foreign] | [silence] (own line, no punctuation) | [music] (inline) | [applause] (inline) | [laughter] (inline) | Guess tag: [word?] (adopt text and capitalisation of guess). All tags lowercase in square brackets. DO NOT use tags not listed here.',
      },
      {
        id: 'timestamps',
        category: 'Tags & Notation',
        label: 'Timestamps',
        defaultValue: 'None by default unless specified in file instructions.',
      },
      {
        id: 'spelling',
        category: 'Spelling & Numbers',
        label: 'Spelling standard',
        defaultValue:
          "American English default. TM-specific: okay (not OK/'kay) | all right (not alright) | a lot (not alot) | email (not e-mail) | US and USA (not U.S. or U.S.A.). Commonwealth files marked with GB/AU/NZ/SCT/IE in style panel.",
      },
      {
        id: 'numbers',
        category: 'Spelling & Numbers',
        label: 'Numbers',
        defaultValue:
          'Spell out one through nine. Use numerals for 10+. Decimals always as numerals with leading zero (0.6 not .6). Money, percentages, scales always as numerals.',
      },
      {
        id: 'punctuation',
        category: 'Spelling & Numbers',
        label: 'Punctuation',
        defaultValue:
          'Oxford comma used. No parentheses. No ellipses — use double dash -- instead. One space between sentences (not two).',
      },
      {
        id: 'profanity',
        category: 'Profanity & Special Cases',
        label: 'Profanity',
        defaultValue: 'Transcribe without censoring.',
      },
    ],
  },
  scribie: {
    id: 'scribie',
    label: 'Scribie — transcription style guide',
    rules: [
      {
        id: 'verbatim_default',
        category: 'Verbatim & Fillers',
        label: 'Default verbatim mode',
        defaultValue:
          'Default: omit fillers (you know, like) and utterances (uh, um). Strict verbatim (when requested): keep all fillers and utterances.',
      },
      {
        id: 'content_rules',
        category: 'Verbatim & Fillers',
        label: 'Content rules',
        defaultValue:
          'Nothing omitted from audio unless specified by client. Background conversation: transcribe if clear and audible. No time-codes, headers, footers, or speaker tracking in raw transcript — added in review layer only.',
      },
      {
        id: 'unfinished_sentences',
        category: 'False Starts & Stutters',
        label: 'Unfinished sentences and pauses',
        defaultValue:
          '… (ellipsis) for mid-sentence pauses and unfinished/trailing sentences.',
      },
      {
        id: 'speaker_labels',
        category: 'Speaker Labels',
        label: 'Speaker label format',
        defaultValue:
          'New paragraph for each new speaker. Separate speakers with an empty line between paragraphs.',
      },
      {
        id: 'inaudible_tag',
        category: 'Tags & Notation',
        label: 'Inaudible tag',
        defaultValue: '____ (four underscores)',
      },
      {
        id: 'laughter_tag',
        category: 'Tags & Notation',
        label: 'Laughter',
        defaultValue: '[laughter] or [chuckle] — inline',
      },
      {
        id: 'contractions',
        category: 'Contractions & Slang',
        label: 'Contractions and slang',
        defaultValue:
          'Keep as spoken — do NOT expand: wanna, gonna, kinda. This is opposite to GoTranscript and TranscribeMe.',
      },
      {
        id: 'numbers',
        category: 'Spelling & Numbers',
        label: 'Numbers',
        defaultValue:
          'One through nine → spell out in letters (three, seven). Exception: measurements always use numerals.',
      },
      {
        id: 'spelling_notes',
        category: 'Spelling & Numbers',
        label: 'Spelling notes',
        defaultValue:
          "Spelled-out names: capitalize and hyphenate (J-O-H-N). Spell out 'etcetera' not 'etc.' Use 'i.e.' not 'ie'. Use 'e.g.' not 'eg'. 'Alright' and 'all right' both acceptable. Statements may start with 'And' — permitted.",
      },
      {
        id: 'accuracy',
        category: 'Profanity & Special Cases',
        label: 'Accuracy standard',
        defaultValue:
          '5-point grading scale. Minimum average 3.15 to remain active. No more than 2 mistakes per 10 comprehensible spoken words.',
      },
    ],
  },
} as const

export type GuidelinePresetKey = keyof typeof PRESET_DATA
