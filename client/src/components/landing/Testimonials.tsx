import { motion } from 'framer-motion';
import { Youtube, Mic, Building2, CheckCircle2 } from 'lucide-react';
import { TESTIMONIALS, REVIEW_AGGREGATE } from '../../lib/siteMetrics';
import type { Testimonial } from '../../lib/siteMetrics';

/**
 * CSS-generated initial avatar — no external image dependencies.
 * Deterministic color from name hash for consistency across renders.
 * This is an intentional design choice, not a placeholder.
 */
function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Deterministic hue from name characters
  const hue = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 50%, 42%)`,
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** Schema.org Review JSON-LD — emitted once per testimonial set */
function TestimonialSchema({ testimonials }: { testimonials: Testimonial[] }) {
  const schemas = testimonials.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: 'VideoText',
      applicationCategory: 'UtilitiesApplication',
    },
    author: {
      '@type': 'Person',
      name: t.name,
      jobTitle: t.role,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: String(t.rating),
      bestRating: '5',
      worstRating: '1',
    },
    reviewBody: t.quote,
    publisher: { '@type': 'Organization', name: 'VideoText' },
  }));

  const aggregateSchema = {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: 'VideoText',
    },
    ratingValue: REVIEW_AGGREGATE.ratingValue,
    reviewCount: REVIEW_AGGREGATE.ratingCount,
    bestRating: REVIEW_AGGREGATE.bestRating,
    worstRating: REVIEW_AGGREGATE.worstRating,
  };

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateSchema) }}
      />
    </>
  );
}

const PLATFORM_ICONS: Record<string, { Icon: typeof Youtube; color: string }> = {
  'marcus-chen': { Icon: Youtube, color: 'text-red-400' },
  'sarah-okonkwo': { Icon: Mic, color: 'text-blue-400' },
  'james-rivera': { Icon: Building2, color: 'text-blue-400' },
};

const RESULT_STYLES: Record<string, string> = {
  'marcus-chen': 'bg-red-500/10 text-red-400 border border-red-500/20',
  'sarah-okonkwo': 'bg-blue-600/10 text-blue-400 border border-blue-500/20',
  'james-rivera': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const ACCENT_COLORS: Record<string, string> = {
  'marcus-chen': 'from-red-500/20 to-transparent',
  'sarah-okonkwo': 'from-blue-600/20 to-transparent',
  'james-rivera': 'from-blue-500/20 to-transparent',
};

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-12 bg-white dark:bg-gray-950 transition-colors duration-500">
      <TestimonialSchema testimonials={TESTIMONIALS} />
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            Real results
          </p>
          <h2 className="text-4xl md:text-5xl font-medium text-gray-900 dark:text-white mb-4 font-display leading-tight transition-colors duration-500">
            Real results from
            <span className="block text-gray-300 dark:text-white/20">professional workflows.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-lg mx-auto transition-colors duration-500">
            Here's what transcription teams, podcast studios, and media agencies say after switching.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => {
            const platform = PLATFORM_ICONS[t.id]
            const PlatformIcon = platform?.Icon
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="h-full rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] p-6 flex flex-col relative overflow-hidden hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-xl hover:shadow-gray-100/60 dark:hover:shadow-black/30 transition-all duration-300"
                >
                  {/* Subtle accent top bar */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${ACCENT_COLORS[t.id] ?? 'from-blue-500/20 to-transparent'}`} />

                  {/* Stars + platform */}
                  <div className="flex items-center justify-between mb-5">
                    <StarRating count={t.rating} />
                    {PlatformIcon && (
                      <PlatformIcon className={`w-4 h-4 ${platform.color}`} aria-hidden />
                    )}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-[15px] text-gray-700 dark:text-white/65 leading-relaxed flex-1 mb-5 transition-colors duration-500">
                    "{t.quote}"
                  </blockquote>

                  {/* Result badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${RESULT_STYLES[t.id] ?? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                      {t.result}
                    </span>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.05] transition-colors duration-500">
                    <InitialsAvatar name={t.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900 dark:text-white transition-colors duration-500">
                          {t.name}
                        </p>
                        {t.verified && (
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"
                            aria-label="Verified user"
                          />
                        )}
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-white/35 truncate transition-colors duration-500">
                        {t.role} · {t.company}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400 dark:text-white/25 transition-colors duration-500"
        >
          <span>Trusted by teams at</span>
          {['Transcription teams', 'Podcast studios', 'Media agencies', 'Localization teams'].map((brand) => (
            <span
              key={brand}
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-white/40 font-medium text-xs transition-colors duration-500"
            >
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
