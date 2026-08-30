import { Link } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h2>
      {children}
    </section>
  )
}

export default function ZapierIntegration() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl font-medium text-gray-900 dark:text-white mb-2">VideoText + Zapier</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-10">
          Automatically send audio and video into VideoText, and use the completed transcript, subtitle,
          or video output anywhere else — Google Drive, Gmail, Slack, Notion, or any of Zapier's thousands
          of apps.
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-10 text-sm text-gray-700 dark:text-gray-300">
          <Section title="What you can automate">
            <p>Actions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Transcribe Audio or Video</li>
              <li>Generate Subtitles</li>
              <li>Translate Subtitles</li>
              <li>Fix Subtitles</li>
              <li>Burn Subtitles Into Video</li>
              <li>Compress Video</li>
            </ul>
            <p className="mt-3">Trigger:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>New Completed Transcription</li>
            </ul>
          </Section>

          <Section title="How to connect VideoText to Zapier">
            <ol className="list-decimal pl-5 space-y-1">
              <li>Sign in to VideoText.</li>
              <li>
                Go to{' '}
                <Link to="/settings/api-keys" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Settings → API Keys
                </Link>
                .
              </li>
              <li>Create a key with client type Zapier.</li>
              <li>Copy the secret — it's shown only once.</li>
              <li>In Zapier, connect the VideoText account.</li>
              <li>Paste the API key into the connection field.</li>
            </ol>
          </Section>

          <Section title="Example workflows">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Google Drive → VideoText → transcript</p>
                <p className="text-gray-600 dark:text-gray-400">
                  New file in Google Drive → Transcribe Audio or Video in VideoText → save the transcript
                  back to Google Drive.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Google Drive → VideoText subtitles</p>
                <p className="text-gray-600 dark:text-gray-400">
                  New MP4 in Google Drive → Generate Subtitles → save the SRT file.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                <p className="font-medium text-gray-900 dark:text-white mb-1">Completed transcript → anywhere</p>
                <p className="text-gray-600 dark:text-gray-400">
                  New Completed Transcription in VideoText → send the transcript to Gmail, Slack, Notion, or
                  back to Google Drive.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Supported file behavior">
            <p>
              Files are uploaded directly (no link-sharing setup required in your Zap — Zapier handles
              fetching the file from the upstream step). On the Pro plan, VideoText supports videos up to{' '}
              <strong>120 minutes</strong> and files up to <strong>10 GB</strong>. Larger or longer files
              will return a clear error rather than fail silently.
            </p>
          </Section>

          <Section title="Long-running jobs">
            <p>
              VideoText processing is asynchronous. For a short clip, a single Zap step usually completes
              within Zapier's execution window and returns the finished output directly. For longer files,
              the action step returns immediately with the job still processing — use the{' '}
              <strong>New Completed Transcription</strong> trigger in a second Zap step (or a separate Zap)
              to pick up the result once it's actually done, rather than assuming the first step's output is
              final.
            </p>
          </Section>

          <Section title="Troubleshooting">
            <dl className="space-y-3">
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">"Invalid API key"</dt>
                <dd>
                  The key is missing or wasn't recognized. Create a new one at{' '}
                  <Link to="/settings/api-keys" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Settings → API Keys
                  </Link>{' '}
                  and reconnect the VideoText account in Zapier.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">"Upgrade required"</dt>
                <dd>API access (including Zapier) is a Pro-plan feature. Upgrade on the Pricing page.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">"API key has been revoked"</dt>
                <dd>
                  The key was revoked (by you or an admin). Create a new key and reconnect the account in
                  Zapier — revoking is immediate and cannot be undone.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">Unsupported file</dt>
                <dd>Check that the file is a supported audio/video or subtitle format for the action you're using.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">Large or long files</dt>
                <dd>Files over 10 GB or videos over 120 minutes (Pro plan) aren't accepted — split or compress first.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">Job still processing after the Zap step finishes</dt>
                <dd>
                  Expected for longer jobs. Add a <strong>New Completed Transcription</strong> trigger step to
                  pick up the result once it's ready.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">Download link no longer works</dt>
                <dd>Output links are tied to a specific job. Re-run the action if you need a fresh link.</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-white">Reconnecting VideoText</dt>
                <dd>In Zapier, go to your connected accounts, remove the VideoText connection, and reconnect with a valid key.</dd>
              </div>
            </dl>
          </Section>

          <Section title="API documentation">
            <p>
              For the full endpoint reference, see the{' '}
              <Link to="/docs/api" className="text-blue-600 dark:text-blue-400 hover:underline">
                VideoText API docs
              </Link>
              .
            </p>
          </Section>

          <Section title="Support">
            <p>
              Questions about the integration? Email{' '}
              <a href="mailto:support@videotext.io" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@videotext.io
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
