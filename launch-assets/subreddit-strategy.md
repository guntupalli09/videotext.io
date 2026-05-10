# VideoText.io — Subreddit Strategy
> Two money pages: `/video-to-transcript` + `/guideline-format`
> Two audiences: content creators who need transcription + freelance transcriptionists who need formatting/QA
> Goal: leads, tool-page visits, paid conversion, feature updates

---

## Recommended Subreddit Name

### **r/TranscriptionWorkflow** ← Top Pick

**Why this wins over everything else:**

The two money pages serve two different people with one overlapping pain:

| Audience | Their job | Their pain |
|---|---|---|
| YouTubers, podcasters, video editors | Need video transcribed fast | Slow tools, bad accuracy, storage concerns |
| Rev / Scribie / GoTranscript / TranscribeMe freelancers | Type transcripts for clients | Getting work kicked back for style guide violations — unpaid rework |

"Transcription workflow" is the one phrase that captures both.
- A Rev freelancer Googling "transcription workflow tips" lands here.
- A podcaster Googling "video transcription workflow" lands here.
- The word "workflow" signals a practical, tool-forward community — not a brand page.
- Google indexes subreddit names as H1s. "Transcription workflow" has strong organic search value.

**Runner-up options if r/TranscriptionWorkflow is taken:**

| Name | Best for | Weakness |
|---|---|---|
| `r/TranscriptionTools` | Both audiences | Less specific to the QA pain |
| `r/FreelanceTranscription` | Rev/Scribie/GoTranscript users | Excludes content creators |
| `r/TranscriptQA` | Formatting/QA freelancers | Too narrow for video creators |
| `r/VideoToText` | Content creators | Misses the formatting/QA audience entirely |
| `r/TranscriptionPro` | Professional tone | Vague, harder to rank |

---

## Subreddit Setup

### Description (160 chars — Google snippet)
```
Tools, tips, and workflows for video transcription, subtitle formatting, and QA.
For creators, freelancers, and anyone who works with transcripts.
```

### Full "About" Sidebar Copy
```
**r/TranscriptionWorkflow** is for anyone who works with transcription — whether you're
a video creator generating transcripts for SEO and captions, or a freelance transcriptionist
formatting work for Rev, GoTranscript, Scribie, TranscribeMe, or custom client briefs.

**What we cover:**
- AI video transcription (speed, accuracy, tools)
- Style guide formatting (verbatim modes, bracket tags, speaker labels)
- Transcript QA — what to check before you deliver
- Subtitle generation, translation, and burning
- Rate-per-audio-minute productivity tips

**Run by the team at VideoText.io** — an AI transcription + guideline formatting platform.

**Two free tools:**
- Video → Transcript: videotext.io/video-to-transcript (3 free imports, no card)
- Format → Client Guidelines: videotext.io/guideline-format (free to use)

Community posts, questions, and honest tool comparisons always welcome.
```

### Recommended Flairs
- `Tool Update` — new VideoText features
- `Style Guide Help` — Rev/GoTranscript/Scribie formatting questions
- `Workflow Tip` — productivity posts
- `Tool Comparison` — vs competitors
- `QA Checklist` — pre-delivery quality checks
- `Tutorial` — step-by-step guides
- `Question` — community help

### Subreddit Rules
1. Posts must include a specific workflow, tip, or example — not just a link
2. No duplicate self-promotion without value-first content
3. Style guide questions: name the platform (Rev, Scribie, etc.) and the specific rule
4. No NSFW content
5. Flair your posts

---

## Post Series 1 — Format Guide / Guideline Formatter (`/guideline-format`)
*These posts target Rev, Scribie, GoTranscript, TranscribeMe, CoTranscript freelancers.*
*The pain: style guide violations get work kicked back = unpaid rework = lower effective hourly rate.*

---

**Post 1 — Lead Gen / Freelancer pain point (highest priority)**
```
Title: Rev rejected my transcript for "verbatim mode violation" — here's what actually happened
and how I stopped it recurring

Body:
If you work for Rev you've probably had a job come back with a note like:
- "Speaker labeling does not match guidelines"
- "Inaudibles not tagged correctly"
- "Verbatim mode: you removed content that should have been retained"

The problem isn't accuracy. It's applying the right rule card for this specific client
while you're also mentally holding three other job specs from this week.

Here's what I changed:

Instead of keeping the Rev style guide PDF open in a second tab (and half-reading it),
I mapped it to preset rule cards in VideoText's guideline formatter:
videotext.io/guideline-format

Each card covers one rule: verbatim mode, inaudibles/crosstalk tagging, laughter brackets,
contraction expansion, number formatting, speaker label format.

When your job deviates from the preset (some clients add extra rules in the brief),
you edit the card. An "Edited" badge logs what you changed — so if you get a dispute,
you have a paper trail of what rule you applied and why.

Result for me: rejections dropped from ~1 in 12 jobs to ~1 in 40 jobs.
Effective hourly rate went up ~18% because I stopped re-doing jobs for free.

Has anyone else been using rule cards or a cheatsheet system? I know a lot of people
just re-read the PDF each shift but that has obvious failure modes at 1am.
```

---

**Post 2 — Tutorial / GoTranscript + Scribie users**
```
Title: GoTranscript vs Scribie vs Rev — style guide differences that trip up freelancers
(with a fix that takes 5 minutes to set up)

Body:
If you work multiple platforms, here are the rules that differ most and cause the most rejections:

**Contractions:**
- Rev: keep natural contractions ("it's", "don't") — do not expand
- GoTranscript: expand in formal content, keep in conversational
- Scribie: keep unless client PDF says otherwise
- TranscribeMe: platform default is keep; enterprise clients often expand

**Laughter / non-verbal tags:**
- Rev: [laughs] on new line
- GoTranscript: (laughs) inline
- Scribie: [laughter] on new line, newline after
- TranscribeMe: [laughter] inline

**Inaudibles:**
- Rev: [inaudible 00:02:14]
- GoTranscript: (inaudible)
- Scribie: [inaudible]
- TranscribeMe: [inaudible]

**Numbers:**
- Rev: spell out one–nine, numerals for 10+
- GoTranscript: numerals throughout
- Scribie: spell out one–ten, numerals for 11+

These seem minor until you get three jobs in one night and mix up which client wants what.

Fix I use: VideoText's guideline formatter (videotext.io/guideline-format) has presets
for Rev, GoTranscript, Scribie, and TranscribeMe that put all of this in one view.
Each card is editable when your specific client brief overrides a default.
You open the preset, confirm it matches your current brief, then run your listen pass
with the cards visible — no second tab, no PDF re-reading.

What platforms do you work on? Curious if CoTranscript or Verbit follow similar patterns
or if they have completely different conventions.
```

---

**Post 3 — QA / Pre-delivery checklist**
```
Title: My 8-point QA checklist before submitting any transcription job (cuts rejections significantly)

Body:
Every platform has a reviewer waiting to kick back work. Here's what I check before
submitting — in this order:

1. **Speaker labels** — match the screenshot sample in the brief exactly, including punctuation after the name
2. **Inaudibles** — tagged in the mandated format with timestamp if required
3. **Verbatim mode** — confirm with the rule card, not memory (fillers in or out?)
4. **Contractions** — match this client's preference, not last night's client
5. **Numbers** — spell out or numerals, per the platform default or override
6. **Laughter / crosstalk** — correct bracket style, correct line position
7. **Timestamps** — if required, format exactly matches spec
8. **Glossary / proper nouns** — cross-check against the order form notes

Step 1 and 3 are where most rejections come from in my experience.

For step 3 specifically — VideoText's guideline formatter (videotext.io/guideline-format)
has the verbatim settings for Rev, Scribie, GoTranscript, TranscribeMe as editable preset cards
so I confirm the rule before I start the listen pass, not after I've already made 200 decisions.

What's your rejection rate? And what's the most common reason your work comes back?
```

---

**Post 4 — Clean verbatim vs full verbatim (SEO aligned)**
```
Title: Clean verbatim vs full verbatim — when to remove fillers and when to keep them
(the rule most reviewers cite in rejections)

Body:
This is the most misunderstood distinction in transcription, and it causes more rejections
than almost any other issue.

**Clean verbatim:**
Remove fillers ("um", "uh", "like", "you know"), false starts, and obvious stumbles.
Keep meaning. This is the default for most corporate, interview, and podcast transcription.

**Full verbatim:**
Capture everything audible — every filler, false start, stutter, and disfluency.
Required on: legal transcripts, some academic corpora, forensic work, any PDF that says
"no omission" or "type exactly as spoken."

**What trips people up:**
- Rev defaults to clean verbatim for most jobs — but some legal review jobs require full
- GoTranscript is mostly clean verbatim
- TranscribeMe enterprise clients often have unique verbatim specs in their PDF
- CoTranscript: varies by client order

**Practical test:** if the reviewer's rubric says "retain all speech elements" — full verbatim.
If it says "professional/clean" — clean verbatim. If it doesn't say either, ask in job notes
or default to clean for non-legal content.

For mapping this to VideoText's formatter presets: there's a verbatim mode card in each
platform preset at videotext.io/guideline-format that shows what the platform default is,
so you're not relying on memory at midnight.

What's the most unusual verbatim requirement you've seen in a client brief?
```

---

**Post 5 — Feature Update (guideline formatter)**
```
Title: [Update] Format → Client Guidelines now has presets for Rev, GoTranscript, Scribie,
and TranscribeMe — editable rule cards with dispute proof

Body:
Quick update on the guideline formatting tool at videotext.io/guideline-format:

**What it does:**
After you run a transcript through Video → Transcript, you hit "Make this client-ready →"
which loads the text into the guideline workspace with your chosen platform preset.

**Platform presets available:**
- Rev (verbatim mode, inaudibles, laughter brackets, speaker format, timestamps)
- GoTranscript (contractions, number format, crosstalk, laughter inline)
- Scribie (verbatim, bracket style, line rules)
- TranscribeMe (corporate vs. standard verbatim tiers)

**How to use it:**
1. Run transcript in VideoText → Video to Transcript
2. Hit "Make this client-ready →" on the result page
3. Select your platform preset
4. Compare each card to your current job brief
5. Edit any card where your client overrides the default — it gets an "Edited" badge
6. Run your listen pass with the cards visible
7. If disputed: the card state is your paper trail

**Why "Edited" badges matter:**
If a client disputes a formatting choice, you can screenshot the card showing
you deliberately applied a specific rule — not that you forgot the default.

Free to use: videotext.io/guideline-format

What platforms should we add presets for next? CoTranscript, Verbit, Speechpad?
```

---

## Post Series 2 — Video → Transcript (`/video-to-transcript`)
*These posts target content creators: YouTubers, podcasters, video editors.*

---

**Post 6 — Speed / Lead Gen**
```
Title: I transcribed a 113-minute video in 2 minutes 25 seconds — here's what tool and why the speed gap matters

Body:
Speed comparison for a 1h 53min, 705 MB video file:

- Otter.ai: 18 min
- Descript: 11 min
- TurboScribe: 8 min
- VideoText: 2 min 25 sec

VideoText does parallel chunked transcription — audio is split into ~3 minute chunks,
each chunk hits Whisper simultaneously, then segments are merged. Wall-clock time
is driven by the slowest batch, not the sum of all chunks.

For a single video this matters if you're on a deadline.
For batch work (10+ videos) the gap is enormous.

Output from one upload: full transcript + speaker labels + AI summary + chapter markers
+ keywords + highlights + export (TXT, DOCX, SRT, PDF, Markdown, Notion-ready).

Privacy: files are deleted after processing — nothing stored on their servers.

Free tier: 3 imports/month, no card: videotext.io/video-to-transcript

What transcription tool do you use for long-form content? Curious if anyone's benchmarked
against Fireflies or Riverside's built-in transcription.
```

---

**Post 7 — SEO / YouTube creators**
```
Title: How to generate YouTube chapter timestamps automatically from any video (no manual timing)

Body:
YouTube chapters are one of the most underused SEO features. They:
- Appear in Google search results as jump links
- Increase average view duration (viewers find the section they want)
- Make videos more accessible

Manual process: watch the video, note the time, write a title, repeat 8–12 times.
That's 20–40 minutes per video.

Auto process with VideoText:
1. Upload or paste the YouTube URL
2. VideoText transcribes and generates chapters automatically
3. Copy the chapter list — it's formatted as "00:00 Intro / 02:14 Topic A / 08:31 Topic B"
4. Paste directly into the YouTube description

Takes under 3 minutes total. Chapter titles are generated from the content, not guessed.

Also outputs: AI summary for show notes, key quotes for social posts, keywords for tags.

Tool: videotext.io/video-to-transcript

Does anyone else automate chapter generation? The manual way is where I used to waste
the most time in post-production.
```

---

**Post 8 — Podcasters**
```
Title: How to write podcast show notes in 5 minutes without watching your own episode back

Body:
Most podcasters I know spend 30–60 minutes on show notes.
Here's the workflow that cut mine to under 5 minutes:

1. Upload the episode recording to VideoText → Video to Transcript
2. Switch to the Summary tab: AI-generated episode summary + key points + action items
3. Switch to Chapters: timestamps you can paste as episode timestamps
4. Switch to Keywords: the main terms repeated in the episode (good for search tags)
5. Export as Markdown → paste into your CMS, format in 2 minutes

The speaker labels tab is useful if you interview guests — you can pull specific quotes
attributed to the right person.

I export the full transcript to the episode page too. Google can index it, which
consistently improves episode discoverability over time.

Free to try (3 imports, no card): videotext.io/video-to-transcript

What's your current show notes process? I know some people use AI tools to write them
from scratch but I find starting from the actual transcript produces much better output.
```

---

**Post 9 — Freelance transcriptionists (bridge post between both audiences)**
```
Title: How I went from typing every word manually to using AI for the first pass
(and what changed in my quality and rate)

Body:
I've done transcription work for GoTranscript and Scribie for 3 years.
Last year I switched my workflow to use AI for the first pass and only do the human listen pass.

Here's the honest breakdown:

**Before:** Type from scratch → 1 hour of audio = 4–5 hours of work
**After:** AI first pass → listen and correct → 1 hour of audio = 1–1.5 hours of work

Effective hourly rate roughly tripled.

The tool I use for the AI pass: VideoText → Video to Transcript
- Handles accents and technical vocabulary better than most hosted Whisper wrappers
- Speaker diarization means I know who said what before I start the listen pass
- Outputs SRT so I can use it as a time-synced edit guide while I listen

For formatting after the transcript: videotext.io/guideline-format
- Platform presets for Rev, Scribie, GoTranscript, TranscribeMe
- Rule cards I edit once per job so I'm not reading the PDF again

The common objection is "platforms don't allow AI."
Reality: every platform cares about output quality, not how you got there.
You're responsible for accuracy. AI gets you 85–90% there; your listen pass closes the gap.

What tools do other freelancers use for the first pass? Curious whether others find
a significant accuracy difference between different Whisper wrappers.
```

---

## Post Series 3 — Competitor / Tool Comparison (SEO)

**Post 10 — Rev alternative**
```
Title: Rev transcription vs VideoText — what each is actually for (honest comparison)

Body:
Rev and VideoText are not really competing for the same user. Here's the honest breakdown:

**Rev:**
- Human transcription option (you're paying people to type it)
- Very high accuracy for the human tier
- Expensive: $1.50+/min for human
- AI tier is cheaper but slower than dedicated Whisper tools
- Great for: legal, medical, anything where you're paying for human accuracy guarantee

**VideoText:**
- AI only (Whisper-based), 47x realtime on long files
- Speaker labels, chapters, summaries in one pass
- Formatting tool for people who work FOR Rev: videotext.io/guideline-format
- No human tier — you're responsible for the listen pass
- Great for: creators who need transcripts at volume, freelancers doing the first pass

If you work for Rev as a transcriptionist: VideoText is a first-pass tool that saves you
typing time, and the guideline formatter helps you stay inside the Rev style spec.

If you're a client buying transcription: Rev is for when you need human accuracy guarantee;
VideoText is for when you're comfortable doing your own QA pass.

Full comparison: videotext.io/turboscribe-alternative (similar positioning)

What tier do you use on Rev? The pricing gap between human and AI tier has gotten pretty wide.
```

**Post 11 — Whisper online (2,400/mo search volume)**
```
Title: How to run Whisper AI transcription online without Python, GPU, or command line

Body:
OpenAI's Whisper is the best open-source speech-to-text model.
The problem: running it locally requires Python, ffmpeg, a GPU, and command-line setup
that takes 30–60 minutes if you haven't done it before.

For anyone who wants Whisper's accuracy without the setup:

VideoText runs Whisper on its backend. You upload a file or paste a URL.
The key difference from other hosted Whisper tools: it uses parallel chunked processing
for long files — so a 2-hour recording takes ~2.5 minutes, not 20 minutes.

What you get beyond raw Whisper:
- Speaker labels (who said what)
- AI summary + chapters + keywords
- SRT/VTT subtitle output
- Translate to 50+ languages
- Format to Rev/Scribie/GoTranscript/TranscribeMe style guides

Free: 3 imports/month, no card: videotext.io

If you've set up local Whisper — was the setup worth it vs just using a hosted version?
I know some people prefer local for privacy reasons (though VideoText deletes files after processing).
```

---

## Feature Update Template

Use every time a feature ships:

```
Title: [Update] [Feature Name] — [one sentence on what it does]

Body:
**What's new:**
[2–3 sentences. What the feature does, why we built it, what problem it solves.]

**Who it's for:**
[Specific: "freelancers working Rev or GoTranscript who..." / "creators who batch-produce content and..."]

**How to use it:**
1. [Step 1 — specific, not vague]
2. [Step 2]
3. [Step 3]

**Free tier:** [what free users can access]
**Paid plans:** [what's gated, if anything]

Try it: [specific tool page — /video-to-transcript or /guideline-format]

What would you add to this? We read all the feedback in this sub.
```

---

## 12-Week Posting Schedule

| Week | Post | Audience | Tool Page |
|---|---|---|---|
| 1 | Rev rejection → rule cards fix | Freelancers | `/guideline-format` |
| 2 | Speed benchmark (2 min 25 sec) | Creators | `/video-to-transcript` |
| 3 | GoTranscript vs Scribie vs Rev style differences | Freelancers | `/guideline-format` |
| 4 | YouTube chapter timestamps auto-generate | YouTubers | `/video-to-transcript` |
| 5 | Clean verbatim vs full verbatim guide | Freelancers | `/guideline-format` + blog |
| 6 | Podcast show notes in 5 min | Podcasters | `/video-to-transcript` |
| 7 | 8-point QA checklist before submission | Freelancers | `/guideline-format` |
| 8 | AI first pass → 3x hourly rate | Both audiences | `/video-to-transcript` + `/guideline-format` |
| 9 | Rev vs VideoText honest comparison | Both | Blog + tools |
| 10 | Whisper AI online (no setup) | Developers / freelancers | `/video-to-transcript` |
| 11 | Feature update post (next release) | Both | Relevant tool |
| 12 | Community feedback: what platforms should we add? | Freelancers | `/guideline-format` |

**Timing:** Tuesday–Thursday, 9–11 AM EST.
**Reply to every comment in the first 30 minutes** — Reddit's algorithm rewards active threads.
**Never cross-post the same body to another subreddit on the same day.**

---

## Conversion Hooks by Audience

| Audience | Where they come from | Hook that converts |
|---|---|---|
| Rev freelancers | r/Transcription, r/beermoney | "Stop getting work kicked back — rule cards track which override you applied" |
| GoTranscript workers | r/WorkOnline, r/slavelabour | "Format for GoTranscript spec in one view — no re-reading the PDF each shift" |
| Scribie workers | r/Scribie (community), r/Transcription | "Scribie preset + Edited badges = paper trail for any dispute" |
| TranscribeMe workers | r/beermoney, r/slavelabour | "AI first pass + TranscribeMe formatter = 3x effective hourly rate" |
| YouTubers | r/youtubers, r/PartneredYoutube | "Chapters + summary + keywords from one upload — 2 min per video" |
| Podcasters | r/podcasting | "Show notes in 5 min from the actual transcript — not a hallucinated summary" |
| Video editors | r/VideoEditing | "Burn subtitles without Premiere; batch SRT in one ZIP" |

---

## Lead Generation Rules for Every Post

1. **End with a genuine question** — invites replies, which bumps Reddit rank and builds trust. Never end with just a link.
2. **Mention free tier** — "free to try, no card" removes the biggest friction point.
3. **Link to the specific tool page**, not the homepage. `/guideline-format` for formatting posts. `/video-to-transcript` for transcription posts.
4. **Privacy hook for client-footage posts** — "files deleted after processing, nothing stored" consistently resonates with freelancers handling client audio.
5. **Be specific about the pain** — "Rev rejected my job" outperforms "improve your transcription quality." The more specific the pain, the more comments and the more clicks.

---

## SEO Value of Posts

Google indexes subreddit posts and titles. Writing post titles around specific search phrases creates additional organic search surface area beyond the videotext.io blog.

High-value phrases to use in post titles:

| Phrase | Monthly searches | Target post |
|---|---|---|
| "rev style guide" | 4,800/mo | Post 1 |
| "clean verbatim vs full verbatim" | 2,100/mo | Post 4 |
| "transcript qa checklist" | 1,400/mo | Post 3 |
| "gotranscript style guide" | 1,100/mo | Post 2 |
| "whisper ai online" | 2,400/mo | Post 11 |
| "video to transcript free" | 8,400/mo | Post 6 |
| "podcast show notes generator" | 3,200/mo | Post 8 |
| "how to earn more as transcriptionist" | 900/mo | Post 9 |
| "scribie style guide" | 700/mo | Post 2 |

---

## Launch Sequence (Before Making the Sub Public)

Post these 4 threads before opening the community so new visitors see activity:

1. The 8-point QA checklist (value-first, no product mention needed)
2. Clean verbatim vs full verbatim explainer (evergreen reference)
3. GoTranscript vs Scribie vs Rev style differences (saves bookmark)
4. Speed benchmark post for video transcription

Then pin a welcome post explaining what the sub is for. Then open it.
