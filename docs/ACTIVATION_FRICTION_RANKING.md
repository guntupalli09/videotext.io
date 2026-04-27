# Activation Friction Ranking (Code-Based)

## P0 (Highest friction)

1. **Signup requires 3-step auth (email → OTP → password) before account is fully usable.**
   - Evidence: `Signup.tsx` state machine + three forms.
   - Files: `client/src/pages/Signup.tsx`.
   - Why this hurts: each extra step adds drop-off, especially on mobile.

2. **Core “quick win” path is partially gated post-processing for anonymous users.**
   - Evidence: result preview is shown, then auth-gate modal blocks full result/download.
   - Files: `client/src/pages/VideoToTranscript.tsx`, `client/src/components/JobAuthGateModal.tsx`.
   - Why this hurts: user receives value but hits a wall at the highest-intent moment.

3. **YouTube input mode is effectively disabled in the transcript tool despite being a major onboarding use-case.**
   - Evidence: comment says always file upload while `inputMode` is fixed.
   - Files: `client/src/pages/VideoToTranscript.tsx`.
   - Why this hurts: many new users prefer pasting a URL over file prep.

## P1 (Medium friction)

4. **Primary nav favors a large tools menu before first-action CTA flow.**
   - Evidence: tools dropdown is prominent, with broad routing options.
   - Files: `client/src/components/Navigation.tsx`.
   - Why this hurts: choice overload for first-time users.

5. **Pro access route creates a side path that can distract from free-user activation funnel.**
   - Evidence: `/pro-access` is live and `/demo` redirects there.
   - Files: `client/src/App.tsx`, `client/src/pages/Demo.tsx`.
   - Why this hurts: users can trial a high-capability path disconnected from standard free onboarding.

6. **Hard paywall language appears only at limit event (reactive), not progressive education throughout first session.**
   - Evidence: “3 imports used” modal appears once limit is reached.
   - Files: `client/src/components/PaywallModal.tsx`.
   - Why this hurts: no expectation setting early; frustration at cutoff moment.

## P2 (Lower friction, still meaningful)

7. **Onboarding cron targets only free users under job-count threshold and 3–6h window; if initial value messaging in app is weak, email carries too much load.**
   - Evidence: targeting + logging implemented in cron.
   - Files: `server/src/jobs/onboardingEmailCron.ts`.
   - Why this hurts: email rescue works best when in-product first-run clarity is already strong.
