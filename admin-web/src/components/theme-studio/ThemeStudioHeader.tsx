'use client'

import {
  EllipsisVerticalIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  CloudArrowUpIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

interface ThemeStudioHeaderProps {
  lastEditedBy?: string | null
  lastPublishedAt?: string | null
  status: 'draft' | 'published'
  hasUnsavedChanges: boolean
  onSaveDraft: () => void
  onPublish: () => void
  onRevert: () => void
  onResetDraft?: () => void
  onDuplicate?: () => void
  onRestoreVersion?: () => void
  isSaving?: boolean
}

export default function ThemeStudioHeader({
  lastEditedBy,
  lastPublishedAt,
  status,
  hasUnsavedChanges,
  onSaveDraft,
  onPublish,
  onRevert,
  onResetDraft,
  onDuplicate,
  onRestoreVersion,
  isSaving = false,
}: ThemeStudioHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—'
    try {
      const date = new Date(d)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return d
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Kiosk Theme Studio</h1>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Global Theme
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Design, preview, and publish the donation kiosk experience used across all temple kiosks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSaveDraft}
            disabled={!hasUnsavedChanges || isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DocumentCheckIcon className="h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={onPublish}
            disabled={!hasUnsavedChanges || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloudArrowUpIcon className="h-4 w-4" />
            Publish Changes
          </button>
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50"
              aria-expanded={moreOpen}
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden="true"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      onRevert()
                      setMoreOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Revert to Published
                  </button>
                  {onResetDraft && (
                    <button
                      onClick={() => {
                        onResetDraft()
                        setMoreOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Reset Draft
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={() => {
                        onDuplicate()
                        setMoreOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Duplicate Theme
                    </button>
                  )}
                  {onRestoreVersion && (
                    <button
                      onClick={() => {
                        onRestoreVersion()
                        setMoreOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ClockIcon className="h-4 w-4" />
                      Restore Previous Version
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'published' ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
          {status === 'published' ? 'Published' : 'Draft'}
        </div>
        {hasUnsavedChanges && (
          <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
            Unsaved changes
          </span>
        )}
        {lastEditedBy && <span>Last edited by {lastEditedBy}</span>}
        {lastPublishedAt && (
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            Published {formatDate(lastPublishedAt)}
          </span>
        )}
      </div>
    </div>
  )
}
