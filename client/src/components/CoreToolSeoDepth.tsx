import { Link } from 'react-router-dom'
import { getCoreToolSeoDepth } from '../lib/coreToolSeoDepth'
import CollapsibleToolSection from './CollapsibleToolSection'
import CollapsibleFaqSection from './CollapsibleFaqSection'

type Props = {
  path: string
  /** Skip FAQ when the page already has a unique FAQ block (e.g. guideline-format). */
  hideFaq?: boolean
  /** @deprecated Lead content now lives in the bottom `full` section only. */
  variant?: 'full' | 'lead'
  /** When true, SEO depth starts expanded. Defaults to collapsed on all core tools. */
  defaultCollapsed?: boolean
}

export default function CoreToolSeoDepth({
  path,
  hideFaq = false,
  variant = 'full',
  defaultCollapsed = true,
}: Props) {
  const data = getCoreToolSeoDepth(path)
  if (!data) return null

  if (variant === 'lead') return null

  const faqItems = data.faq.map((item, i) => ({ ...item, id: `core-${i}` }))

  return (
    <>
      <CollapsibleToolSection
        id="how-this-tool-works"
        title={data.howItWorks.heading}
        defaultOpen={!defaultCollapsed}
        route={path}
        analyticsSection="how_it_works"
      >
        <div className="max-w-4xl space-y-section">
          <section className="space-y-component-sm">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 sm:text-base">
              {data.answerFirst}
            </p>
            <ol className="list-decimal space-y-micro pl-5 text-sm text-gray-700 dark:text-gray-300 sm:text-base">
              {data.howItWorks.steps.map((step) => (
                <li key={step.title}>
                  <span className="font-medium text-gray-900 dark:text-white">{step.title}.</span>{' '}
                  {step.detail}
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-component-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{data.whoItsFor.heading}</h2>
            <ul className="space-y-micro text-gray-700 dark:text-gray-300">
              {data.whoItsFor.items.map((item) => (
                <li key={item.who}>
                  <span className="font-medium text-gray-900 dark:text-white">{item.who}.</span> {item.why}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-component-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{data.outputs.heading}</h2>
            <ul className="list-disc space-y-micro pl-5 text-gray-700 dark:text-gray-300">
              {data.outputs.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-component-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{data.proof.heading}</h2>
            <ul className="space-y-micro text-gray-700 dark:text-gray-300">
              {data.proof.items.map((item) => (
                <li key={item.label}>
                  <span className="font-medium text-gray-900 dark:text-white">{item.label}.</span> {item.detail}
                </li>
              ))}
            </ul>
          </section>

          {data.extraSections?.map((section) => (
            <section key={section.heading} className="space-y-component-sm">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{section.heading}</h2>
              <p className="text-gray-700 dark:text-gray-300">{section.body}</p>
            </section>
          ))}

          <section className="space-y-component-sm">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{data.related.heading}</h2>
            <ul className="space-y-micro">
              {data.related.links.map((link) => (
                <li key={link.href + link.label} className="text-gray-700 dark:text-gray-300">
                  <Link to={link.href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {link.label}
                  </Link>
                  {' — '}
                  {link.note}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CollapsibleToolSection>

      {!hideFaq && faqItems.length > 0 && (
        <CollapsibleFaqSection items={faqItems} route={path} id="core-tool-faq" />
      )}
    </>
  )
}
