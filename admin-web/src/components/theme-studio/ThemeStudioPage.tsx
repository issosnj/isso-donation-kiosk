'use client'

import { useState, useCallback } from 'react'
import type { KioskTheme, PresetId } from '@/types/theme'
import { themeToApi, applyPreset } from '@/lib/theme-utils'
import ThemeStudioHeader from './ThemeStudioHeader'
import ThemeModeToggle from './ThemeModeToggle'
import ThemePresetPicker from './ThemePresetPicker'
import BrandEditor from './editors/BrandEditor'
import TypographyEditor from './editors/TypographyEditor'
import ButtonCardEditor from './editors/ButtonCardEditor'
import LayoutEditor from './editors/LayoutEditor'
import AdvancedEditor from './editors/AdvancedEditor'
import KioskPreviewPanel from './preview/KioskPreviewPanel'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ThemeStudioPageProps {
  /** Current theme from API (published state) */
  publishedTheme: KioskTheme | null
  /** Draft theme being edited */
  draftTheme: KioskTheme
  /** Called when draft changes */
  onDraftChange: (theme: KioskTheme) => void
  /** Save draft to backend */
  onSave: (theme: KioskTheme, description?: string) => void
  /** Whether save is in progress */
  isSaving?: boolean
  /** Last edited by (from global settings) */
  lastEditedBy?: string | null
  /** Last published at */
  lastPublishedAt?: string | null
  /** Open Version History (for Restore) */
  onOpenVersionHistory?: () => void
}

export default function ThemeStudioPage({
  publishedTheme,
  draftTheme,
  onDraftChange,
  onSave,
  isSaving = false,
  lastEditedBy,
  lastPublishedAt,
  onOpenVersionHistory,
}: ThemeStudioPageProps) {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic')
  const [selectedPreset, setSelectedPreset] = useState<PresetId | 'custom'>('custom')

  const hasUnsavedChanges = publishedTheme
    ? JSON.stringify(themeToApi(draftTheme)) !== JSON.stringify(themeToApi(publishedTheme))
    : true

  const handlePresetSelect = useCallback(
    (id: PresetId) => {
      const applied = applyPreset(id)
      onDraftChange(applied)
      setSelectedPreset(id)
    },
    [onDraftChange]
  )

  const handleThemeChange = useCallback(
    (theme: KioskTheme) => {
      onDraftChange(theme)
      setSelectedPreset('custom')
    },
    [onDraftChange]
  )

  const handleRevert = useCallback(() => {
    if (publishedTheme) {
      onDraftChange(publishedTheme)
      setSelectedPreset('custom')
    }
  }, [publishedTheme, onDraftChange])

  const handleSaveDraft = useCallback(() => {
    onSave(draftTheme)
  }, [draftTheme, onSave])

  const handlePublish = useCallback(() => {
    onSave(draftTheme, 'Theme published')
  }, [draftTheme, onSave])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ThemeStudioHeader
        lastEditedBy={lastEditedBy}
        lastPublishedAt={lastPublishedAt}
        status={hasUnsavedChanges ? 'draft' : 'published'}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onRevert={handleRevert}
        onResetDraft={publishedTheme ? () => onDraftChange(publishedTheme) : undefined}
        onRestoreVersion={onOpenVersionHistory}
        isSaving={isSaving}
      />

      {/* Global warning banner */}
      <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800">
            Global kiosk theme
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            Changes published here affect all kiosk devices across all temple locations.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-6 mt-4 flex flex-1 flex-col gap-6 lg:flex-row">
        {/* Left: Editor panel */}
        <div className="flex w-full flex-col gap-4 lg:w-[40%] lg:min-w-[340px]">
          <div className="flex items-center justify-between">
            <ThemeModeToggle mode={mode} onChange={setMode} />
          </div>
          <div className="space-y-4 overflow-y-auto pr-2">
            <ThemePresetPicker
              selectedId={selectedPreset}
              onSelect={handlePresetSelect}
            />
            <BrandEditor theme={draftTheme} onChange={handleThemeChange} />
            <TypographyEditor theme={draftTheme} onChange={handleThemeChange} />
            <ButtonCardEditor theme={draftTheme} onChange={handleThemeChange} />
            <LayoutEditor theme={draftTheme} onChange={handleThemeChange} />
            {mode === 'advanced' && (
              <AdvancedEditor theme={draftTheme} onChange={handleThemeChange} />
            )}
          </div>
        </div>

        {/* Right: Preview panel */}
        <div className="flex min-h-[480px] flex-1 flex-col lg:min-h-[600px]">
          <KioskPreviewPanel theme={draftTheme} className="flex-1" />
        </div>
      </div>
    </div>
  )
}
