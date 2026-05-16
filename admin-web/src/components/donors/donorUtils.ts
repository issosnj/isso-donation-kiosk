import { format } from 'date-fns'
import type { Donor, DonorKpis, DonorSegment, DonorSortKey, DonorStats } from '@/types/donor'

const VIP_STORAGE_PREFIX = 'isso-donor-vip:'
const NOTES_STORAGE_PREFIX = 'isso-donor-notes:'

export function formatMoney(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatMoneyPrecise(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDonorDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function normalizeDonorPhone(phone: string): string {
  return phone.trim().replace(/\D/g, '')
}

/** US-style numbers: 10 digits, or 11 with leading country code 1. */
export function isValidDonorPhone(phone: string): boolean {
  const digits = normalizeDonorPhone(phone)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

export function donorDisplayName(donor: Donor): string {
  return donor.name?.trim() || 'Anonymous donor'
}

export function donorInitials(donor: Donor): string {
  const name = donor.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const digits = donor.phone.replace(/\D/g, '')
  return digits.slice(-2) || '?'
}

export function computeDonorKpis(stats: DonorStats | null | undefined): DonorKpis {
  const total = stats?.total ?? 0
  const totalDonated = stats?.totalDonated ?? 0
  return {
    total,
    totalDonated,
    newThisMonth: stats?.newThisMonth ?? 0,
    repeatCount: stats?.repeatCount ?? 0,
    activeCount: stats?.activeCount ?? 0,
    averageDonation: total > 0 ? totalDonated / total : 0,
    recurringCount: stats?.repeatCount ?? 0,
  }
}

export function isDonorVip(donorId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`${VIP_STORAGE_PREFIX}${donorId}`) === '1'
}

export function setDonorVip(donorId: string, vip: boolean): void {
  if (typeof window === 'undefined') return
  if (vip) localStorage.setItem(`${VIP_STORAGE_PREFIX}${donorId}`, '1')
  else localStorage.removeItem(`${VIP_STORAGE_PREFIX}${donorId}`)
}

export function getDonorNotes(donorId: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`${NOTES_STORAGE_PREFIX}${donorId}`) || ''
}

export function setDonorNotes(donorId: string, notes: string): void {
  if (typeof window === 'undefined') return
  if (notes.trim()) localStorage.setItem(`${NOTES_STORAGE_PREFIX}${donorId}`, notes)
  else localStorage.removeItem(`${NOTES_STORAGE_PREFIX}${donorId}`)
}

function isNewThisMonth(donor: Donor): boolean {
  const created = new Date(donor.createdAt)
  const now = new Date()
  return (
    created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
  )
}

function isInactive(donor: Donor): boolean {
  if (!donor.lastDonationDate) return true
  const last = new Date(donor.lastDonationDate)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  return last < cutoff
}

function isHighValue(donor: Donor, threshold = 500): boolean {
  return Number(donor.totalAmount) >= threshold
}

export function getDonorBadges(donor: Donor): { id: string; label: string; className: string }[] {
  const badges: { id: string; label: string; className: string }[] = []
  if (isDonorVip(donor.id)) {
    badges.push({
      id: 'vip',
      label: 'VIP',
      className: 'bg-amber-50 text-amber-800 ring-amber-200/80',
    })
  }
  if (donor.totalDonations > 1) {
    badges.push({
      id: 'repeat',
      label: 'Repeat',
      className: 'bg-violet-50 text-violet-700 ring-violet-200/80',
    })
  }
  if (isNewThisMonth(donor)) {
    badges.push({
      id: 'new',
      label: 'New',
      className: 'bg-sky-50 text-sky-700 ring-sky-200/80',
    })
  }
  if (!donor.name?.trim()) {
    badges.push({
      id: 'anon',
      label: 'Anonymous',
      className: 'bg-gray-100 text-gray-600 ring-gray-200/80',
    })
  }
  if (isInactive(donor) && donor.totalDonations > 0) {
    badges.push({
      id: 'inactive',
      label: 'Inactive',
      className: 'bg-gray-100 text-gray-500 ring-gray-200/80',
    })
  }
  return badges
}

export function applyDonorSegment(donors: Donor[], segment: DonorSegment): Donor[] {
  if (segment === 'all') return donors
  return donors.filter((d) => {
    switch (segment) {
      case 'vip':
        return isDonorVip(d.id) || isHighValue(d, 1000)
      case 'recurring':
        return d.totalDonations > 1
      case 'new':
        return isNewThisMonth(d)
      case 'inactive':
        return isInactive(d)
      case 'high_value':
        return isHighValue(d)
      case 'anonymous':
        return !d.name?.trim()
      default:
        return true
    }
  })
}

export function sortDonors(donors: Donor[], sortKey: DonorSortKey): Donor[] {
  const list = [...donors]
  list.sort((a, b) => {
    switch (sortKey) {
      case 'name': {
        const an = (a.name || a.phone).toLowerCase()
        const bn = (b.name || b.phone).toLowerCase()
        return an.localeCompare(bn)
      }
      case 'total_amount':
        return Number(b.totalAmount) - Number(a.totalAmount)
      case 'donation_count':
        return b.totalDonations - a.totalDonations
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'last_donation':
      default: {
        const at = a.lastDonationDate ? new Date(a.lastDonationDate).getTime() : 0
        const bt = b.lastDonationDate ? new Date(b.lastDonationDate).getTime() : 0
        return bt - at
      }
    }
  })
  return list
}

export function exportDonorsToCsv(donors: Donor[], filenamePrefix = 'donors'): void {
  if (donors.length === 0) return
  const rows = donors.map((d) => ({
    Name: d.name || 'Anonymous',
    Email: d.email || '',
    Phone: d.phone,
    'Total donated': Number(d.totalAmount).toFixed(2),
    Donations: d.totalDonations,
    'Last donation': d.lastDonationDate
      ? format(new Date(d.lastDonationDate), 'yyyy-MM-dd')
      : '',
    Temple: d.temple?.name || '',
  }))
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
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
