import { getPageGscSupplementFaq } from '../lib/pageGscSeoDepth'
import CollapsibleFaqSection from './CollapsibleFaqSection'

type Props = { path: string; title?: string }

/** Extra GSC-driven FAQs that extend (not replace) existing page FAQ. */
export default function PageGscSupplementFaq({ path, title = 'More questions' }: Props) {
  const items = getPageGscSupplementFaq(path)
  if (!items.length) return null
  return (
    <CollapsibleFaqSection
      items={items}
      route={path}
      title={title}
      id={`gsc-supplement-faq-${path.replace(/\//g, '-')}`}
    />
  )
}
