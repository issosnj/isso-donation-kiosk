'use client'

import { FormEvent, MutableRefObject, ReactNode, useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { isValidDonorPhone } from './donorUtils'

interface DonorEditModalProps {
  form: { name: string; email: string; address: string; phone: string }
  onChange: (form: DonorEditModalProps['form']) => void
  onSave: () => void
  onClose: () => void
  isSaving?: boolean
  mode?: 'add' | 'edit'
  error?: string | null
  /** Address already stored on the donor. Unchanged text can be saved without a new lookup. */
  initialAddress?: string
}

const fieldClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15'

export default function DonorEditModal({
  form,
  onChange,
  onSave,
  onClose,
  isSaving,
  mode = 'edit',
  error,
  initialAddress = '',
}: DonorEditModalProps) {
  const isAdd = mode === 'add'
  const nameRef = useRef<HTMLInputElement>(null)
  const suggestionsOpen = useRef(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    setFieldError(null)
  }, [form.name, form.phone, form.email, form.address])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) return
      if (suggestionsOpen.current) {
        suggestionsOpen.current = false
        window.dispatchEvent(new CustomEvent('donor-address-dismiss'))
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isSaving, onClose])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (isSaving) return

    const phone = form.phone.trim()
    if (isAdd && !phone) {
      setFieldError('Phone number is required.')
      return
    }
    if (phone && !isValidDonorPhone(phone)) {
      setFieldError('Enter a valid 10-digit phone number. A leading +1 is optional.')
      return
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFieldError('Enter a valid email address, or leave email blank.')
      return
    }
    const address = form.address.trim()
    const savedAddress = initialAddress.trim()
    if (address && address !== savedAddress && address !== verifiedAddress) {
      setFieldError('Choose a suggested address so the mailing address is verified.')
      return
    }

    setFieldError(null)
    onSave()
  }

  const message = fieldError || error

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => {
          if (!isSaving) onClose()
        }}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_24px_80px_rgba(154,52,18,0.18)] ring-1 ring-black/5 sm:rounded-[28px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-edit-title"
      >
        <div className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white px-6 pb-5 pt-6 sm:px-7">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-200/50" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-sm">
                {isAdd ? <UserPlusIcon /> : <PencilIcon />}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-600">
                  Donor Directory
                </p>
                <h2 id="donor-edit-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                  {isAdd ? 'Add Donor' : 'Edit Donor'}
                </h2>
                <p className="mt-1 text-sm leading-5 text-gray-600">
                  {isAdd
                    ? 'Phone is required. Gifts with the same number attach to this profile.'
                    : 'Changes apply to this donor profile. Gift history stays linked by phone.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-40"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 sm:px-7">
          <div className="space-y-4">
            <Field label="Name" hint="Optional. Leave blank for an anonymous profile.">
              <UserIcon />
              <input
                ref={nameRef}
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder="Donor name"
                autoComplete="name"
                className={fieldClass}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" required hint="10 digits, or 11 with a leading 1.">
                <PhoneIcon />
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => onChange({ ...form, phone: formatPhoneDraft(event.target.value) })}
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                  className={fieldClass}
                />
              </Field>
              <Field label="Email" hint="Used when a receipt should be emailed.">
                <MailIcon />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => onChange({ ...form, email: event.target.value })}
                  placeholder="name@email.com"
                  autoComplete="email"
                  className={fieldClass}
                />
              </Field>
            </div>

            <MailingAddressField
              value={form.address}
              savedAddress={initialAddress}
              verifiedAddress={verifiedAddress}
              suggestionsOpen={suggestionsOpen}
              onChange={(next, verified) => {
                onChange({ ...form, address: next })
                setVerifiedAddress(verified ? next : null)
              }}
            />
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
              {message}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {isSaving ? (isAdd ? 'Adding Donor...' : 'Saving...') : isAdd ? 'Add Donor' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type AddressPrediction = {
  description: string
  place_id: string
  structured_formatting?: { main_text?: string; secondary_text?: string }
}

function MailingAddressField({
  value,
  savedAddress,
  verifiedAddress,
  suggestionsOpen,
  onChange,
}: {
  value: string
  savedAddress: string
  verifiedAddress: string | null
  suggestionsOpen: MutableRefObject<boolean>
  onChange: (next: string, verified: boolean) => void
}) {
  const [predictions, setPredictions] = useState<AddressPrediction[]>([])
  const [open, setOpen] = useState(false)
  const [looking, setLooking] = useState(false)
  const [lookupNote, setLookupNote] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const sessionToken = useRef<string | null>(null)
  const requestId = useRef(0)

  const trimmed = value.trim()
  const unchanged = trimmed.length > 0 && trimmed === savedAddress.trim()
  const verified = trimmed.length > 0 && (unchanged || trimmed === verifiedAddress)

  useEffect(() => {
    suggestionsOpen.current = open && predictions.length > 0
  }, [open, predictions.length, suggestionsOpen])

  useEffect(() => {
    const dismiss = () => {
      setOpen(false)
      setPredictions([])
    }
    window.addEventListener('donor-address-dismiss', dismiss)
    return () => window.removeEventListener('donor-address-dismiss', dismiss)
  }, [])

  useEffect(() => {
    if (trimmed.length < 3 || verified) {
      setPredictions([])
      setOpen(false)
      setLooking(false)
      setLookupNote(null)
      return
    }

    const timeout = window.setTimeout(() => {
      if (!sessionToken.current) sessionToken.current = crypto.randomUUID()
      const current = ++requestId.current
      setLooking(true)
      setLookupNote(null)
      api
        .get<{ predictions?: AddressPrediction[] }>('/places/autocomplete', {
          params: { input: trimmed, sessionToken: sessionToken.current },
        })
        .then((response) => {
          if (current !== requestId.current) return
          const next = response.data?.predictions || []
          setPredictions(next)
          setOpen(true)
          setActiveIndex(0)
          setLookupNote(next.length === 0 ? 'No matching address. Try the street number and city.' : null)
        })
        .catch(() => {
          if (current !== requestId.current) return
          setPredictions([])
          setOpen(false)
          setLookupNote('Address lookup is unavailable right now. Try again in a moment.')
        })
        .finally(() => {
          if (current === requestId.current) setLooking(false)
        })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [trimmed, verified])

  const choose = async (prediction: AddressPrediction) => {
    const token = sessionToken.current
    sessionToken.current = null
    setOpen(false)
    setPredictions([])
    setLooking(true)
    try {
      const response = await api.get<{ formatted_address?: string } | null>('/places/details', {
        params: { placeId: prediction.place_id, sessionToken: token || undefined },
      })
      const formatted = response.data?.formatted_address?.trim() || prediction.description
      onChange(formatted, true)
    } catch {
      onChange(prediction.description, true)
    } finally {
      setLooking(false)
      setLookupNote(null)
    }
  }

  return (
    <Field
      label="Mailing Address"
      hint="Start typing and choose a suggested address. A blank address is allowed."
    >
      <span className="relative block">
        <PinIcon />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value, false)}
          onFocus={() => {
            if (predictions.length > 0) setOpen(true)
          }}
          onKeyDown={(event) => {
            if (!open || predictions.length === 0) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => (index + 1) % predictions.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => (index - 1 + predictions.length) % predictions.length)
            } else if (event.key === 'Enter') {
              event.preventDefault()
              const prediction = predictions[activeIndex]
              if (prediction) void choose(prediction)
            }
          }}
          placeholder="123 Main Street, City, ST"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className={`${fieldClass} ${verified ? 'pr-20' : ''}`}
        />
        {verified && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-700">
            Verified
          </span>
        )}
      </span>
      {open && predictions.length > 0 && (
        <ul
          role="listbox"
          className="z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {predictions.map((prediction, index) => {
            const main = prediction.structured_formatting?.main_text || prediction.description
            const secondary = prediction.structured_formatting?.secondary_text
            return (
              <li key={prediction.place_id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void choose(prediction)}
                  className={`block w-full px-3 py-2.5 text-left ${
                    index === activeIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{main}</span>
                  {secondary && <span className="block text-xs text-gray-500">{secondary}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {(looking || lookupNote) && (
        <span className={`mt-1.5 block text-xs ${lookupNote ? 'text-amber-800' : 'text-gray-500'}`}>
          {looking ? 'Checking addresses...' : lookupNote}
        </span>
      )}
    </Field>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-800">
        {label}
        {required && <span className="text-orange-600">*</span>}
      </span>
      <span className="relative block">
        {children}
      </span>
      {hint && <span className="mt-1.5 block text-xs leading-4 text-gray-500">{hint}</span>}
    </label>
  )
}

function formatPhoneDraft(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  const hasCountry = digits.length > 10 || (digits.length === 11 && digits.startsWith('1'))
  const local = hasCountry && digits.startsWith('1') ? digits.slice(1) : digits.slice(0, 10)
  const prefix = hasCountry && digits.startsWith('1') ? '+1 ' : ''
  if (local.length <= 3) return prefix + local
  if (local.length <= 6) return `${prefix}(${local.slice(0, 3)}) ${local.slice(3)}`
  return `${prefix}(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 10)}`
}

function iconClass() {
  return 'pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400'
}

function UserIcon() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM6 21v-1a5 5 0 015-5h2a5 5 0 015 5v1" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h2.3a1 1 0 01.9.6l1.2 2.8a1 1 0 01-.2 1.1L8 8.7a12 12 0 006.3 6.3l1.2-1.2a1 1 0 011.1-.2l2.8 1.2a1 1 0 01.6.9V19a2 2 0 01-2 2h-1C9.7 21 3 14.3 3 6V5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className={iconClass()} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16v12H4V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7l8 6 8-6" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="pointer-events-none absolute left-3.5 top-3.5 h-[18px] w-[18px] text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" strokeWidth={1.8} />
    </svg>
  )
}

function UserPlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="3" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 8v6M16 11h6" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4 11.5-11.5z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
