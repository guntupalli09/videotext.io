#!/usr/bin/env node
/**
 * Structural validation for citation-hub statistics.
 * Human verification of the number itself is a separate check.
 * A successful HTTP fetch only proves the URL responds.
 */
import { STATISTIC_CANDIDATES, getRetainedStatistics, getRejectedStatistics } from '../client/src/data/referenceLayer/statistics'
import type { StatisticCandidate } from '../client/src/data/referenceLayer/types'

const PLACEHOLDER_RE = /\b(TODO|TBD|FIXME|xxx+|lorem ipsum|PLACEHOLDER)\b/i
const URL_RE = /^https?:\/\/[^\s]+$/i

interface Issue {
  level: 'error' | 'warning'
  id?: string
  message: string
}

function hasDate(item: StatisticCandidate): boolean {
  return Boolean(item.publicationDate) || Boolean(item.publicationDateUnavailableReason)
}

function isMalformedUrl(url: string): boolean {
  if (!URL_RE.test(url)) return true
  try {
    const parsed = new URL(url)
    return !parsed.hostname.includes('.')
  } catch {
    return true
  }
}

type UrlCheckState = 'ok' | 'restricted' | 'rate_limited' | 'failed' | 'unverified'

async function checkUrl(url: string): Promise<UrlCheckState> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'VideoTextCitationHubValidator/1.0' },
    })
    clearTimeout(timer)
    if (res.status === 401 || res.status === 403) return 'restricted'
    if (res.status === 429) return 'rate_limited'
    if (res.ok) return 'ok'
    return 'failed'
  } catch {
    return 'unverified'
  }
}

function urlHasHumanVerification(url: string, retained: StatisticCandidate[]): boolean {
  return retained.some((item) => item.sourceUrl === url && Boolean(item.sourceLocator))
}

async function main(): Promise<void> {
  const issues: Issue[] = []
  const retained = getRetainedStatistics()
  const rejected = getRejectedStatistics()
  const seenIds = new Set<string>()
  const seenClaimSource = new Set<string>()
  const seenClaims = new Set<string>()

  if (STATISTIC_CANDIDATES.length < 120) {
    issues.push({ level: 'error', message: `Only ${STATISTIC_CANDIDATES.length} candidates; expected at least 120 researched figures.` })
  }
  if (retained.length >= STATISTIC_CANDIDATES.length) {
    issues.push({ level: 'error', message: 'Retained count must be lower than candidate count after filtering.' })
  }

  for (const item of STATISTIC_CANDIDATES) {
    if (seenIds.has(item.id)) issues.push({ level: 'error', id: item.id, message: 'Duplicate id' })
    seenIds.add(item.id)
    if (PLACEHOLDER_RE.test(JSON.stringify(item))) {
      issues.push({ level: 'error', id: item.id, message: 'Placeholder / TODO text found' })
    }
    if (item.status === 'rejected' && !item.rejectReason) {
      issues.push({ level: 'error', id: item.id, message: 'Rejected statistic missing rejectReason' })
    }
  }

  for (const item of retained) {
    if (!item.sourceUrl) issues.push({ level: 'error', id: item.id, message: 'Missing sourceUrl' })
    if (!item.sourceOrganization) issues.push({ level: 'error', id: item.id, message: 'Missing sourceOrganization' })
    if (!hasDate(item)) issues.push({ level: 'error', id: item.id, message: 'Missing publicationDate or publicationDateUnavailableReason' })
    if (!item.verifiedAt) issues.push({ level: 'error', id: item.id, message: 'Missing verifiedAt' })
    if (!item.sourceLocator) {
      issues.push({ level: 'error', id: item.id, message: 'Missing sourceLocator — HTTP success is not evidence the number is correct' })
    }
    if (!item.category || item.category === 'rejected-unverified') {
      issues.push({ level: 'error', id: item.id, message: 'Missing or invalid category' })
    }
    if (!item.claim || item.claim.length < 24) {
      issues.push({ level: 'error', id: item.id, message: 'Claim is missing or too short to be independently quotable' })
    }
    if (!item.context && !item.caveat && !item.geography && !item.dataPeriod) {
      issues.push({ level: 'error', id: item.id, message: 'Missing contextual qualifiers (need at least one of context, caveat, geography, dataPeriod)' })
    }
    if (item.sourceUrl && isMalformedUrl(item.sourceUrl)) {
      issues.push({ level: 'error', id: item.id, message: `Malformed sourceUrl: ${item.sourceUrl}` })
    }

    const claimKey = item.claim.trim().toLowerCase()
    if (seenClaims.has(claimKey)) issues.push({ level: 'error', id: item.id, message: 'Duplicate claim text' })
    seenClaims.add(claimKey)

    const combo = `${(item.sourceUrl || '').toLowerCase()}::${claimKey}`
    if (seenClaimSource.has(combo)) issues.push({ level: 'error', id: item.id, message: 'Duplicate source/claim combination' })
    seenClaimSource.add(combo)
  }

  const uniqueUrls = [...new Set(retained.map((item) => item.sourceUrl).filter(Boolean))] as string[]
  let urlOk = 0
  let urlRestricted = 0
  let urlRateLimited = 0
  let urlFailed = 0
  let urlUnverified = 0
  const skipNetwork = process.env.CITATION_HUB_SKIP_NETWORK === '1'

  if (skipNetwork) {
    urlUnverified = uniqueUrls.length
    issues.push({ level: 'warning', message: `Network URL checks skipped (${uniqueUrls.length} unique source URLs left unverified).` })
  } else {
    for (const url of uniqueUrls) {
      const result = await checkUrl(url)
      const verified = urlHasHumanVerification(url, retained)
      if (result === 'ok') {
        urlOk += 1
      } else if (result === 'restricted') {
        urlRestricted += 1
        issues.push({
          level: verified ? 'warning' : 'error',
          message: `Source URL restricted (HTTP 401/403); not counted as successful: ${url}`,
        })
      } else if (result === 'rate_limited') {
        urlRateLimited += 1
        issues.push({
          level: verified ? 'warning' : 'error',
          message: `Source URL rate-limited (HTTP 429); not counted as successful: ${url}`,
        })
      } else if (result === 'failed') {
        urlFailed += 1
        issues.push({ level: 'warning', message: `Source URL did not return a successful response: ${url}` })
      } else {
        urlUnverified += 1
        issues.push({ level: 'warning', message: `Source URL unverified (network error or timeout): ${url}` })
      }
    }
  }

  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warning')

  console.log('Citation hub validation report')
  console.log('==============================')
  console.log(`Candidates researched: ${STATISTIC_CANDIDATES.length}`)
  console.log(`Retained: ${retained.length}`)
  console.log(`Rejected: ${rejected.length}`)
  console.log(`Unique source URLs: ${uniqueUrls.length}`)
  console.log(`URL checks: successful=${urlOk} restricted=${urlRestricted} rate-limited=${urlRateLimited} failed=${urlFailed} unverified=${urlUnverified}`)
  console.log('HTTP 403/429 are not successful checks.')
  console.log(`Errors: ${errors.length}`)
  console.log(`Warnings: ${warnings.length}`)
  console.log('Note: HTTP success does not prove the quoted number is correct.')
  for (const issue of issues) {
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN'
    console.log(`${prefix}${issue.id ? ` [${issue.id}]` : ''}: ${issue.message}`)
  }

  if (errors.length) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Citation hub validator crashed:', error)
  process.exit(1)
})
