import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MONEY_CORE_PATHS,
  getAeoJsonLd,
  getHomeSoftwareApplicationJsonLd,
  getHowToJsonLd,
  getSoftwareApplicationJsonLd,
} from '../src/lib/seoMeta'
import { stripTopLevelSoftwareApplicationScripts, countTopLevelSoftwareApplication } from '../../scripts/seo/jsonLdUtils'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const seoMetaSrc = readFileSync(resolve(process.cwd(), 'src/lib/seoMeta.ts'), 'utf8')

test('index.html template no longer ships a fake 4.9/127 SoftwareApplication', () => {
  assert.doesNotMatch(indexHtml, /"ratingValue":\s*"4\.9"/)
  assert.doesNotMatch(indexHtml, /"reviewCount":\s*"127"/)
  assert.doesNotMatch(indexHtml, /"@type":\s*"SoftwareApplication"/)
})

test('seoMeta helpers no longer hard-code 4.9/2300 or 4.9/127', () => {
  assert.doesNotMatch(seoMetaSrc, /ratingValue:\s*'4\.9'/)
  assert.doesNotMatch(seoMetaSrc, /ratingCount:\s*'2300'/)
  assert.doesNotMatch(seoMetaSrc, /reviewCount:\s*'127'/)
})

test('homepage SoftApp attaches the live Founders aggregate and nothing fake', () => {
  const schema = getHomeSoftwareApplicationJsonLd({ averageRating: 4.2, ratingCount: 45 }) as {
    '@type': string
    aggregateRating: { ratingValue: string; ratingCount: string; reviewCount: string }
  }
  assert.equal(schema['@type'], 'SoftwareApplication')
  assert.equal(schema.aggregateRating.ratingValue, '4.2')
  assert.equal(schema.aggregateRating.ratingCount, '45')
  assert.equal(schema.aggregateRating.reviewCount, '45')
})

test('each money core has a page-level SoftApp and no HowTo', () => {
  for (const path of MONEY_CORE_PATHS) {
    assert.ok(getSoftwareApplicationJsonLd(path), `${path} must have exactly one page-level SoftApp helper`)
    assert.equal(getHowToJsonLd(path), null, `${path} must not emit HowTo`)
    const aeo = getAeoJsonLd(path) ?? []
    for (const schema of aeo) {
      const type = (schema as { '@type'?: string })['@type']
      assert.notEqual(type, 'SoftwareApplication', `${path} AEO must not add a second SoftApp`)
      assert.notEqual(type, 'HowTo', `${path} AEO must not add HowTo`)
    }
  }
})

test('prerender injects homepage rating after SSR/H1 so / keeps semantic coverage', () => {
  const prerenderSrc = readFileSync(resolve(process.cwd(), '../scripts/prerender.ts'), 'utf8')
  const ssrIdx = prerenderSrc.indexOf('const ssrHtml = renderPageToHtml(routePath)')
  const ratingIdx = prerenderSrc.indexOf("if (routePath === '/') {\n      html = injectHomepageVisibleRating")
  assert.ok(ssrIdx !== -1, 'homepage SSR injection must exist')
  assert.ok(ratingIdx !== -1, 'homepage rating injection must exist')
  assert.ok(ratingIdx > ssrIdx, 'rating must be injected after renderPageToHtml so #root stays free for H1/H2')
  assert.match(prerenderSrc, /Never replace an empty #root/)
})

test('stripping inherited template SoftApp leaves at most one injectible SoftApp', () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"VideoText"}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"VideoText","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"127"}}</script>
  </head></html>`
  const stripped = stripTopLevelSoftwareApplicationScripts(html)
  assert.equal(countTopLevelSoftwareApplication(stripped), 0)
  assert.match(stripped, /Organization/)
  assert.doesNotMatch(stripped, /4\.9/)
})
