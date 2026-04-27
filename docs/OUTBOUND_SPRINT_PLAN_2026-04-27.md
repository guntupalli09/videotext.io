# VideoText GTM Outbound Sprint Plan (Code-Inferred)

Date: 2026-04-27

## Step 1 — Product understanding from code

### What the product does
VideoText is a web app + API that processes user-uploaded video/audio/subtitle files into transcript and subtitle outputs. Core workflows include:
- Video to transcript with optional speaker diarization, summaries, chapters, and exports.
- Video to subtitles (SRT/VTT), including multi-language outputs as a ZIP.
- Subtitle translation, subtitle fixing, subtitle format conversion.
- Burn subtitles into video and compress video.
- Batch subtitle/transcript pipeline for multiple files (paid plans).

The canonical tool map and upload→queue→worker architecture are explicitly documented in README and architecture docs, and implemented via Express routes, Redis/Bull queues, and worker processors.

### Problem solved
The app removes the manual, fragmented workflow of: extracting audio, transcribing, editing timestamps, translating captions, generating summaries/chapters, and formatting exports across multiple tools.

### User input and output
Inputs:
- Uploaded video/audio files or subtitle files.
- Optional tool parameters: language, target language, subtitle format, trim range, extra translation languages, compression settings.

Outputs:
- Transcript text and structured transcript artifacts (summary/chapters/segments).
- Subtitle files (SRT/VTT/TXT), translated files, fixed files.
- Rendered MP4 with hardcoded subtitles.
- Compressed MP4.
- Batch ZIP archives for multi-video runs.

### Integrations and workflows touched
- OpenAI for transcription/translation/summarization paths.
- FFmpeg for audio extraction, subtitle burn-in, and compression.
- Stripe for subscriptions and billing portal.
- Redis + Bull queue for asynchronous processing.
- Postgres/Prisma for users, jobs, analytics, feedback, sharing links.
- Optional YouTube metadata/caption handling service and rate controls.

### Data processed/created
- User/account/subscription and plan limits.
- Job metadata (tool type, duration, status, processing times, cost tracking).
- Usage/metering and overage-adjacent counters.
- Feedback and event logs.
- Public transcript-share snapshots for paid tiers.

## Step 2 — ICP definition (code-constrained)

### Primary ICP
**Who:**
- Content Operations Manager
- Podcast Producer / Post-Production Lead
- YouTube Channel Manager
- Agency Operations Manager (video localization/transcript deliverables)

**Best-fit verticals:**
- Podcast networks
- YouTube-first media businesses
- Video marketing agencies and post-production shops
- EdTech/course creators with high upload volume

**Company size likely to pay quickly:**
- 2–50 employees (creator teams, boutique agencies, media startups)
- Rough revenue band: ~$250k–$10M ARR equivalent where $10–$99/mo tool spend is low-friction.

**Pain eliminated:**
- Slow turnaround from raw video to publish-ready transcript/subtitle deliverables.
- Tool sprawl (different tools for transcript, caption fix, translation, burn-in, export).
- Inability to process backlogs and multilingual requests quickly.

**Painful alternative today:**
- Manual transcript cleanup + timestamp editing in desktop editors.
- Multiple SaaS subscriptions and copy/paste handoffs.
- Freelancer or VA-based subtitle/translation operations with inconsistent SLAs.

**Why they pay in 72 hours:**
- Immediate bottleneck relief: batch processing, long-video limits, translation, and one-upload workflow are visible quickly in first run.
- Clear paid unlocks (no watermark, longer videos, queue priority, sharing links, batch capabilities).

### Secondary ICP (stretch)
- User research / qualitative research teams that transcribe interviews and produce summaries.
- Small legal/compliance teams that need faster transcript drafts from hearings/webinars.
- Internal L&D teams creating multilingual training content.

### Anti-ICP
- Hobby users who process one short clip per month.
- Students/DIY users needing entirely free, unlimited usage.
- Enterprises requiring strict procurement/security review before pilot.
- Teams needing live call-center transcription at enterprise SLA (product is built around file/batch pipeline).

## Step 3 — 3-week outbound automation to 20 paid users

### A) Lead finding (specific sources + filters)

#### LinkedIn Sales Navigator filters
Use three saved searches:

1) **Creator/media ops pod**
- Titles: "Podcast Producer", "Content Operations Manager", "YouTube Producer", "Head of Content", "Video Editor"
- Company headcount: 2–50
- Industry: Online Media, Broadcast Media Production, Entertainment Providers, Marketing Services
- Geography: US, UK, CA, AU
- Seniority: Owner, Manager, Director

2) **Agency pod**
- Titles: "Agency Owner", "Operations Manager", "Post Production Supervisor", "Creative Operations"
- Company headcount: 2–100
- Industry: Marketing Services, Advertising Services, Media Production

3) **Education/content studio pod**
- Titles: "Course Producer", "Learning Experience Designer", "Content Manager"
- Company headcount: 10–200
- Industry: E-learning Providers, Higher Education, Professional Training

#### Communities and social sources
- Reddit: r/podcasting, r/youtubers, r/VideoEditing, r/NewTubers, r/Filmmakers.
- X/Twitter search queries:
  - "need subtitles for" 
  - "transcribe podcast" 
  - "caption workflow" 
  - "otter descript tedium" 
- Indie Hackers and creator Discord/Slack groups focused on YouTube/podcast growth.
- YouTube channels posting weekly long-form episodes (public email often available).

#### Tool stack
- Apollo.io (prospect database + sequencing)
- Clay.com (signal enrichment + AI personalization)
- Hunter.io or Dropcontact (email verification/fill)
- PhantomBuster (LinkedIn export / profile scraping where policy-compliant)
- Instantly/Lemlist/Smartlead (cold email automation)
- HubSpot free CRM (pipeline + hot lead tracking)

#### Volume math
- Target paid users: 20
- Assume trial→paid = 30%, trial booking/start = 3%, reply = 8%
- Need ~67 trial starts to get ~20 paid
- At 3% booking/start, need ~2,200 contacted leads
- If your warm shortlist converts better (5% booking), still need ~1,340 contacts

**Plan:** source 1,500–2,200 leads over 3 weeks, with first 400 by Day 4.

### B) Enrichment data schema
Collect per lead:
- `first_name`
- `email`
- `job_title`
- `company`
- `company_size`
- `industry`
- `monthly_video_volume_estimate` (signal)
- `content_type` (podcast / youtube / agency client work)
- `specific_pain` (manual subtitles, turnaround delays, translation load, backlog)
- `current_stack_signal` (e.g., mentions Otter/Descript/Rev)
- `last_content_date` (freshness)
- `linkedin_url`

Enrichment flow:
1. Source in Apollo.
2. Push to Clay for website/social/content-signal scraping and pain inference.
3. Validate emails via Hunter/Dropcontact.
4. Route leads into sequence by pain cluster (speed, multilingual, batch backlog).

### C) Email sequences (fully written)

CTA chosen for all emails: **Start free trial**
Cadence: Day 1, Day 4, Day 9
Variables: `{{first_name}}`, `{{company}}`, `{{specific_pain}}`

#### Sequence 1 — Pain-focused

**Email 1 (Day 1)**
Subject: `Caption backlog?`

Hi {{first_name}},

Saw {{company}} is publishing video regularly. Quick guess: {{specific_pain}} is slowing turnaround.

Most teams we talk to are still juggling 2–4 tools to transcribe, fix subtitles, translate, and export final files.

VideoText handles that in one pipeline: upload once, get transcript + subtitle outputs (including fixes/translations) without the copy-paste loop.

Worth testing on one recent episode?

Start free trial: https://videotext.io/pricing

**Email 2 (Day 4)**
Subject: `Still doing this manually?`

Hey {{first_name}},

Following up because teams like {{company}} usually lose hours/week on {{specific_pain}}.

If you upload one file in VideoText, you can immediately see transcript, chapters/summary, subtitle outputs, and exports from a single run.

If it doesn’t save you time in the first project, ignore me.

Try it free: https://videotext.io/pricing

**Email 3 (Day 9)**
Subject: `Close this loop?`

{{first_name}}, last note from me.

If {{specific_pain}} is still a bottleneck, run one test file this week and compare your current workflow time vs VideoText.

Teams stick when they see the first-file speedup.

Start free trial here: https://videotext.io/pricing

#### Sequence 2 — Outcome-focused

**Email 1 (Day 1)**
Subject: `Ship faster this week`

Hi {{first_name}},

For {{company}}, the win is simple: faster publish cycles from raw video to final transcript/subtitles.

VideoText gives one-upload output: transcript, subtitle files, optional translation, and downloadable assets.

So instead of handoffs across multiple tools, your team finishes in one pass.

Want to test it on your next file?

Start free trial: https://videotext.io/pricing

**Email 2 (Day 4)**
Subject: `One upload, multiple outputs`

Hi {{first_name}},

Quick reminder: if {{specific_pain}} is blocking your content cadence, this is exactly what VideoText is built for.

Upload once, then export what you need (transcript/subtitles/final assets) without reprocessing in separate apps.

Can I nudge you to run one file today?

Start free trial: https://videotext.io/pricing

**Email 3 (Day 9)**
Subject: `Worth a 10-minute test`

Hey {{first_name}},

If you can spare one test upload, you’ll know quickly whether VideoText reduces your team’s turnaround time.

Low-risk: run a recent file, compare against your current process, keep only if it saves time.

Start free trial: https://videotext.io/pricing

#### Sequence 3 — Social proof / FOMO

**Email 1 (Day 1)**
Subject: `Creators are consolidating tools`

Hi {{first_name}},

We’re seeing creator and agency teams move from fragmented caption workflows to one pipeline because {{specific_pain}} keeps compounding.

VideoText is being used to process transcript/subtitle work from a single upload, then export quickly for publishing.

If {{company}} is scaling output, this is worth a test now vs later.

Start free trial: https://videotext.io/pricing

**Email 2 (Day 4)**
Subject: `Don’t let ops lag growth`

{{first_name}},

When publishing volume goes up, {{specific_pain}} usually becomes the blocker first.

Teams using VideoText reduce context-switching across tools and keep releases on schedule.

You can validate that with one file this week.

Start free trial: https://videotext.io/pricing

**Email 3 (Day 9)**
Subject: `Last ping`

Hi {{first_name}},

I’ll close this out after this message.

If subtitle/transcript operations are still manual at {{company}}, you can likely reclaim hours each week by consolidating the workflow.

If useful, start here:
https://videotext.io/pricing

### D) Follow-up automation logic

1. **Opened, no reply**
- Continue normal cadence to Email 2 and Email 3.
- Swap subject line on next touch (short + specific).

2. **Replied with interest**
- Move to “Hot Lead” track:
  - immediate human reply (<1 hour)
  - send 2-line trial activation prompt with one use-case setup tip
  - 48-hour check-in on trial progress

3. **Replied with objection**
Use templates:
- **"We already use X"**
  - Totally fair. Most users keep X for part of workflow and use VideoText to remove the slowest step: {{specific_pain}}. Worth a side-by-side test with one file?
- **"No budget"**
  - Understood. If one test doesn’t save time this week, don’t continue. If it does, the monthly cost is usually lower than even a few hours of manual editing.
- **"Not now"**
  - Makes sense. Want me to circle back in 30 days? Meanwhile, here’s a quick-start link when timing opens.

4. **No open after 7 days**
- Pause email.
- Trigger LinkedIn connection request:
  - “Hey {{first_name}} — loved what {{company}} is publishing. I share practical transcript/subtitle workflow ideas for media teams. Open to connect?”

### E) Conversion layer recommendations

#### Landing headline
“Turn raw videos into publish-ready transcripts and subtitles in one workflow.”

#### One-line value prop
“Upload once, get transcript, subtitle, translation, and export outputs—without tool-hopping.”

#### Pricing psychology
- Keep **free trial / free entry** for activation (already in product motion).
- Push clear Pro ROI framing: “saves X hours/week for teams publishing Y videos.”
- Keep plan simplicity (Free vs Pro primary) to reduce decision fatigue.

#### Frictionless onboarding for “aha” moment
- First-run wizard that asks only:
  1) upload file
  2) choose output goal (transcript vs subtitles)
  3) show instant result workspace + one-click export
- The “aha” is receiving a usable transcript/subtitle artifact from one upload in minutes.

## Step 4 — Day-by-day 3-week execution plan

### Week 1 (Setup + first 100 contacts)
- **Day 1:** finalize ICP list, build Apollo saved searches, define 3 pain clusters.
- **Day 2:** enrich first 400 leads in Clay; verify emails.
- **Day 3:** configure sequences + webhook automations + CRM stages.
- **Day 4:** send first 100 personalized emails (mix of 3 sequences).
- **Day 5:** send next 100; start LinkedIn touches for non-openers from earliest batch.
- **Day 6:** review open/reply by segment; kill weakest subject line.
- **Day 7:** goal checkpoint: 200 contacted, >=40% opens, >=8% replies.

### Week 2 (Follow-up + iteration)
- **Day 8:** Day-4 follow-ups auto-fire for Batch A.
- **Day 9:** send 150 new leads with winning copy.
- **Day 10:** process replies and objections; push interested leads to hot track.
- **Day 11:** send 150 more; prioritize agency + podcast pods if higher reply.
- **Day 12:** Day-9 follow-ups for Batch A; LinkedIn connect for no-opens.
- **Day 13:** optimize pain variable quality (`{{specific_pain}}` must be concrete).
- **Day 14:** checkpoint: 700–900 total contacted, 20–30 trial starts target.

### Week 3 (Close + convert)
- **Day 15:** focus only on engaged/hot leads; direct trial activation nudges.
- **Day 16:** send “quick wins” enablement email to all active trials.
- **Day 17:** manual outreach to partially activated users (started upload but no export).
- **Day 18:** objection rescue sequence for stalled opportunities.
- **Day 19:** final outbound burst to best-performing segment only.
- **Day 20:** conversion push: expiry/urgency reminder for undecided active trials.
- **Day 21:** closeout + cohort analysis; objective 20 paid users.

## Step 5 — Metrics, thresholds, and exact pivots

Targets:
- Open rate > 40%
- Reply rate > 8%
- Demo/trial booking > 3%
- Trial-to-paid > 30%

### If below target by Day 7, change this exactly:

1. **Open rate < 40%**
- Rewrite subject lines to short pain statements (2–5 words).
- Improve domain warm-up and sending reputation.
- Tighten list quality: remove generic titles, focus on managers/owners with active publishing.

2. **Reply rate < 8%**
- Increase personalization depth for `{{specific_pain}}` from generic to observable signals.
- Shorten Email 1 to <90 words.
- Use one clear claim tied to workflow (“one upload → multiple outputs”).

3. **Trial booking/start < 3%**
- Make CTA and landing path one-click to trial start.
- Add proof block above fold: “who this is for” + concrete outputs.
- Add “test one file in 10 minutes” onboarding prompt.

4. **Trial-to-paid < 30%**
- Improve in-product activation: guide to first export/download.
- Send Day 0 + Day 1 in-app/email nudges focused on single success metric (first usable output).
- Add plan upgrade moment right after visible result generation.

## Quick operating checklist
- Build to 1,500–2,200 leads.
- Segment by pain, not just title.
- Keep one CTA: start trial.
- Prioritize hot-lead speed: respond within 1 hour.
- Optimize weekly using reply + activation data, not vanity opens.
