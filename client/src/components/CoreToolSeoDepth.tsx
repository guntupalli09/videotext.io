import { Link } from 'react-router-dom'
import { getCoreToolSeoDepth } from '../lib/coreToolSeoDepth'

type Props = {
  path: string
  /** Skip FAQ when the page already has a unique FAQ block (e.g. guideline-format). */
  hideFaq?: boolean
}

export default function CoreToolSeoDepth({ path, hideFaq = false }: Props) {
  const data = getCoreToolSeoDepth(path)
  if (!data) return null

  return (
    <section
      className="mt-12 pt-8 border-t border-gray-100/70 dark:border-gray-800 max-w-4xl mx-auto px-4 space-y-10"
      aria-label="How this tool works"
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.howItWorks.heading}</h2>
        <ol className="space-y-3">
          {data.howItWorks.steps.map((step, i) => (
            <li key={step.title} className="text-gray-700 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                {i + 1}. {step.title}.
              </span>{' '}
              {step.detail}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.whoItsFor.heading}</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          {data.whoItsFor.items.map((item) => (
            <li key={item.who}>
              <span className="font-medium text-gray-900 dark:text-white">{item.who}.</span> {item.why}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.outputs.heading}</h2>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
          {data.outputs.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.proof.heading}</h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          {data.proof.items.map((item) => (
            <li key={item.label}>
              <span className="font-medium text-gray-900 dark:text-white">{item.label}.</span> {item.detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">{data.related.heading}</h2>
        <ul className="space-y-2">
          {data.related.links.map((link) => (
            <li key={link.href} className="text-gray-700 dark:text-gray-300">
              <Link to={link.href} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {link.label}
              </Link>
              {' — '}
              {link.note}
            </li>
          ))}
        </ul>
      </section>

      {!hideFaq && (
        <section aria-label="FAQ">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {data.faq.map((item) => (
              <div key={item.q}>
                <dt className="font-medium text-gray-900 dark:text-white">{item.q}</dt>
                <dd className="mt-1 text-gray-600 dark:text-gray-400">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  )
}
