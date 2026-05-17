/** Coerce API values to finite numbers for display and charts. */
export function safeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return n
}

export function formatCurrency(value: unknown, options?: { compact?: boolean }): string {
  const n = safeNumber(value)
  if (options?.compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(1)}k`
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function formatCount(value: unknown): string {
  return safeNumber(value).toLocaleString('en-US')
}

export function formatPercent(value: unknown, decimals = 1): string {
  const n = safeNumber(value)
  return `${n.toFixed(decimals)}%`
}

export function formatTrendPercent(value: unknown): string {
  const n = safeNumber(value)
  if (n === 0) return 'No change'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

/** Executive KPI primary value — always show a readable number (never empty). */
export function formatKpiValue(value: unknown, format: (n: number) => string): string {
  return format(safeNumber(value))
}

export function sanitizeSparkline(data: unknown): number[] {
  if (!Array.isArray(data)) return [0]
  const cleaned = data.map((v) => safeNumber(v, 0))
  return cleaned.length > 0 ? cleaned : [0]
}
