import { useState, useRef } from 'react'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const GOAL_CATEGORIES = [
  { value: 'Purchase',       label: 'Purchase',        physical: true  },
  { value: 'Electronics',    label: 'Electronics',     physical: true  },
  { value: 'Furniture',      label: 'Furniture',       physical: true  },
  { value: 'Vehicle',        label: 'Vehicle',         physical: true  },
  { value: 'Appliance',      label: 'Appliance',       physical: true  },
  { value: 'Trip',           label: 'Trip / Travel',   physical: false },
  { value: 'Experience',     label: 'Experience',      physical: false },
  { value: 'Education',      label: 'Education',       physical: false },
  { value: 'Emergency Fund', label: 'Emergency Fund',  physical: false },
  { value: 'Savings',        label: 'Savings',         physical: false },
  { value: 'Other',          label: 'Other',           physical: false },
]

export const PHYSICAL_GOAL_CATEGORIES = new Set(
  GOAL_CATEGORIES.filter(c => c.physical).map(c => c.value)
)

export { GOAL_CATEGORIES }

export default function GoalForm({ onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Purchase')
  const [targetAmount, setTargetAmount] = useState('')
  const [savedAmount, setSavedAmount] = useState('0')
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageDataUrl(ev.target.result)
      setImagePreview(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !targetAmount || submitting) return
    setSubmitting(true)
    try {
      const id = genId()
      if (imageDataUrl) {
        await fetch(`/api/images/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: imageDataUrl }),
        })
      }
      onSubmit({
        id,
        name: name.trim(),
        description: description.trim(),
        category,
        targetAmount: parseFloat(targetAmount),
        savedAmount: parseFloat(savedAmount) || 0,
        hasImage: !!imageDataUrl,
      })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add new goal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md overflow-y-auto rounded-2xl bg-[#1e293b] shadow-2xl" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-bold text-white">New Financial Goal</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Image upload — set once, cannot change later */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Goal Image <span className="normal-case text-slate-500">(optional · any size · set once)</span>
            </label>
            <div
              className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-white/5 transition-colors hover:border-blue-500/50 hover:bg-white/10"
              style={{ minHeight: imagePreview ? 0 : '90px' }}
              onClick={() => !imagePreview && fileRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-36 w-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center gap-1 p-4 text-slate-500">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Click to upload (no size limit)</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Goal Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gaming Laptop, Bike..."
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Category <span className="text-red-400">*</span>
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50">
              <optgroup label="Physical Items (can be added to Owned Items)">
                {GOAL_CATEGORIES.filter(c => c.physical).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Non-Physical">
                {GOAL_CATEGORIES.filter(c => !c.physical).map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
            </select>
            {PHYSICAL_GOAL_CATEGORIES.has(category)
              ? <p className="mt-1 text-[11px] text-teal-400">Physical item — can be logged to Owned Items when complete</p>
              : <p className="mt-1 text-[11px] text-slate-500">Non-physical — won&apos;t appear in Owned Items</p>
            }
          </div>

          {/* Target amount */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target Amount (PKR) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="e.g. 150000"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Already saved */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Already Saved (PKR)
            </label>
            <input
              type="number"
              min="0"
              value={savedAmount}
              onChange={(e) => setSavedAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why do you want this?"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !targetAmount || submitting}
              className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
