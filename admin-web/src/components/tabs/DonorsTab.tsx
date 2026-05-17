'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Donor, DonorSegment, DonorSortKey } from '@/types/donor'
import {
  TempleFilter,
  DonorsPageHeader,
  DonorsKPICards,
  DonorsFiltersToolbar,
  DonorsTable,
  DonorsEmptyState,
  DonorProfileDrawer,
  DonorEditModal,
  computeDonorKpis,
  applyDonorSegment,
  sortDonors,
  exportDonorsToCsv,
  isValidDonorPhone,
  normalizeDonorPhone,
  setDonorVip,
  isDonorVip,
} from '@/components/donors'

interface DonorsTabProps {
  templeId?: string
  isMasterAdmin?: boolean
}

const SEGMENT_LABELS: Record<DonorSegment, string> = {
  all: 'all',
  vip: 'VIP',
  recurring: 'recurring',
  new: 'new',
  inactive: 'inactive',
  high_value: 'high value',
  anonymous: 'anonymous',
}

export default function DonorsTab({ templeId, isMasterAdmin = false }: DonorsTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<DonorSegment>('all')
  const [sortKey, setSortKey] = useState<DonorSortKey>('last_donation')
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null)
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [showAddDonor, setShowAddDonor] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', address: '', phone: '' })
  const [addForm, setAddForm] = useState({ name: '', email: '', address: '', phone: '' })
  const [vipVersion, setVipVersion] = useState(0)

  const limit = segment !== 'all' || sortKey !== 'last_donation' ? 200 : 50
  const effectiveTempleId = isMasterAdmin ? templeId : (templeId as string)

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: isMasterAdmin,
  })

  const endpoint =
    isMasterAdmin && effectiveTempleId
      ? `/donors/temple/${effectiveTempleId}`
      : !isMasterAdmin
        ? '/donors/my-temple'
        : null

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['donors', effectiveTempleId, page, search, limit],
    queryFn: async () => {
      if (!endpoint) return { donors: [], total: 0 }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      const response = await api.get(`${endpoint}?${params.toString()}`)
      return response.data
    },
    enabled: !!endpoint,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['donor-stats', effectiveTempleId],
    queryFn: async () => {
      if (!effectiveTempleId) return null
      const res = await api.get(`/donors/temple/${effectiveTempleId}/stats`)
      return res.data
    },
    enabled: !!effectiveTempleId && !!endpoint,
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      name?: string
      email?: string
      address?: string
      phone?: string
    }) => {
      if (!editingDonor) return
      const response = await api.put(`/donors/${editingDonor.id}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      setEditingDonor(null)
      if (selectedDonor) setSelectedDonor(null)
      alert('Donor updated successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      alert(error.response?.data?.message || 'Failed to update donor')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: {
      name?: string
      phone: string
      email?: string
      address?: string
      templeId?: string
    }) => {
      const response = await api.post('/donors', body)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      setShowAddDonor(false)
      setAddForm({ name: '', email: '', address: '', phone: '' })
      alert('Donor added successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      alert(error.response?.data?.message || 'Failed to create donor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (donorId: string) => {
      await api.delete(`/donors/${donorId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      setSelectedDonor(null)
      alert('Donor deleted successfully!')
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      alert(error.response?.data?.message || 'Failed to delete donor')
    },
  })

  const handleTempleSelect = (id: string | undefined) => {
    const params = new URLSearchParams(window.location.search)
    params.set('tab', 'donors')
    if (id) params.set('templeId', id)
    else params.delete('templeId')
    router.push(`/dashboard?${params.toString()}`)
  }

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor)
    setEditForm({
      name: donor.name || '',
      email: donor.email || '',
      address: donor.address || '',
      phone: donor.phone || '',
    })
  }

  const handleDelete = (donorId: string) => {
    if (confirm('Are you sure you want to delete this donor? This action cannot be undone.')) {
      deleteMutation.mutate(donorId)
    }
  }

  const handleBackfill = async () => {
    if (
      !confirm(
        'This will create donor records from all past successful donations. Continue?',
      )
    ) {
      return
    }
    try {
      const res = await api.post(
        '/donors/backfill' + (effectiveTempleId ? `?templeId=${effectiveTempleId}` : ''),
      )
      alert(
        `Backfill complete! Created: ${res.data.created}, Updated: ${res.data.updated}${res.data.errors > 0 ? `, Errors: ${res.data.errors}` : ''}`,
      )
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to backfill donors')
    }
  }

  const rawDonors: Donor[] = data?.donors || []
  const total = data?.total || 0
  const selectedTemple = temples.find((t: { id: string }) => t.id === effectiveTempleId)

  const displayedDonors = useMemo(() => {
    void vipVersion
    let list = applyDonorSegment(rawDonors, segment)
    list = sortDonors(list, sortKey)
    return list
  }, [rawDonors, segment, sortKey, vipVersion])

  const kpis = computeDonorKpis(stats)

  const clearFilters = () => {
    setSearch('')
    setSegment('all')
    setSortKey('last_donation')
    setPage(1)
  }

  if (isMasterAdmin && !effectiveTempleId) {
    return (
      <div className="space-y-6">
        <DonorsPageHeader
          isMasterAdmin
          onAddDonor={() => {}}
          onExport={() => {}}
          onImport={() => {}}
          onBackfill={() => {}}
          exportDisabled
        />
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-8">
          <TempleFilter
            temples={temples}
            selectedTempleId={undefined}
            onSelect={handleTempleSelect}
          />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm">
          <DonorsEmptyState variant="select_temple" />
        </div>
      </div>
    )
  }

  const emptyVariant =
    rawDonors.length === 0
      ? search
        ? 'no_results'
        : 'no_donors'
      : displayedDonors.length === 0
        ? 'segment'
        : null

  return (
    <div className="space-y-6 pb-8 min-w-0 max-w-full">
      <DonorsPageHeader
        isMasterAdmin={isMasterAdmin}
        templeLabel={selectedTemple?.name}
        onAddDonor={() => setShowAddDonor(true)}
        onExport={() => exportDonorsToCsv(displayedDonors.length ? displayedDonors : rawDonors)}
        onImport={() =>
          alert(
            'CSV import is coming soon. Use Add Donor or Backfill from donations to populate your directory.',
          )
        }
        onBackfill={handleBackfill}
        exportDisabled={rawDonors.length === 0}
      />

      <DonorsKPICards kpis={kpis} isLoading={statsLoading} />

      <DonorsFiltersToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchInputRef={searchInputRef}
        segment={segment}
        onSegmentChange={(s) => {
          setSegment(s)
          setPage(1)
        }}
        sortKey={sortKey}
        onSortChange={setSortKey}
        onClearFilters={clearFilters}
        isMasterAdmin={isMasterAdmin}
        temples={temples}
        selectedTempleId={effectiveTempleId}
        onTempleSelect={handleTempleSelect}
        resultCount={displayedDonors.length}
      />

      {emptyVariant ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm">
          <DonorsEmptyState
            variant={emptyVariant}
            segmentLabel={SEGMENT_LABELS[segment]}
            templeName={selectedTemple?.name}
            onAddDonor={() => setShowAddDonor(true)}
            onBackfill={handleBackfill}
            onClearSearch={clearFilters}
          />
        </div>
      ) : (
        <DonorsTable
          donors={displayedDonors}
          isLoading={isLoading || isFetching}
          isMasterAdmin={isMasterAdmin}
          onRowClick={setSelectedDonor}
          getRowActions={(donor) => ({
            onView: () => setSelectedDonor(donor),
            onEdit: () => handleEdit(donor),
            onDelete: () => handleDelete(donor.id),
            onMarkVip: () => {
              setDonorVip(donor.id, !isDonorVip(donor.id))
              setVipVersion((v) => v + 1)
            },
            isVip: isDonorVip(donor.id),
          })}
          page={page}
          limit={limit}
          total={segment === 'all' && sortKey === 'last_donation' ? total : displayedDonors.length}
          onPageChange={setPage}
        />
      )}

      {selectedDonor && (
        <DonorProfileDrawer
          donor={selectedDonor}
          templeId={effectiveTempleId}
          isMasterAdmin={isMasterAdmin}
          onClose={() => setSelectedDonor(null)}
          onEdit={() => handleEdit(selectedDonor)}
        />
      )}

      {editingDonor && (
        <DonorEditModal
          form={editForm}
          onChange={setEditForm}
          onSave={() => updateMutation.mutate(editForm)}
          onClose={() => setEditingDonor(null)}
          isSaving={updateMutation.isPending}
        />
      )}

      {showAddDonor && (
        <DonorEditModal
          title="Add donor"
          form={addForm}
          onChange={setAddForm}
          onSave={() => {
            const phone = normalizeDonorPhone(addForm.phone)
            if (!phone) {
              alert('Phone number is required')
              return
            }
            if (!isValidDonorPhone(addForm.phone)) {
              alert('Enter a valid 10-digit phone number (optional +1 country code).')
              return
            }
            createMutation.mutate({
              ...addForm,
              phone,
              templeId: effectiveTempleId,
            })
          }}
          onClose={() => setShowAddDonor(false)}
          isSaving={createMutation.isPending}
        />
      )}
    </div>
  )
}
