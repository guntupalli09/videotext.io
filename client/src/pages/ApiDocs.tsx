import { Link } from 'react-router-dom'

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-gray-900 text-gray-100 text-xs sm:text-sm p-4 overflow-x-auto">
      <code>{children}</code>
    </pre>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium text-gray-700 dark:text-gray-300 px-3 py-2 border-b border-gray-200 dark:border-gray-700">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 align-top">{children}</td>
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-2">VideoText API</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">
          Automate transcription, subtitles, translation, subtitle repair, subtitle burning, and video
          compression. This is the same API the{' '}
          <a href="https://zapier.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
            Zapier
          </a>{' '}
          integration uses.
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10 text-sm text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Introduction</h2>
            <p>
              The VideoText API lets Pro users automate the same operations available in the web app:
              transcription, subtitle generation, subtitle translation, subtitle repair, burning subtitles
              into a video, and video compression. Every job is asynchronous — you submit a job, then poll
              (or use the Zapier trigger) for completion.
            </p>
            <p>
              <strong>API access is a Pro-plan feature.</strong> Free-plan accounts receive an{' '}
              <code>UPGRADE_REQUIRED</code> error on every API call.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Base URL</h2>
            <CodeBlock>{`https://api.videotext.io`}</CodeBlock>
            <p>All endpoints below are relative to this origin.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Authentication</h2>
            <p>Send your API key as a bearer token:</p>
            <CodeBlock>{`Authorization: Bearer vt_live_your_api_key_here`}</CodeBlock>
            <p>
              <code>X-Api-Key: vt_live_...</code> is also accepted. Create a key at{' '}
              <Link to="/settings/api-keys" className="text-blue-600 dark:text-blue-400 hover:underline">
                videotext.io/settings/api-keys
              </Link>{' '}
              — the full secret is shown exactly once, at creation. If you lose it, revoke it and create a
              new one.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Job model</h2>
            <p>
              Every processing endpoint (everything except guideline formatting) follows the same lifecycle:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <code>POST</code> the job — returns <code>202 Accepted</code> with an <code>id</code> and{' '}
                <code>status: "queued"</code>.
              </li>
              <li>
                Poll <code>GET /api/v1/&lt;resource&gt;/:id</code> until <code>status</code> is{' '}
                <code>completed</code> or <code>failed</code>.
              </li>
              <li>
                On <code>completed</code>, output URLs (<code>txt_url</code>, <code>srt_url</code>,{' '}
                <code>vtt_url</code>, or <code>download_url</code>, depending on the operation) are
                populated.
              </li>
              <li>
                On <code>failed</code>, <code>failure_reason</code> explains what went wrong.
              </li>
            </ol>
            <p>
              In Zapier, the <strong>New Completed Transcription</strong> trigger polls for you — you don't
              need to poll manually inside a Zap.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Endpoints</h2>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Transcription</h3>
            <p>Includes voice recordings — upload the recorded audio like any other file.</p>
            <CodeBlock>{`POST /api/v1/transcriptions      (multipart, field: file)
GET  /api/v1/transcriptions/:id
GET  /api/v1/transcriptions      (list, see Listing & polling below)`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Subtitle generation</h3>
            <CodeBlock>{`POST /api/v1/subtitles           (multipart, field: file)
GET  /api/v1/subtitles/:id
GET  /api/v1/subtitles`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Subtitle translation</h3>
            <p>
              Same as subtitle generation, plus a <code>targetLanguage</code> field. The value is echoed
              back on the POST response as <code>target_language</code> (not on the GET response — see
              Limits & known gaps).
            </p>
            <CodeBlock>{`POST /api/v1/subtitle-translations   (multipart, fields: file, targetLanguage)
GET  /api/v1/subtitle-translations/:id`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Subtitle repair (fix)</h3>
            <p>
              <code>subtitles</code> is required. <code>video</code> is optional — when included, fixes are
              scene-aware.
            </p>
            <CodeBlock>{`POST /api/v1/subtitle-fixes   (multipart, fields: subtitles [required], video [optional])
GET  /api/v1/subtitle-fixes/:id`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Burn subtitles into video</h3>
            <p>
              Both fields are required — this is the only entry point for burning subtitles into a video.
            </p>
            <CodeBlock>{`POST /api/v1/subtitle-burns   (multipart, fields: video [required], subtitles [required])
GET  /api/v1/subtitle-burns/:id`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Video compression</h3>
            <CodeBlock>{`POST /api/v1/video-compressions   (multipart, field: file)
GET  /api/v1/video-compressions/:id`}</CodeBlock>

            <h3 className="text-base font-medium text-gray-900 dark:text-white mt-6 mb-2">Account</h3>
            <CodeBlock>{`GET /api/v1/me`}</CodeBlock>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">File inputs</h2>
            <p>All uploads are <code>multipart/form-data</code>. Exact field names by operation:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr>
                    <Th>Operation</Th>
                    <Th>Field(s)</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr><Td>Transcription / Subtitles / Translation / Compression</Td><Td><code>file</code></Td></tr>
                  <tr><Td>Subtitle repair</Td><Td><code>subtitles</code> (required), <code>video</code> (optional)</Td></tr>
                  <tr><Td>Burn subtitles</Td><Td><code>video</code> and <code>subtitles</code> (both required)</Td></tr>
                  <tr><Td>Subtitle translation</Td><Td><code>file</code> + <code>targetLanguage</code> (form field)</Td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Remote <code>file_url</code> ingestion (handing VideoText a URL instead of a file) is not
              supported — every file must be uploaded directly. In Zapier, the file field from an upstream
              step (e.g. Google Drive) is downloaded and streamed to VideoText automatically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Output fields</h2>
            <p>Response from <code>GET /api/v1/&lt;resource&gt;/:id</code>:</p>
            <CodeBlock>{`{
  "id": "12345",
  "status": "completed",
  "operation": "video_to_transcript",
  "tool_type": "video-to-transcript",
  "filename": "a1b2c3d4-my-video_transcript.txt",
  "duration_seconds": 612,
  "txt_url": "/api/download/a1b2c3d4-my-video_transcript.txt?jobToken=...",
  "srt_url": null,
  "vtt_url": null,
  "download_url": null,
  "original_size_bytes": 104857600,
  "created_at": "2026-08-30T05:50:00.000Z",
  "completed_at": "2026-08-30T05:52:14.000Z",
  "failure_reason": null
}`}</CodeBlock>
            <p>
              <code>download_url</code> is used for operations without a dedicated <code>txt_url</code>/
              <code>srt_url</code>/<code>vtt_url</code> — e.g. video compression (compressed video) and
              subtitle burning (video with burned-in captions). Download URLs already include the
              authorization token needed to fetch them — use them as-is.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Listing &amp; polling</h2>
            <p>Every resource above supports the same list/query contract, used by the Zapier trigger:</p>
            <CodeBlock>{`GET /api/v1/transcriptions?status=completed&since=2026-08-30T00:00:00Z&limit=25`}</CodeBlock>
            <CodeBlock>{`{
  "data": [ { "id": "...", "status": "completed", ... } ],
  "pagination": { "limit": 25, "next_cursor": "MjAyNi0...", "has_more": true }
}`}</CodeBlock>
            <ul className="list-disc pl-5 space-y-1">
              <li><code>status</code> — filter, e.g. <code>completed</code>, <code>processing</code>, <code>failed</code>.</li>
              <li><code>since</code> — ISO 8601 timestamp; with <code>status=completed</code>, filters on completion time.</li>
              <li><code>cursor</code> — pass back <code>pagination.next_cursor</code> for the next page.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Errors</h2>
            <p>Every error uses the same envelope:</p>
            <CodeBlock>{`{ "error": { "code": "QUOTA_EXCEEDED", "message": "...", "request_id": "..." } }`}</CodeBlock>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr><Th>Code</Th><Th>HTTP</Th><Th>Meaning</Th></tr>
                </thead>
                <tbody>
                  <tr><Td><code>INVALID_API_KEY</code></Td><Td>401</Td><Td>Missing or unrecognized API key</Td></tr>
                  <tr><Td><code>API_KEY_REVOKED</code></Td><Td>401</Td><Td>Key exists but has been revoked — create a new one</Td></tr>
                  <tr><Td><code>UPGRADE_REQUIRED</code></Td><Td>403</Td><Td>Free-plan account; API access requires Pro</Td></tr>
                  <tr><Td><code>QUOTA_EXCEEDED</code></Td><Td>403</Td><Td>Daily import cap, monthly minutes, or concurrency limit reached</Td></tr>
                  <tr><Td><code>FILE_TOO_LARGE</code></Td><Td>400</Td><Td>File exceeds your plan's size limit</Td></tr>
                  <tr><Td><code>DURATION_EXCEEDED</code></Td><Td>400</Td><Td>Video exceeds your plan's duration limit</Td></tr>
                  <tr><Td><code>UNSUPPORTED_FILE</code></Td><Td>400</Td><Td>File type not recognized/supported</Td></tr>
                  <tr><Td><code>TRANSCRIPTION_NOT_FOUND</code></Td><Td>404</Td><Td>No such job, or it belongs to another user</Td></tr>
                  <tr><Td><code>FORBIDDEN</code></Td><Td>401/403</Td><Td>Not authenticated, or a specific-action check failed</Td></tr>
                  <tr><Td><code>RATE_LIMITED</code></Td><Td>429</Td><Td>Too many requests for this key this minute — see <code>Retry-After</code></Td></tr>
                  <tr><Td><code>VALIDATION_ERROR</code></Td><Td>400</Td><Td>Malformed request</Td></tr>
                  <tr><Td><code>INTERNAL_ERROR</code></Td><Td>500</Td><Td>Unexpected server error</Td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Limits</h2>
            <p>Current Pro-plan limits (enforced server-side, same as the web app):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Max video duration: <strong>120 minutes</strong></li>
              <li>Max file size: <strong>10 GB</strong></li>
              <li>Concurrent jobs: up to <strong>4</strong> (may reduce temporarily on very high-volume days)</li>
            </ul>
            <p>
              Requests are also rate-limited per API key (default 60 requests/minute); a <code>429</code>{' '}
              response includes a <code>Retry-After</code> header. Call <code>GET /api/v1/me</code> for your
              account's exact current limits and usage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Code example</h2>
            <CodeBlock>{`curl -X POST \\
  https://api.videotext.io/api/v1/transcriptions \\
  -H "Authorization: Bearer vt_live_your_api_key_here" \\
  -F "file=@example.mp4"`}</CodeBlock>
            <CodeBlock>{`curl https://api.videotext.io/api/v1/transcriptions/12345 \\
  -H "Authorization: Bearer vt_live_your_api_key_here"`}</CodeBlock>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Using with Zapier</h2>
            <p>
              For the no-code path, see the{' '}
              <Link to="/integrations/zapier" className="text-blue-600 dark:text-blue-400 hover:underline">
                VideoText + Zapier integration page
              </Link>
              . It uses this exact API — nothing about it is different from calling the API directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Support</h2>
            <p>
              Questions about the API? Email{' '}
              <a href="mailto:support@videotext.io" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@videotext.io
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
