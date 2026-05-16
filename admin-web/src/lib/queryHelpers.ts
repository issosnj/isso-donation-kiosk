import { startOfDay, subDays } from 'date-fns'

/** Do not retry rate-limited or auth errors — retries amplify 429 storms. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 429 || status === 401 || status === 403) return false
  return failureCount < 2
}

export const OVERVIEW_TREND_DAYS = 90

export function getOverviewTrendRange(referenceDate: Date = new Date()) {
  const end = startOfDay(referenceDate)
  const start = subDays(end, OVERVIEW_TREND_DAYS)
  return { start, end }
}

export const overviewQueryDefaults = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchOnMount: false,
  retry: false,
} as const

export const dashboardQueryDefaults = {
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: shouldRetryQuery,
} as const
