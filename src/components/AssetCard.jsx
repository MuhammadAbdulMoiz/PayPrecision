import { useState, useRef } from 'react'

const CATEGORY_COLORS = {
  Electronics: 'text-blue-400 bg-blue-500/20',
  Furniture:   'text-amber-400 bg-amber-500/20',
  Vehicle:     'text-purple-400 bg-purple-500/20',
  Appliances:  'text-orange-400 bg-orange-500/20',
  Tools:       'text-slate-300 bg-slate-500/20',
  Other:       'text-slate-400 bg-slate-600/20',
}

const CATEGORIES = ['Electronics', 'Furniture', 'Vehicle', 'Appliances', 'Tools', 'Other']

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AssetCard({ asset, onDelete, onUpdate, onUploadImage }) {
  const imageSrc = asset.hasImage ? `/api/images/${asset.id}` : null
  const [editingValue, setEditingValue] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [editForm, setEditForm] = useState({
    name: asset.name,
    category: asset.category,
    purchasePrice: asset.purchasePrice,
    purchaseDate: asset.purchaseDate,
    notes: asset.notes || '',
  })
  const fileRef = useRef()

  const catColor = CATEGORY_COLORS[asset.category] || CATEGORY_COLORS.Other
  const diff = asset.currentValue - asset.purchasePrice
  const diffPct = asset.purchasePrice > 0 ? (diff / asset.purchasePrice) * 100 : 0
  const appreciated = diff >= 0

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) await onUploadImage(asset.id, file)
  }

  const handleValueSave = (e) => {
    e.preventDefault()
    if (!newValue) return
    onUpdate(asset.id, { currentValue: Number(newValue) })
    setEditingValue(false)
    setNewValue('')
  }

  const handleEditSave = (e) => {
    e.preventDefault()
    onUpdate(asset.id, {
      name: editForm.name,
      category: editForm.category,
      purchasePrice: Number(editForm.purchasePrice),
      purchaseDate: editForm.purchaseDate,
      notes: editForm.notes,
    })
    setShowEdit(false)
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg h-full" style={{ minHeight: '240px' }}>
      {/* Background */}
      {imageSrc ? (
        <img src={imageSrc} alt={asset.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.45)' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-green-950 via-green-900/30 to-transparent" />

      {/* Top-right actions */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => fileRef.current?.click()} aria-label="Upload image"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-blue-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button onClick={() => setShowEdit(true)} aria-label="Edit item"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-teal-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(asset.id)} aria-label="Delete asset"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-4" style={{ minHeight: '240px' }}>
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${catColor}`}>
            {asset.category}
          </span>
          {diff !== 0 && (
            <span className={`text-[10px] font-semibold ${appreciated ? 'text-emerald-400' : 'text-red-400'}`}>
              {appreciated ? '+' : ''}{Math.round(diffPct)}%
            </span>
          )}
          {asset.goalId && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">From Goal</span>
          )}
        </div>

        <h3 className="text-base font-bold text-white drop-shadow">{asset.name}</h3>
        {asset.notes && (
          <p className="mt-0.5 text-xs text-white/50 line-clamp-1">{asset.notes}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Paid</p>
            <p className="text-sm font-bold text-white">PKR {fmtPKR(asset.purchasePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Worth Now</p>
            <p className={`text-sm font-bold ${appreciated ? 'text-emerald-400' : 'text-red-400'}`}>
              PKR {fmtPKR(asset.currentValue)}
            </p>
          </div>
        </div>

        {asset.purchaseDate && (
          <p className="mt-1 text-[10px] text-white/30">Bought {fmtDate(asset.purchaseDate)}</p>
        )}

        <button onClick={() => { setEditingValue(v => !v); setNewValue(asset.currentValue) }}
          className="mt-2 w-full rounded-lg bg-white/10 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white">
          Update Value
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Edit Item</p>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</label>
                  <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purchase Price (PKR)</label>
                  <input type="number" min="0" required value={editForm.purchasePrice}
                    onChange={e => setEditForm(f => ({ ...f, purchasePrice: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purchase Date</label>
                <input type="date" required value={editForm.purchaseDate}
                  onChange={e => setEditForm(f => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
                <input type="text" value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit"
                  className="flex-1 rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update current value modal */}
      {editingValue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingValue(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-white">Update Value · {asset.name}</p>
              <button onClick={() => setEditingValue(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              Original: PKR {fmtPKR(asset.purchasePrice)} — what is it worth today?
            </p>
            <form onSubmit={handleValueSave} className="flex gap-2">
              <input type="number" min="0" placeholder="Current value (PKR)" value={newValue}
                onChange={(e) => setNewValue(e.target.value)} required autoFocus
                className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-teal-400/50" />
              <button type="submit"
                className="rounded bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600">
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
