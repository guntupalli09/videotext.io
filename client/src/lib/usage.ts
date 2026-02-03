export interface UsageData {
  count: number
  resetDate: string
}

export function getUsage(toolName: string): UsageData {
  const usageKey = `videotool_usage_${toolName}`
  const stored = localStorage.getItem(usageKey)
  
  if (!stored) {
    const resetDate = new Date()
    resetDate.setMonth(resetDate.getMonth() + 1)
    return {
      count: 0,
      resetDate: resetDate.toISOString(),
    }
  }

  const usage: UsageData = JSON.parse(stored)
  const resetDate = new Date(usage.resetDate)
  const now = new Date()

  // Check if monthly reset needed
  if (now > resetDate) {
    const newResetDate = new Date()
    newResetDate.setMonth(newResetDate.getMonth() + 1)
    const newUsage: UsageData = {
      count: 0,
      resetDate: newResetDate.toISOString(),
    }
    localStorage.setItem(usageKey, JSON.stringify(newUsage))
    return newUsage
  }

  return usage
}

export function incrementUsage(toolName: string): void {
  const usage = getUsage(toolName)
  usage.count++
  const usageKey = `videotool_usage_${toolName}`
  localStorage.setItem(usageKey, JSON.stringify(usage))
}

/** No per-tool use limit; only backend minute limit applies. Kept for backwards compatibility if needed. */
export function getLimit(_toolName: string): number {
  return 999999
}
