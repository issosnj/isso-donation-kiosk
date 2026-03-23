'use client'

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface ThemeSectionCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function ThemeSectionCard({
  title,
  description,
  icon,
  children,
  defaultOpen = true,
}: ThemeSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </div>
  )
}
