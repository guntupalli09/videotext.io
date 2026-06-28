import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, Loader2, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const INDUSTRIES = [
  'SaaS',
  'AI / Machine Learning',
  'Enterprise Software',
  'Legal Technology',
  'Media',
  'Sales',
  'Marketing',
  'Operations',
  'Other',
];

const AREAS_OF_HELP = [
  'Enterprise Sales',
  'Business Development',
  'Partnerships',
  'Marketing & Growth',
  'Fundraising',
  'Customer Success',
  'Product Strategy',
  'Operations',
  'AI / Engineering',
  'Legal Industry Expertise',
  'Media & Content',
  'Other',
];

const HOURS_OPTIONS = [
  'Less than 5',
  '5–10',
  '10–20',
  '20–40',
  'Full-time',
];

const COLLAB_OPTIONS = [
  'Advisor',
  'Part-time',
  'Full-time',
  'Open to discussion',
];

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  linkedIn: string;
  portfolio: string;
  resumeFile: File | null;
  currentCompany: string;
  currentPosition: string;
  yearsOfExperience: string;
  industry: string;
  areasOfHelp: string[];
  impactDescription: string;
  hasSaasExperience: boolean | null;
  saasDetails: string;
  whyVideoText: string;
  opportunities: string;
  first90Days: string;
  hoursPerWeek: string;
  preferredCollaboration: string;
  location: string;
  anythingElse: string;
  consentGiven: boolean;
};

const initial: FormData = {
  fullName: '',
  email: '',
  phone: '',
  linkedIn: '',
  portfolio: '',
  resumeFile: null,
  currentCompany: '',
  currentPosition: '',
  yearsOfExperience: '',
  industry: '',
  areasOfHelp: [],
  impactDescription: '',
  hasSaasExperience: null,
  saasDetails: '',
  whyVideoText: '',
  opportunities: '',
  first90Days: '',
  hoursPerWeek: '',
  preferredCollaboration: '',
  location: '',
  anythingElse: '',
  consentGiven: false,
};

const inputBase =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200';

const labelBase = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function JoinFoundingTeam() {
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const toggleArea = (area: string) => {
    set(
      'areasOfHelp',
      form.areasOfHelp.includes(area)
        ? form.areasOfHelp.filter((a) => a !== area)
        : [...form.areasOfHelp, area]
    );
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim()) e.fullName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.linkedIn.trim()) e.linkedIn = 'Required';
    if (!form.impactDescription.trim()) e.impactDescription = 'Required';
    if (!form.whyVideoText.trim()) e.whyVideoText = 'Required';
    if (!form.opportunities.trim()) e.opportunities = 'Required';
    if (!form.first90Days.trim()) e.first90Days = 'Required';
    if (!form.hoursPerWeek) e.hoursPerWeek = 'Required';
    if (!form.preferredCollaboration) e.preferredCollaboration = 'Required';
    if (!form.consentGiven) e.consentGiven = 'You must agree to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await api('/api/founding-team/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          linkedIn: form.linkedIn.trim(),
          portfolio: form.portfolio.trim() || null,
          resumeFileName: form.resumeFile?.name || null,
          currentCompany: form.currentCompany.trim() || null,
          currentPosition: form.currentPosition.trim() || null,
          yearsOfExperience: form.yearsOfExperience || null,
          industry: form.industry || null,
          areasOfHelp: form.areasOfHelp,
          impactDescription: form.impactDescription.trim(),
          hasSaasExperience: form.hasSaasExperience ?? false,
          saasDetails: form.saasDetails.trim() || null,
          whyVideoText: form.whyVideoText.trim(),
          opportunities: form.opportunities.trim(),
          first90Days: form.first90Days.trim(),
          hoursPerWeek: form.hoursPerWeek,
          preferredCollaboration: form.preferredCollaboration,
          location: form.location.trim() || null,
          anythingElse: form.anythingElse.trim() || null,
          consentGiven: form.consentGiven,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Submission failed');
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-6 transition-colors duration-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Application Received</h1>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            Thank you for your interest in VideoText. We carefully review every application
            and will reach out if we believe there's a strong mutual fit.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to VideoText
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gray-950 py-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/[0.1] rounded-full blur-[140px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-6">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[12px] text-white/50 font-medium">Founding Team</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 font-display">
            Help Build the Future of AI Transcription
          </h1>
          <p className="text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed">
            VideoText is building AI-powered transcription, subtitle, translation, and post-processing
            tools for professionals and businesses. We're looking for people who can significantly
            accelerate our growth.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <SectionCard title="Personal Information">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  className={`${inputBase} ${errors.fullName ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="Jane Smith"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
              </div>
              <div>
                <label className={labelBase}>Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={`${inputBase} ${errors.email ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="jane@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputBase}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className={labelBase}>LinkedIn Profile *</label>
                <input
                  type="url"
                  value={form.linkedIn}
                  onChange={(e) => set('linkedIn', e.target.value)}
                  className={`${inputBase} ${errors.linkedIn ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                  placeholder="https://linkedin.com/in/..."
                />
                {errors.linkedIn && <p className="mt-1 text-xs text-red-500">{errors.linkedIn}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Portfolio / Personal Website</label>
                <input
                  type="url"
                  value={form.portfolio}
                  onChange={(e) => set('portfolio', e.target.value)}
                  className={inputBase}
                  placeholder="https://yoursite.com"
                />
              </div>
              <div>
                <label className={labelBase}>Resume (PDF, DOCX)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => set('resumeFile', e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`${inputBase} flex items-center gap-2 cursor-pointer text-left`}
                >
                  <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className={form.resumeFile ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                    {form.resumeFile ? form.resumeFile.name : 'Choose file...'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Professional Background">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Current Company</label>
                <input
                  type="text"
                  value={form.currentCompany}
                  onChange={(e) => set('currentCompany', e.target.value)}
                  className={inputBase}
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className={labelBase}>Current Position</label>
                <input
                  type="text"
                  value={form.currentPosition}
                  onChange={(e) => set('currentPosition', e.target.value)}
                  className={inputBase}
                  placeholder="VP of Sales"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Years of Experience</label>
                <input
                  type="text"
                  value={form.yearsOfExperience}
                  onChange={(e) => set('yearsOfExperience', e.target.value)}
                  className={inputBase}
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <label className={labelBase}>Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  className={`${inputBase} appearance-none`}
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Areas Where You Can Help">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {AREAS_OF_HELP.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`text-left px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-all duration-200 ${
                  form.areasOfHelp.includes(area)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Experience">
          <div className="space-y-5">
            <div>
              <label className={labelBase}>
                Describe the most significant impact you've made in a startup or company. *
              </label>
              <textarea
                value={form.impactDescription}
                onChange={(e) => set('impactDescription', e.target.value)}
                rows={4}
                className={`${inputBase} resize-y ${errors.impactDescription ? 'ring-2 ring-red-500 border-red-500' : ''}`}
                placeholder="What did you build, grow, or change? What was measurable?"
              />
              {errors.impactDescription && <p className="mt-1 text-xs text-red-500">{errors.impactDescription}</p>}
            </div>

            <div>
              <label className={labelBase}>Have you helped grow a SaaS company before?</label>
              <div className="flex gap-3 mt-1">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => set('hasSaasExperience', val)}
                    className={`px-5 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.hasSaasExperience === val
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {form.hasSaasExperience && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <label className={labelBase}>
                    What was the product, stage, and measurable impact?
                  </label>
                  <textarea
                    value={form.saasDetails}
                    onChange={(e) => set('saasDetails', e.target.value)}
                    rows={4}
                    className={`${inputBase} resize-y`}
                    placeholder="e.g. ARR growth, MRR growth, enterprise contracts, users acquired, partnerships closed..."
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        <SectionCard title="Why VideoText?">
          <div className="space-y-5">
            <div>
              <label className={labelBase}>Why are you interested in VideoText? *</label>
              <textarea
                value={form.whyVideoText}
                onChange={(e) => set('whyVideoText', e.target.value)}
                rows={3}
                className={`${inputBase} resize-y ${errors.whyVideoText ? 'ring-2 ring-red-500 border-red-500' : ''}`}
              />
              {errors.whyVideoText && <p className="mt-1 text-xs text-red-500">{errors.whyVideoText}</p>}
            </div>

            <div>
              <label className={labelBase}>What opportunities do you see for this product? *</label>
              <textarea
                value={form.opportunities}
                onChange={(e) => set('opportunities', e.target.value)}
                rows={3}
                className={`${inputBase} resize-y ${errors.opportunities ? 'ring-2 ring-red-500 border-red-500' : ''}`}
              />
              {errors.opportunities && <p className="mt-1 text-xs text-red-500">{errors.opportunities}</p>}
            </div>

            <div>
              <label className={labelBase}>
                If you joined, what would you focus on during your first 90 days? *
              </label>
              <textarea
                value={form.first90Days}
                onChange={(e) => set('first90Days', e.target.value)}
                rows={3}
                className={`${inputBase} resize-y ${errors.first90Days ? 'ring-2 ring-red-500 border-red-500' : ''}`}
              />
              {errors.first90Days && <p className="mt-1 text-xs text-red-500">{errors.first90Days}</p>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Availability">
          <div className="space-y-5">
            <div>
              <label className={labelBase}>Hours per week you could commit *</label>
              <select
                value={form.hoursPerWeek}
                onChange={(e) => set('hoursPerWeek', e.target.value)}
                className={`${inputBase} appearance-none ${errors.hoursPerWeek ? 'ring-2 ring-red-500 border-red-500' : ''}`}
              >
                <option value="">Select...</option>
                {HOURS_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {errors.hoursPerWeek && <p className="mt-1 text-xs text-red-500">{errors.hoursPerWeek}</p>}
            </div>

            <div>
              <label className={labelBase}>Preferred collaboration *</label>
              <div className="flex flex-wrap gap-2.5 mt-1">
                {COLLAB_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('preferredCollaboration', opt)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.preferredCollaboration === opt
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {errors.preferredCollaboration && <p className="mt-1 text-xs text-red-500">{errors.preferredCollaboration}</p>}
            </div>

            <div>
              <label className={labelBase}>Location / Time Zone</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className={inputBase}
                placeholder="e.g. San Francisco, PST"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Anything Else">
          <textarea
            value={form.anythingElse}
            onChange={(e) => set('anythingElse', e.target.value)}
            rows={3}
            className={`${inputBase} resize-y`}
            placeholder="Anything else you'd like us to know?"
          />
        </SectionCard>

        {/* Consent + submit */}
        <div className="space-y-5">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => set('consentGiven', e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className={`text-[13px] leading-relaxed ${errors.consentGiven ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              I understand that submitting this application does not constitute an offer of
              employment, partnership, equity, or a co-founder role. Any future collaboration
              will depend on mutual evaluation and demonstrated fit.
            </span>
          </label>

          {submitError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={submitting ? undefined : { scale: 1.02 }}
            whileTap={submitting ? undefined : { scale: 0.98 }}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[15px] shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
