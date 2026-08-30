import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pageSrc = readFileSync(resolve(process.cwd(), 'src/pages/ApiKeysSettings.tsx'), 'utf8')
const libSrc = readFileSync(resolve(process.cwd(), 'src/lib/apiKeys.ts'), 'utf8')

test('API key page never writes the raw secret to localStorage or sessionStorage', () => {
  assert.doesNotMatch(pageSrc, /localStorage\.setItem/)
  assert.doesNotMatch(pageSrc, /sessionStorage\.setItem/)
})

test('API key page never logs the created key to the console', () => {
  assert.doesNotMatch(pageSrc, /console\.(log|debug|info|warn|error)\([^)]*createdKey/)
})

test('API key client library never persists keys to browser storage', () => {
  assert.doesNotMatch(libSrc, /localStorage\.(set|get)Item/)
  assert.doesNotMatch(libSrc, /sessionStorage\.(set|get)Item/)
})

test('API key page uses the real /api/api-keys endpoints, not an invented second key system', () => {
  assert.match(libSrc, /\/api\/api-keys/)
})

test('revoke requires explicit confirmation copy before calling the API', () => {
  assert.match(pageSrc, /Revoke this API key\?/)
  assert.match(pageSrc, /immediately stop working/)
})

test('created-key view tells the user the secret cannot be viewed again', () => {
  assert.match(pageSrc, /cannot show it again/i)
})

test('Pro-gated view links to /pricing rather than faking access client-side', () => {
  assert.match(pageSrc, /to="\/pricing"/)
})
