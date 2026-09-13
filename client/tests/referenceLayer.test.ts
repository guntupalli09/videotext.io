import test from 'node:test'
import assert from 'node:assert/strict'
import { GLOSSARY_INVENTORY, getNextGlossaryTerms, getPublishedGlossaryTerms } from '../src/data/glossary/inventory'
import { getRejectedStatistics, getRetainedStatistics, STATISTIC_CANDIDATES } from '../src/data/referenceLayer/statistics'
import { getCitationHubCount, getCitationHubH1 } from '../src/data/referenceLayer/citationHubMeta'
import { getPublishedGlossaryPaths, getReferenceLayerJsonLd, getReferenceLayerSeo } from '../src/lib/referenceLayer'
import { ROUTE_SEO } from '../src/lib/seoMeta'

test('citation hub count matches retained statistics and appears in the H1', () => {
  const retained = getRetainedStatistics()
  assert.equal(retained.length, getCitationHubCount())
  assert.match(getCitationHubH1(), new RegExp(String(retained.length)))
  assert.ok(STATISTIC_CANDIDATES.length >= 120)
  assert.ok(retained.length < STATISTIC_CANDIDATES.length)
  assert.equal(STATISTIC_CANDIDATES.length, retained.length + getRejectedStatistics().length)
})

test('every retained statistic has source metadata and a source locator', () => {
  for (const item of getRetainedStatistics()) {
    assert.ok(item.sourceUrl, item.id)
    assert.ok(item.sourceOrganization, item.id)
    assert.ok(item.verifiedAt, item.id)
    assert.ok(item.publicationDate || item.publicationDateUnavailableReason, item.id)
    assert.ok(item.sourceLocator, `${item.id} missing sourceLocator`)
  }
})

test('unpublished speech-to-text stays out of published routes and sitemap SEO', () => {
  const published = getPublishedGlossaryTerms()
  assert.equal(published.some((term) => term.slug === 'speech-to-text'), false)
  const inventory = GLOSSARY_INVENTORY.find((row) => row.slug === 'speech-to-text')
  assert.ok(inventory)
  assert.equal(inventory.status, 'draft')
  assert.equal(ROUTE_SEO['/glossary/speech-to-text'], undefined)
  assert.equal(getPublishedGlossaryPaths().includes('/glossary/speech-to-text'), false)
  for (const term of published) {
    assert.equal(term.relatedTerms.includes('speech-to-text'), false, term.slug)
  }
})

test('published glossary prose has no editorial-leak phrases', () => {
  const leaks = [
    /this page only/i,
    /transactional/i,
    /commercial intent/i,
    /definition intent/i,
    /confirm in the product UI/i,
    /do not invent/i,
  ]
  for (const term of getPublishedGlossaryTerms()) {
    const prose = [term.definition, ...term.takeaways, ...(term.faqs || []).flatMap((faq) => [faq.q, faq.a])]
      .concat(term.sections.flatMap((section) => [section.heading, ...(section.paragraphs || []), ...(section.bullets || [])]))
      .join('\n')
    for (const leak of leaks) {
      assert.equal(leak.test(prose), false, `${term.slug} matched ${leak}`)
    }
  }
})

test('published glossary pages are production-ready and registered for SEO', () => {
  const published = getPublishedGlossaryTerms()
  assert.ok(published.length >= 30)
  assert.ok(published.length <= 50)
  assert.ok(GLOSSARY_INVENTORY.length >= 150)
  const seo = getReferenceLayerSeo()
  for (const term of published) {
    assert.ok(term.definition.length > 40, term.slug)
    assert.ok(term.sources.length > 0, term.slug)
    assert.ok(ROUTE_SEO[`/glossary/${term.slug}`], term.slug)
    assert.equal(seo[`/glossary/${term.slug}`].title, term.metaTitle)
  }
  assert.deepEqual(getPublishedGlossaryPaths(), published.map((term) => `/glossary/${term.slug}`))
})

test('reference-layer JSON-LD uses valid types and not Dataset', () => {
  const hub = getReferenceLayerJsonLd('/transcription-statistics') || []
  const types = hub.map((schema) => (schema as { '@type': string })['@type'])
  assert.ok(types.includes('Article'))
  assert.ok(types.includes('ItemList'))
  assert.ok(!types.includes('Dataset'))
  const term = getReferenceLayerJsonLd('/glossary/srt-file') || []
  const termTypes = term.map((schema) => (schema as { '@type': string })['@type'])
  assert.ok(termTypes.includes('DefinedTerm'))
  assert.ok(termTypes.includes('Article'))
})

test('next glossary recommendations stay unpublished', () => {
  const next = getNextGlossaryTerms(20)
  assert.ok(next.length >= 10)
  assert.ok(next.every((item) => item.status === 'draft'))
  assert.ok(next.every((item) => !item.existingPageConflict.toLowerCase().includes('alias')))
})
