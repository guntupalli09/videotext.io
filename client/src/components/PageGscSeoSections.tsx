import { getPageGscSeoDepth } from '../lib/pageGscSeoDepth'
import CollapsibleToolSection from './CollapsibleToolSection'
import CollapsibleFaqSection from './CollapsibleFaqSection'

type Props = {
  path: string
  /** Skip FAQ block (e.g. when registry FAQ is rendered separately). */
  hideFaq?: boolean
  className?: string
}

/** GSC-informed How-it-works + FAQ blocks — collapsed by default, full copy in DOM. */
export default function PageGscSeoSections({ path, hideFaq = false, className = '' }: Props) {
  const data = getPageGscSeoDepth(path)
  if (!data) return null

  const faqItems = data.faq?.map(({ id, q, a }) => ({ id, q, a })) ?? []

  return (
    <>
      {data.howItWorks && (
        <CollapsibleToolSection
          id={`how-it-works-${path.replace(/\//g, '-')}`}
          title={data.howItWorks.heading}
          analyticsSection="how_it_works"
          route={path}
          className={className}
        >
          <ol className="max-w-4xl list-decimal space-y-micro pl-5 text-sm text-gray-700 dark:text-gray-300 sm:text-base">
            {data.howItWorks.steps.map((step) => (
              <li key={step.title}>
                <span className="font-medium text-gray-900 dark:text-white">{step.title}.</span>{' '}
                {step.detail}
              </li>
            ))}
          </ol>
        </CollapsibleToolSection>
      )}
      {!hideFaq && faqItems.length > 0 && (
        <CollapsibleFaqSection
          items={faqItems}
          route={path}
          id={`gsc-faq-${path.replace(/\//g, '-')}`}
          className={className}
        />
      )}
    </>
  )
}
