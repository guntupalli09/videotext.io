/**
 * Client-safe error message for 500 responses. Never forwards `error.message` —
 * that can leak internal details (DB/Prisma errors, file paths, stack fragments).
 * Callers are expected to have already logged the full error server-side.
 */
export function safeErrorMessage(fallback: string): string {
  return fallback
}
