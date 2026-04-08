interface AnswerBlockProps {
  question: string
  shortAnswer: string
  expanded: string
  bullets: string[]
}

export default function AnswerBlock({ question, shortAnswer, expanded, bullets }: AnswerBlockProps) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6" aria-label="Direct answer block">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Direct answer</p>
      <h2 className="mt-2 text-xl font-bold text-gray-900">{question}</h2>
      <p className="mt-2 text-lg font-semibold text-violet-700">{shortAnswer}</p>
      <p className="mt-3 text-sm text-gray-700">{expanded}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  )
}
