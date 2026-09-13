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

test('every retained statistic has source metadata', () => {
  for (const item of getRetainedStatistics()) {
    assert.ok(item.sourceUrl, item.id)
    assert.ok(item.sourceOrganization, item.id)
    assert.ok(item.verifiedAt, item.id)
    assert.ok(item.publicationDate || item.publicationDateUnavailableReason, item.id)
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
