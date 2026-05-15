# SSR Architecture Plan

Generated: 2026-05-15T04:26:12.039Z

## Current architecture

VideoText remains a Vite + React SPA. Build-time prerendering writes route-specific HTML files. The upgraded SSR helper now supports direct React SSR for audited presentational pages and a registry-driven static SEO document for programmatic landing pages.

## Recommended scalable pattern

1. Keep uploader, editor, auth, dashboard, analytics, and billing behavior client-only.
2. Store durable SEO copy in registries/content objects rather than inside browser-heavy tool components.
3. Render that content with reusable SSR-safe sections: hero, proof points, workflow steps, output examples, comparison tables, use cases, FAQs, and related links.
4. Hydrate the SPA normally on the client; the server-rendered HTML is an SEO-rich shell that matches the page intent without executing browser APIs in Node.
5. Promote pages from Category B to direct React SSR only after browser APIs are guarded and lazy/client-only boundaries are explicit.

## Migration sequence

- Phase 1: Use `seo-document` mode for all registry SEO pages and high-value money pages.
- Phase 2: Refactor Category B pages by moving browser API reads into effects, adding `typeof window !== 'undefined'` guards, and isolating upload widgets behind client-only boundaries.
- Phase 3: Add direct `react-page` registration only for presentational pages with successful render validation.
- Phase 4: Keep build-time validation as a CI gate for indexable routes: render succeeds, HTML is large enough, and at least one H1 plus semantic sections exist.

## Build-time verification gates

- Route inventory must be written to `reports/ssr-routes.json`.
- Render validation must be written to `reports/ssr-render-validation.json`.
- Important SEO pages should not be accepted if they render only metadata, an injected H1, or an empty root.
