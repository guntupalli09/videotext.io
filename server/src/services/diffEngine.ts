export type DiffSegmentType = 'unchanged' | 'added' | 'removed'

export interface DiffSegment {
  type: DiffSegmentType
  text: string
}

function mergeConsecutive(segs: DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = []
  for (const s of segs) {
    const last = out[out.length - 1]
    if (last && last.type === s.type) {
      last.text = `${last.text} ${s.text}`
    } else {
      out.push({ type: s.type, text: s.text })
    }
  }
  return out
}

/** Word-level diff (whitespace split); LCS backtrack; merge consecutive same-type runs. */
export function computeTranscriptDiff(original: string, formatted: string): DiffSegment[] {
  const a = original.trim().split(/\s+/).filter(Boolean)
  const b = formatted.trim().split(/\s+/).filter(Boolean)
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  const raw: DiffSegment[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      raw.push({ type: 'unchanged', text: a[i - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'added', text: b[j - 1] })
      j -= 1
    } else if (i > 0) {
      raw.push({ type: 'removed', text: a[i - 1] })
      i -= 1
    } else {
      raw.push({ type: 'added', text: b[j - 1] })
      j -= 1
    }
  }
  raw.reverse()
  return mergeConsecutive(raw)
}
