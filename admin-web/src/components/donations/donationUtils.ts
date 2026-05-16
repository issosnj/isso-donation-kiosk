import { format } from 'date-fns'
import type { Donation, DonationsKpis } from '@/types/donation'

export function computeDonationKpis(donations: Donation[]): DonationsKpis {
  const succeeded = donations.filter((d) => d.status === 'SUCCEEDED')
  const totalGross = succeeded.reduce((sum, d) => sum + Number(d.amount), 0)
  const totalFees = succeeded.reduce(
    (sum, d) => sum + Number(d.stripeFee || d.squareFee || 0),
    0,
  )
  const totalNet = succeeded.reduce(
    (sum, d) => sum + Number(d.netAmount ?? d.amount),
    0,
  )
  return {
    totalGross,
    totalNet,
    totalFees,
    completedCount: succeeded.length,
    pendingCount: donations.filter((d) => d.status === 'PENDING').length,
    failedCancelledCount: donations.filter((d) =>
      ['FAILED', 'CANCELED'].includes(String(d.status)),
    ).length,
  }
}

export function filterBySucceededToggle(
  donations: Donation[],
  showFailedAndCancelled: boolean,
): Donation[] {
  if (showFailedAndCancelled) return donations
  return donations.filter((d) => d.status === 'SUCCEEDED')
}

export function applyClientDonationFilters(
  donations: Donation[],
  opts: {
    searchQuery: string
    statusFilter: string
    categoryFilter: string
  },
): Donation[] {
  let list = donations
  const q = opts.searchQuery.trim().toLowerCase()
  if (q) {
    list = list.filter((d) => {
      const name = (d.donorName || '').toLowerCase()
      const phone = (d.donorPhone || '').replace(/\D/g, '')
      const qDigits = q.replace(/\D/g, '')
      const receipt = (d.receiptNumber || '').toLowerCase()
      return (
        name.includes(q) ||
        (qDigits.length > 0 && phone.includes(qDigits)) ||
        (d.donorPhone || '').toLowerCase().includes(q) ||
        receipt.includes(q)
      )
    })
  }
  if (opts.statusFilter) {
    list = list.filter((d) => d.status === opts.statusFilter)
  }
  if (opts.categoryFilter) {
    list = list.filter((d) => {
      const id = d.category?.id ?? '__general__'
      return id === opts.categoryFilter
    })
  }
  return list
}

export function extractCategoryOptions(donations: Donation[]): { id: string; name: string }[] {
  const map = new Map<string, string>()
  for (const d of donations) {
    if (d.category?.id) {
      map.set(d.category.id, d.category.name)
    } else {
      map.set('__general__', 'General')
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function exportDonationsToCsv(rows: Donation[], filenamePrefix = 'donations'): void {
  if (rows.length === 0) return
  const csvRows = rows.map((d) => ({
    Date: format(new Date(d.createdAt), 'yyyy-MM-dd HH:mm'),
    Temple: d.temple?.name || '',
    Receipt: d.receiptNumber || '',
    Gross: Number(d.amount).toFixed(2),
    Fee:
      d.stripeFee || d.squareFee
        ? Number(d.stripeFee || d.squareFee).toFixed(2)
        : '',
    Net: d.netAmount ? Number(d.netAmount).toFixed(2) : Number(d.amount).toFixed(2),
    Category: d.category?.name || 'General',
    Status: d.status,
    Donor: d.donorName || d.donorPhone || 'Anonymous',
    Email: d.donorEmail || '',
  }))
  const headers = Object.keys(csvRows[0])
  const csv = [
    headers.join(','),
    ...csvRows.map((r) =>
      headers
        .map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function formatMoney(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function donationFee(d: Donation): number {
  return Number(d.stripeFee || d.squareFee || 0)
}

export function donationNet(d: Donation): number | null {
  if (d.status !== 'SUCCEEDED') return null
  if (d.netAmount != null) return Number(d.netAmount)
  return Number(d.amount)
}
