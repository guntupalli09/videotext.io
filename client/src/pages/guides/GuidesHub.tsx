import React from 'react'
import { Link } from 'react-router-dom'
import { getAllGuides } from '../../lib/guides'

void React

export default function GuidesHub() {
  const guides = getAllGuides()

  return (
    <div className="min-h-screen bg-white py-12 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl space-y-8 px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
            Home
          </Link>
          <span className="px-2">/</span>
          <span>Guides</span>
        </nav>

        <header>
          <h1 className="text-4xl font-medium text-gray-900 dark:text-white">Transcription and subtitle guides</h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            {guides.length} in-depth guides on transcription accuracy, subtitle formatting, tool comparisons, and the
            workflows behind client-ready captions.
          </p>
        </header>

        <ul className="space-y-6">
          {guides.map((guide) => (
            <li key={guide.slug} className="border-b border-gray-200 pb-6 last:border-0 dark:border-gray-800">
              <h2 className="text-xl font-medium">
                <Link to={`/guides/${guide.slug}`} className="text-blue-700 hover:underline dark:text-blue-400">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">{guide.description}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{guide.readMinutes} min read</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
