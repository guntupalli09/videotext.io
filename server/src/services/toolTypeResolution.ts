/**
 * Resolves which toolType actually runs for a job-intake pipeline. A
 * server-derived `forcedToolType` (set by every /api/v1 route — see
 * services/apiOperations.ts) always wins over whatever the client put in
 * the request body; the web upload routes never set `forcedToolType`, so
 * the client's own choice is used there, unchanged from before the
 * /api/v1 facade existed.
 *
 * Kept in its own module (deliberately free of any Prisma/queue/worker
 * imports, same convention as services/apiV1Format.ts) so it stays
 * unit-testable without pulling in the whole worker stack — see
 * tests/apiOperationsSecurity.test.ts, the regression test for the
 * "toolType=burn-subtitles sent to POST /api/v1/transcriptions must never
 * execute burn-subtitles" bug.
 */
export function resolveToolType(clientToolType: unknown, forcedToolType: string | undefined): string | undefined {
  if (forcedToolType) return forcedToolType
  return typeof clientToolType === 'string' ? clientToolType : undefined
}
