# Frontend: How We Compare to Industry Leaders

This doc assesses the VideoText client against best-in-class tools (e.g. Rev, Otter, Descript, Kapwing) on **speed**, **accuracy** (of UX/data), **reliability**, **revisits**, and **cross-device/cross-browser compatibility**, and lists concrete gaps and improvements.

---

## What We Do Well (Already at or Near Industry Level)

| Area | What we have |
|------|----------------|
| **Speed** | Route-level code splitting (lazy load every page); prefetch on link hover/focus; PWA precache for static assets; vendor chunks (react, router, ui) for cache efficiency; mobile-optimized chunked upload (smaller chunks, sequential, timeout + retry). |
| **Reliability** | Central `api()` with optional timeout; GET/status/usage use 25s timeout so slow networks fail fast and polling continues; chunked upload retries (2 per chunk); job polling does *not* set failed on network errors (only on `status === 'failed'`); SessionErrorBoundary catches render errors; clipboard has fallback (textarea) when Clipboard API unavailable. |
| **Revisits** | PWA with precache (JS, CSS, HTML, static assets); no API caching so usage/billing/jobs stay correct; cleanupOutdatedCaches; autoUpdate SW. |
| **Cross-device** | Viewport meta; mobile detection for chunk size/parallelism; visibility-change toast during upload (“keep tab open”); theme (light/dark) with system preference and safe localStorage; touch-friendly nav and modals. |
| **UX on failure** | FailedState with “Try again” and clear copy; FAQ for mobile upload tips; friendly error messages (e.g. mapSubtitleUploadError); SessionExpiredError for 404 job. |

---

## Gaps vs Industry Leaders (and What Would Close Them)

### 1. **Cross-browser / device compatibility**

- **Current:** Build targets ES2020; no explicit browserslist; no legacy bundles or polyfills. Modern browsers (Chrome, Firefox, Safari, Edge on recent versions) are fine; older Safari (e.g. pre-15) or old Android WebView may hit AbortController/fetch/optional chaining issues.
- **Industry:** Most competitors support “last 2 versions” or a defined matrix and sometimes ship a legacy bundle (e.g. Vite legacy plugin) for very old browsers.
- **Recommendation:** Add a `browserslist` in `package.json` and set Vite `build.target` to a value derived from it (e.g. `es2020` or `chrome80`) so the build is consistent and we know the baseline. Add legacy plugin only if you need to support older browsers.

### 2. **Offline / network visibility**

- **Current:** No explicit “You’re offline” or “Connection lost” UI. API failures show generic or timeout messages; polling keeps going on network errors (good) but the user may not know the cause.
- **Industry:** Many apps show a small banner or toast when `navigator.onLine` becomes false, and sometimes when a request fails due to network.
- **Recommendation:** Add a minimal offline indicator (banner or toast when the app goes offline) and, where relevant, surface a “Check your connection and try again” message on network-type API failures.

### 3. **Error observability**

- **Current:** SessionErrorBoundary catches errors but only logs in dev; no production error reporting. Analytics are dev-only (console).
- **Industry:** Production errors are sent to a service (e.g. Sentry, LogRocket) and key events are tracked.
- **Recommendation:** In `componentDidCatch`, log in prod and/or call an error-reporting API when you add one. Keep analytics stub; plug in a real provider when ready.

### 4. **Accuracy (client-side)**

- **Current:** Preflight (file size, duration) avoids invalid uploads; backend drives transcription/subtitle accuracy. Client displays server result and handles copy/export correctly; no client-side “accuracy” logic beyond validation and display.
- **Industry:** Same idea: accuracy is mainly server-side; client focuses on validation, clear errors, and not corrupting data.
- **Recommendation:** Keep validation and preflight; add or tighten any file-type/length checks the backend expects so the client never sends requests that are guaranteed to fail.

### 5. **Tests**

- **Current:** No frontend unit or e2e tests in the repo.
- **Industry:** Leading products use unit tests for critical paths and e2e for main flows (upload, process, download).
- **Recommendation:** Add a test runner and start with a few tests for: `api()` timeout behavior, job lifecycle (e.g. getJobLifecycleTransition), and one critical user path (e2e) if possible.

### 6. **Accessibility**

- **Current:** Skip link, some `aria-` and `role=` usage (e.g. RouteFallback, SessionErrorBoundary, UserMenu), focus handling on modals.
- **Industry:** WCAG 2.1 AA: sufficient contrast, focus order, labels, live regions for dynamic content.
- **Recommendation:** Audit focus order and labels (especially forms and upload); add `aria-live` for progress/status updates where missing; ensure buttons/links have min touch target (e.g. 44px) on mobile.

### 7. **Unbreakability (hardening)**

- **Current:** Good foundations: timeouts, retries, error boundary, no fail-fast on poll errors. Some fetch paths could still throw uncaught if `.json()` or response handling fails in an unexpected way.
- **Industry:** Defensive parsing, safe fallbacks, and user-facing messages for every failure path.
- **Recommendation:** Ensure every user-triggered API path has a catch that shows a clear message (or triggers FailedState). Optionally add a global `unhandledrejection` handler that shows a generic “Something went wrong” and logs, so no uncaught promise leaves the user with a blank failure.

---

## Summary Table

| Criterion        | Today        | After recommended work |
|-----------------|-------------|-------------------------|
| Fast            | Strong      | Same (already strong)  |
| Accuracy        | Good        | Good (server-driven)   |
| Unbreakability  | Good        | Better (offline + errors) |
| Revisits        | Strong      | Same (PWA in place)    |
| Cross-device    | Good        | Better (browserslist + offline) |
| Cross-browser   | Modern only | Clear baseline or legacy |

Implementing the recommendations above would bring the client to a level comparable with industry-leading competitors on speed, reliability, revisits, and cross-compatibility, with a clear path for observability and tests.
