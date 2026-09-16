/** Join segments exactly as the web app does: segment text separated by a blank line. */
export function segmentsToText(segments) {
    return segments.map((s) => s.text).join('\n\n');
}
/** Words in the transcript — the only derived metric shown, and it is computed from the text itself. */
export function wordCount(text) {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}
/**
 * `<source file stem>-transcript.txt`, following the web app's export naming
 * (client/src/lib/exportFileNames.ts). Characters illegal in a filename are
 * replaced so chrome cannot reject the download.
 */
export function transcriptFileName(sourceFileName) {
    const stem = sourceFileName.replace(/\.[^./\\]+$/, '') || 'transcript';
    const safe = stem
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/-{2,}/g, '-')
        .trim()
        .slice(0, 80);
    return `${safe || 'transcript'}-transcript.txt`;
}
