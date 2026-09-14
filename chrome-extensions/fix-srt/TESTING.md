# Testing — Fix SRT — VideoText

Load the unpacked build from `chrome-extensions/fix-srt/dist/` (Manifest V3). The store zip is `artifacts/videotext-fix-srt-v1.0.0.zip`.

## Automated tests (this repo)

```bash
cd chrome-extensions/fix-srt
npm test
npm run build
```

`npm test` covers local SRT validation and a dist bundle audit (secrets, `eval`, localhost, permissions). It cannot sign in to production or run a live Fix SRT job.

## Manual Chrome tests

1. **Extension installation**  
   Chrome → `chrome://extensions` → Developer mode → Load unpacked → select `chrome-extensions/fix-srt/dist`. Toolbar icon and name **Fix SRT — VideoText** appear. No extra permissions beyond Storage and `api.videotext.io`.

2. **Popup / interface**  
   Click the icon. Heading is **Fix SRT**, supporting copy describes overlap repair and optional passes, not generic “AI magic.” Drop zone and Select SRT File are visible.

3. **Valid SRT**  
   Drop a well-formed two-cue file. Filename, size, cue count, and duration show. Fix SRT enables after sign-in.

4. **Malformed SRT**  
   File named `.srt` with no `-->` timestamps. Client shows: no SRT timestamps found. Fix SRT stays disabled.

5. **Empty SRT**  
   Empty or whitespace-only `.srt`. Client shows empty-file error.

6. **Large SRT**  
   File &gt; 2 MB and &lt; 10 MB: warning about longer processing. File &gt; 10 MB: rejected locally.

7. **Existing correctly formatted SRT**  
   Valid file with no overlaps. Fix still runs (server re-serializes; overlaps always resolved). Result may report zero findings.

8. **File with repairable issues**  
   Overlapping timestamps. Client warns about overlaps. After Fix SRT, findings should include overlapping cues and the preview should no longer overlap.

9. **Processing failure**  
   Use a session that can upload but force a worker/server failure (or revoke the job). Popup shows **Could not finish** with the server/network message. No fake 100% success.

10. **Network failure**  
    Disconnect after upload. After repeated poll failures the popup reports a network error. No invented progress percent.

11. **Logged-out user**  
    Fresh profile / Sign out. File can be selected. Primary action requires **Sign in to VideoText**. Upload does not start.

12. **Free user**  
    Sign in with a free VideoText account that still has imports. Fix SRT uploads to the real API and consumes one import on success. Download may include the free-plan watermark cue.

13. **Free allowance exhausted**  
    Same account at 0 remaining imports. Extension shows upgrade copy and links to https://videotext.io/pricing. It must not upload.

14. **Paid user**  
    Pro/basic/agency session. Fix SRT succeeds without the free watermark note (server still authoritative).

15. **Corrected SRT preview**  
    Result panel shows a monospaced cue preview from the downloaded server file, not a client-side rewrite.

16. **Download**  
    Download Fixed SRT saves `{name}_subtitles_fixed.srt` (or the server `fileName`). Open in a text editor and confirm SRT structure.

17. **Fix another file**  
    Fix Another SRT clears the file, options, and result and returns to the drop zone.

18. **No usage-limit bypass**  
    Compare `GET /api/usage/current` before and after a successful job. Import count increases. A second attempt at 0 remaining is blocked.

19. **No exposed secrets**  
    Inspect `dist/*.js`. There are no OpenAI, Stripe, database, or `vt_live_` keys. Only the public API origin.

20. **No unnecessary Chrome permissions**  
    `chrome://extensions` details: `storage` + host `https://api.videotext.io/*`. Content script only on `videotext.io` / `www.videotext.io` for session sync. No `<all_urls>`, tabs, downloads, or cookies.

## Notes

- Opening VideoText in a tab while signed in syncs the site `localStorage` session into the extension (`content-auth.js`). Sign out in the popup is local until you visit videotext.io again.
- Google-only website accounts without a password should use **Open VideoText** (site session sync) rather than the email/password form.
- Live production jobs cost a real import. Prefer a staging/test account when possible.
