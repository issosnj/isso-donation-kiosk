'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { COMMAND_PALETTE_PAGES, QUICK_ACTIONS } from '@/lib/masterNavigation'

type PaletteItem =
  | { kind: 'action'; id: string; label: string; tab?: string; scrollTo?: 'alerts'; soon?: boolean }
  | { kind: 'nav'; id: string; label: string; tab?: string; soon?: boolean; group: string }

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (tab: string) => void
  onScrollTo?: (target: 'alerts') => void
}

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onScrollTo,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const items: PaletteItem[] = useMemo(() => {
    const actions: PaletteItem[] = QUICK_ACTIONS.map((a) => ({
      kind: 'action' as const,
      id: `action-${a.id}`,
      label: a.label,
      tab: a.tab,
      scrollTo: a.scrollTo,
      soon: a.soon,
    }))
    const nav: PaletteItem[] = COMMAND_PALETTE_PAGES.map((p) => ({
      kind: 'nav' as const,
      id: p.id,
      label: p.label,
      tab: p.tab,
      soon: p.soon,
      group: p.group,
    }))
    return [...actions, ...nav]
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const label = item.label.toLowerCase()
      if (label.includes(q)) return true
      if (item.kind === 'nav') {
        const page = COMMAND_PALETTE_PAGES.find((p) => p.id === item.id)
        return page?.keywords?.some((k) => k.includes(q))
      }
      return false
    })
  }, [items, query])

  const selectable = filtered.filter((i) => !i.soon)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
    } else {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const runItem = useCallback(
    (item: PaletteItem) => {
      if (item.soon) return
      if (item.kind === 'action' && item.scrollTo) {
        onNavigate('overview')
        onScrollTo?.(item.scrollTo)
      } else if (item.tab) {
        onNavigate(item.tab)
      }
      onClose()
    },
    [onClose, onNavigate, onScrollTo],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(selectable.length, 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + Math.max(selectable.length, 1)) % Math.max(selectable.length, 1))
        return
      }
      if (e.key === 'Enter' && selectable[activeIndex]) {
        e.preventDefault()
        runItem(selectable[activeIndex])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, selectable, activeIndex, runItem])

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  let selectableIdx = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg dashboard-card shadow-2xl overflow-hidden animate-fade-in"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages and actions…"
            className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[min(360px,50vh)] overflow-y-auto p-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-sm text-gray-500 text-center">No results</p>
          ) : (
            filtered.map((item) => {
              const isDisabled = !!item.soon
              const isActive = !isDisabled && ++selectableIdx === activeIndex
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => runItem(item)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-xl flex items-center justify-between gap-2 transition-colors ${
                    isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isActive
                        ? 'bg-violet-100 text-violet-900'
                        : 'text-gray-800 hover:bg-violet-50'
                  }`}
                >
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-[10px] text-gray-400 uppercase">
                      {item.kind === 'action' ? 'Action' : 'Page'}
                    </span>
                  </span>
                  {item.soon && (
                    <span className="text-[9px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                      Coming soon
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 flex gap-3 text-[10px] text-gray-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
