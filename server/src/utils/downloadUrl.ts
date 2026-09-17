/**
 * Single place that builds the relative `GET /api/download/:filename` path.
 *
 * Stored filenames come from sanitizeFilename(), which deliberately keeps
 * spaces (see utils/sanitizeFilename.ts). An unencoded space ends the URL
 * early for any consumer that parses the path before the browser's URL
 * parser normalizes it, so the result link points at a filename that was
 * truncated at the first space and 404s. Percent-encode at construction —
 * Express decodes `:filename` again on the way in, so the route still sees
 * the exact stored name.
 */
export function downloadPath(filename: string): string {
  return `/api/download/${encodeURIComponent(filename)}`
}

/**
 * Same encoding contract for the in-app audio playback route
 * (`GET /api/audio/:filename`), whose filenames come from the same
 * space-preserving stem builder in utils/exportFileNames.ts.
 */
export function audioPath(filename: string): string {
  return `/api/audio/${encodeURIComponent(filename)}`
}
