# SSR SEO Document Content Audit

## Removed engineering-language phrases

The crawlable SEO document templates no longer emit these implementation-focused phrases in public page copy:

- "This route is rendered as semantic HTML at build time so crawlers see more than an empty SPA shell."
- "Interactive controls remain browser-hydrated..."
- "Hydration-safe app shell"
- "The React SPA takes over..."
- "Does this prerendered page replace the app?"
- "semantic route summary"
- "Crawlable internal links"
- "prerendered document"
- "Fully prerendered HTML for search crawlers, SEO tools, and LLM agents."
- "Complete HTML Index for Crawlers"
- "Crawler Navigation"
- Site-index copy that explained crawlability, rendering, route inventory, or crawler discovery instead of user workflows.

## Rewritten sections

### Shared SEO document fallback

The generic fallback now explains practical workflow outcomes instead of the rendering system:

- Pages describe the transcript, subtitle, formatting, export, or comparison task they support.
- Output examples were changed from infrastructure labels to workflow summaries, related handoffs, and practical next steps.
- The generic FAQ now answers how to use the workflow instead of whether a prerendered page replaces the app.

### `/guideline-format`

The page now has dedicated expert copy for transcript formatting workflows:

- Rev-style formatting rules: speaker labels, paragraph breaks, timestamp treatment, notation, and clean verbatim delivery.
- GoTranscript QA requirements: label consistency, timestamp placement, inaudible/crosstalk notation, and verbatim-level alignment.
- Clean vs full verbatim guidance.
- Timestamp formatting and speaker-turn consistency.
- QA rejection reduction before marketplace or client delivery.
- Client-ready transcript delivery and export preparation.
- Formatting automation workflows for freelancers, agencies, QA leads, creators, and researchers.

### `/video-to-transcript`

The core transcription page was strengthened around user intent:

- Long-video processing for webinars, interviews, courses, meetings, podcasts, and research sessions.
- One upload producing transcript text, SRT/VTT subtitles, summaries, chapters, JSON, DOCX, PDF, and share links.
- Structured outputs that replace separate transcription, captioning, note-taking, and summarization tools.
- Searchable transcript use cases for quotes, decisions, chapters, action items, and clip briefs.
- Creator/team workflows and flexible handoff options.

### Site index and global shortcuts

Public copy now frames `/site-index` as a workflow map instead of a crawler map:

- It groups transcription, subtitle, style-guide, comparison, sample, and utility resources.
- Global shortcuts are labeled as workflow shortcuts rather than crawler navigation.

### Programmatic intent pages

Repeated generic deep-content blocks are now lightly personalized per generated page:

- Proof points include the target workflow name.
- Workflow steps mention the specific source type and output context.
- Use-case titles and bodies are differentiated by target, reducing repeated wording across podcast, meeting, interview, YouTube, platform, and language pages.

## Before vs after HTML snippets

### Generic fallback proof point

Before:

```html
<li>This route is rendered as semantic HTML at build time so crawlers see more than an empty SPA shell.</li>
```

After:

```html
<li>Each page focuses on a specific transcript, subtitle, formatting, or export task so teams can match the workflow to the outcome they need.</li>
```

### Generic fallback output card

Before:

```html
<article class="vt-ssr-card">
  <h3>Hydration-safe app shell</h3>
  <p>The static content is available immediately, and the React SPA takes over for uploads, editors, and account-specific behavior.</p>
</article>
```

After:

```html
<article class="vt-workflow-card">
  <h3>Practical next steps</h3>
  <p>Start with the matching VideoText tool, review the output, then export the asset your creator, editor, client, or team needs.</p>
</article>
```

### Generic FAQ

Before:

```html
<summary>Does this prerendered page replace the app?</summary>
<p>No. It provides semantic HTML for crawlers and fast first content, then the existing Vite React SPA hydrates and preserves the full client experience.</p>
```

After:

```html
<summary>How should I use this workflow?</summary>
<p>Use the page to understand the workflow, then start with the recommended transcript, subtitle, translation, formatting, or utility tool for the job.</p>
```

### `/guideline-format` expert workflow copy

Before:

```html
<h2>Outputs you can use immediately</h2>
<article class="vt-ssr-card">
  <h3>Semantic route summary</h3>
  <p>Format transcripts to client style guides...</p>
</article>
```

After:

```html
<h2>Outputs you can use immediately</h2>
<article class="vt-workflow-card">
  <h3>GoTranscript QA checklist</h3>
  <p>Catch common rejection triggers: wrong timestamp format, mixed speaker labels, missing crosstalk notes, inconsistent punctuation, and unsupported verbatim choices.</p>
</article>
```

### Site index

Before:

```html
<h3>Crawler Navigation</h3>
<p>This crawlable HTML index links to every prerendered page for search engines and LLM agents.</p>
```

After:

```html
<h3>Workflow shortcuts</h3>
<p>Use this index to jump to VideoText transcript, subtitle, formatting, comparison, sample, and utility workflows.</p>
```
