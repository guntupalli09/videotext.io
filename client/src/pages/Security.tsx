import { ShieldCheck, Lock, Trash2, CreditCard, Server, Globe, FileQuestion, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const TRUST_BADGES = [
  {
    icon: Trash2,
    label: 'Files deleted immediately',
    detail: 'Your uploads are permanently deleted within seconds of processing completing. Nothing is stored.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    icon: Lock,
    label: 'Encrypted in transit',
    detail: 'All data is transmitted over HTTPS with TLS 1.2/1.3. Connections without encryption are rejected.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  {
    icon: ShieldCheck,
    label: 'Zero data retention',
    detail: 'We do not retain your video files, audio, transcripts, or output files after your session ends.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800',
  },
  {
    icon: CreditCard,
    label: 'Stripe-secured billing',
    detail: 'Payments processed by Stripe (PCI DSS Level 1). We never see or store your card details.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
]

const SUBPROCESSORS = [
  {
    name: 'Stripe',
    purpose: 'Payment processing & billing',
    dataShared: 'Email address, billing details (card data handled entirely by Stripe)',
    location: 'United States',
    compliance: 'PCI DSS Level 1',
    link: 'https://stripe.com/privacy',
  },
  {
    name: 'OpenAI (Whisper API)',
    purpose: 'Speech recognition / transcription',
    dataShared: 'Audio data — processed in real-time, not retained by OpenAI for training without opt-in',
    location: 'United States',
    compliance: 'SOC 2 Type II',
    link: 'https://openai.com/policies/privacy-policy',
  },
  {
    name: 'Resend',
    purpose: 'Transactional email (OTP verification)',
    dataShared: 'Email address only',
    location: 'United States',
    compliance: 'SOC 2 Type II',
    link: 'https://resend.com/privacy',
  },
  {
    name: 'Vercel',
    purpose: 'Frontend hosting & CDN',
    dataShared: 'IP address, browser request headers (standard CDN logs)',
    location: 'Global edge / United States',
    compliance: 'SOC 2 Type II',
    link: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Hetzner',
    purpose: 'Backend server & API hosting',
    dataShared: 'All processed data passes through these servers (files are not persisted after processing)',
    location: 'Germany (EU)',
    compliance: 'ISO 27001',
    link: 'https://www.hetzner.com/legal/privacy-policy',
  },
  {
    name: 'PostHog',
    purpose: 'Product analytics',
    dataShared: 'Usage events — anonymized, no file content, no transcript text',
    location: 'United States / EU (self-hosted available)',
    compliance: 'SOC 2 Type II',
    link: 'https://posthog.com/privacy',
  },
  {
    name: 'Sentry',
    purpose: 'Error tracking & crash reporting',
    dataShared: 'Error context, stack traces — no file content, no transcript text',
    location: 'United States',
    compliance: 'SOC 2 Type II',
    link: 'https://sentry.io/privacy/',
  },
]

const DATA_FLOW_STEPS = [
  {
    step: '1',
    title: 'Upload',
    detail: 'Your file is sent to our server over an encrypted TLS connection. It is written to a temporary location in memory — not to permanent storage.',
    icon: '⬆️',
  },
  {
    step: '2',
    title: 'Process',
    detail: 'Audio is extracted and sent to the Whisper speech recognition model. Transcription, speaker detection, and summaries run simultaneously.',
    icon: '⚙️',
  },
  {
    step: '3',
    title: 'Deliver',
    detail: 'Results are streamed back to your browser as they complete. The transcript, subtitles, and exports are delivered directly to you.',
    icon: '✅',
  },
  {
    step: '4',
    title: 'Delete',
    detail: 'Your original file and all intermediate processing artifacts are permanently deleted from our servers within seconds of job completion.',
    icon: '🗑️',
  },
]

export default function Security() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">

      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-5">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white tracking-tight mb-4">
            Security overview
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Your files are processed and deleted. Here's exactly how we protect your data — from upload
            to deletion, and every step in between.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRUST_BADGES.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className={`rounded-xl border ${badge.border} ${badge.bg} p-5 flex gap-4`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border ${badge.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${badge.color}`} aria-hidden />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${badge.color} mb-1`}>{badge.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-snug">{badge.detail}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Data flow */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            What happens to your files
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
            Your video or audio file goes through four stages. At no point is it stored permanently
            on our servers or accessible to anyone other than the processing system.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DATA_FLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl" aria-hidden>{s.icon}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Step {s.step}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Infrastructure */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Where we run
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            VideoText runs on infrastructure from providers with strong security certifications.
            Processing happens in Germany (EU) — your data never leaves EU data centers during processing.
          </p>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {[
              { layer: 'Frontend & CDN', provider: 'Vercel', location: 'Global edge network', cert: 'SOC 2 Type II' },
              { layer: 'API & processing', provider: 'Hetzner', location: 'Germany (EU)', cert: 'ISO 27001' },
              { layer: 'Database', provider: 'PostgreSQL on Hetzner', location: 'Germany (EU)', cert: 'Billing records only — no file content' },
              { layer: 'Queue', provider: 'Redis on Hetzner', location: 'Germany (EU)', cert: 'Job metadata only — no file content' },
            ].map((row, i) => (
              <div
                key={row.layer}
                className={`grid grid-cols-4 gap-4 px-5 py-3.5 text-sm ${
                  i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-white col-span-1">{row.layer}</span>
                <span className="text-gray-600 dark:text-gray-400">{row.provider}</span>
                <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                  {row.location}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs">{row.cert}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Payments */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Payment security
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-6 flex gap-5">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CreditCard className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Stripe PCI DSS Level 1</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                All billing is handled by Stripe — the highest level of payment security certification.
                VideoText never stores, transmits, or has access to your card number, CVV, or bank details.
                Stripe processes the payment and sends us only a confirmation token.
              </p>
              <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {[
                  'Card numbers are entered directly into Stripe\'s secure field — never our servers',
                  'You can manage, upgrade, or cancel your subscription via the Stripe billing portal',
                  'Invoices and receipts are issued by Stripe',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Encryption */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Encryption
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'In transit',
                body: 'All connections between your browser and our servers use HTTPS with TLS 1.2 or TLS 1.3. Unencrypted HTTP connections are automatically redirected.',
              },
              {
                title: 'At rest',
                body: 'Since we do not store your files, "at-rest" encryption of file content is not applicable. Account data (email, hashed passwords) is stored encrypted in the database.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Subprocessors */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
            Third-party subprocessors
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            These are the external services VideoText uses to operate. Each one has its own privacy policy
            and security certifications linked below.
          </p>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              <span className="col-span-3">Service</span>
              <span className="col-span-3">Purpose</span>
              <span className="col-span-4">Data shared</span>
              <span className="col-span-2">Location</span>
            </div>
            {SUBPROCESSORS.map((sp, i) => (
              <div
                key={sp.name}
                className={`grid grid-cols-12 gap-2 px-5 py-4 text-sm border-t border-gray-100 dark:border-gray-800 ${
                  i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
                }`}
              >
                <span className="col-span-3 font-medium text-gray-900 dark:text-white">
                  <a
                    href={sp.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline underline-offset-2"
                  >
                    {sp.name}
                  </a>
                </span>
                <span className="col-span-3 text-gray-600 dark:text-gray-400">{sp.purpose}</span>
                <span className="col-span-4 text-gray-500 dark:text-gray-500 text-xs leading-relaxed">{sp.dataShared}</span>
                <span className="col-span-2 text-gray-400 dark:text-gray-500 text-xs">{sp.location}</span>
              </div>
            ))}
          </div>
        </section>

        {/* For enterprise/legal */}
        <section className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Server className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                For enterprise and legal teams
              </h2>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <p>
                  <strong>GDPR:</strong> VideoText processes data on EU infrastructure (Hetzner, Germany).
                  Files are not retained after processing. User account data (email, hashed password) is
                  stored in an EU database. We are able to provide a Data Processing Agreement (DPA) on request.
                </p>
                <p>
                  <strong>Data residency:</strong> Audio processing occurs on Hetzner servers in Germany.
                  CDN edge (Vercel) caches only static frontend assets — no file content.
                </p>
                <p>
                  <strong>Zero retention for content:</strong> Your transcripts, videos, and audio files
                  are deleted immediately after processing. We cannot recover them after deletion.
                </p>
                <p>
                  <strong>Compliance roadmap:</strong> SOC 2 Type II audit is on our roadmap.
                  HIPAA Business Associate Agreement (BAA) is available for healthcare teams — contact us.
                </p>
                <p>
                  <strong>Legal/medical use:</strong> For HIPAA-regulated workflows, contact us
                  before processing protected health information (PHI). Standard plans do not include a BAA.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 mb-4">
            <FileQuestion className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden />
          </div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Security questions?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5 max-w-sm mx-auto">
            If you have a specific security question, need a DPA, or are evaluating VideoText for
            enterprise use, we read every message and respond within one business day.
          </p>
          <Link
            to="/feedback"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" aria-hidden />
            Contact us
          </Link>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-400 dark:text-gray-500">
            <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2">
              Privacy policy →
            </Link>
            <Link to="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2">
              Terms of service →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
