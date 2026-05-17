'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import { useState } from 'react'

type Snapshot = {
  donorName: string | null
  donorPhone: string | null
  donorEmail: string | null
  donorAddress: string | null
  donorId: string | null
}

function SnapshotDiff({ label, snap }: { label: string; snap: Snapshot }) {
  return (
    <div className="text-xs space-y-0.5 text-gray-700">
      <div className="font-semibold text-gray-900">{label}</div>
      <div>Name: {snap.donorName || '—'}</div>
      <div>Phone: {snap.donorPhone || '—'}</div>
      <div>Email: {snap.donorEmail || '—'}</div>
      <div>Address: {snap.donorAddress ? `${snap.donorAddress.slice(0, 80)}${snap.donorAddress.length > 80 ? '…' : ''}` : '—'}</div>
      <div>Donor ID: {snap.donorId || '—'}</div>
    </div>
  )
}

export default function DonationChangeRequestsTab() {
  const queryClient = useQueryClient()
  const [filterTempleId, setFilterTempleId] = useState<string>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: temples } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
      return Array.isArray(response.data) ? response.data : []
    },
  })

  const { data: requests, isLoading } = useQuery({
    queryKey: ['donation-change-requests', filterTempleId],
    queryFn: async () => {
      const params: Record<string, string> = { status: 'PENDING' }
      if (filterTempleId !== 'all') params.templeId = filterTempleId
      const response = await api.get('/donation-change-requests', { params })
      return response.data as any[]
    },
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/donation-change-requests/${id}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donation-change-requests'] })
      queryClient.invalidateQueries({ queryKey: ['donations'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Approve failed')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const response = await api.post(`/donation-change-requests/${id}/reject`, { reviewNote: note || undefined })
      return response.data
    },
    onSuccess: () => {
      setRejectingId(null)
      setRejectNote('')
      queryClient.invalidateQueries({ queryKey: ['donation-change-requests'] })
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Reject failed')
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-end justify-between">
        <div className="min-w-[200px] ml-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Temple</label>
          <select
            value={filterTempleId}
            onChange={(e) => setFilterTempleId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All temples</option>
            {(temples || []).map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!requests?.length ? (
        <div className="p-12 text-center text-gray-500">No pending requests.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {requests.map((r: any) => (
            <div key={r.id} className="p-4 hover:bg-gray-50/80">
              <div className="flex flex-wrap gap-4 justify-between items-start">
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-gray-900">
                    {r.temple?.name || 'Temple'} · Donation{' '}
                    <span className="font-mono text-xs">{r.donationId?.slice(0, 8)}…</span>
                  </div>
                  <div className="text-gray-600">
                    Requested {format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')} by{' '}
                    {r.requestedByUser?.name || r.requestedByUser?.email || 'Unknown'}
                  </div>
                  {r.templeNote && (
                    <div className="text-gray-700 mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-sm">
                      <span className="font-medium text-amber-900">Temple note: </span>
                      {r.templeNote}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => {
                      if (confirm('Apply these donor fields to the donation?')) approveMutation.mutate(r.id)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(r.id)
                      setRejectNote('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <SnapshotDiff label="Current (before)" snap={r.previousSnapshot} />
                <SnapshotDiff label="Proposed (after)" snap={r.proposedSnapshot} />
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject request</h3>
            <p className="text-sm text-gray-600 mb-3">Optional note to the temple (shown in history only).</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm min-h-[100px]"
              placeholder="Reason (optional)"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejectingId, note: rejectNote })}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
