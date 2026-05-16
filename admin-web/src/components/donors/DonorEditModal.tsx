'use client'

interface DonorEditModalProps {
  form: { name: string; email: string; address: string; phone: string }
  onChange: (form: DonorEditModalProps['form']) => void
  onSave: () => void
  onClose: () => void
  isSaving?: boolean
  title?: string
}

export default function DonorEditModal({
  form,
  onChange,
  onSave,
  onClose,
  isSaving,
  title = 'Edit donor',
}: DonorEditModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200/80"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-edit-title"
      >
        <h3 id="donor-edit-title" className="text-lg font-semibold text-gray-900 mb-5">
          {title}
        </h3>
        <div className="space-y-4">
          <Field label="Name" value={form.name} onChange={(v) => onChange({ ...form, name: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => onChange({ ...form, phone: v })} type="tel" />
          <Field label="Email" value={form.email} onChange={(v) => onChange({ ...form, email: v })} type="email" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mailing address</label>
            <textarea
              value={form.address}
              onChange={(e) => onChange({ ...form, address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/25 outline-none resize-none"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/25 outline-none"
      />
    </div>
  )
}
