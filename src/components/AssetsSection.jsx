import { useState } from 'react'
import AssetCard from './AssetCard'

const CATEGORIES = ['Electronics', 'Furniture', 'Vehicle', 'Appliances', 'Tools', 'Other']

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function AddAssetModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Electronics',
    purchasePrice: '',
    currentValue: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      purchasePrice: Number(form.purchasePrice) || 0,
      currentValue: form.currentValue !== '' ? Number(form.currentValue) : Number(form.purchasePrice) || 0,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add Owned Item</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Item Name</label>
              <input type="text" placeholder="e.g. Samsung 27&quot; Monitor" required value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purchase Price (PKR)</label>
              <input type="number" min="0" placeholder="0" required value={form.purchasePrice}
                onChange={e => set('purchasePrice', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Current Value (PKR)</label>
              <input type="number" min="0" placeholder="Same as price" value={form.currentValue}
                onChange={e => set('currentValue', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purchase Date</label>
              <input type="date" required value={form.purchaseDate}
                onChange={e => set('purchaseDate', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes (optional)</label>
              <input type="text" placeholder="e.g. 144Hz, 1440p, bought used" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-600">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const INITIAL_VISIBLE = 3

export default function AssetsSection({ assets = [], onAdd, onUpdate, onDelete, onUploadImage }) {
  const [showForm, setShowForm] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const handleAdd = async (data) => {
    await onAdd(data)
    setShowForm(false)
  }

  const totalValue = assets.reduce((s, a) => s + (a.currentValue || 0), 0)

  if (assets.length === 0) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Owned Items</h3>
            <p className="text-xs text-slate-500">Track things you own — gear, furniture, devices</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Item
          </button>
        </div>
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20">
            <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-300">No items tracked yet</p>
          <p className="text-xs text-slate-500">Add your monitor, chair, phone — anything you own. These count toward your net worth.</p>
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600">
            Add your first item
          </button>
        </div>
        {showForm && <AddAssetModal onClose={() => setShowForm(false)} onSubmit={handleAdd} />}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Owned Items</h3>
          <p className="text-xs text-teal-400">PKR {fmtPKR(totalValue)} total value across {assets.length} item{assets.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add Item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
        {(showAll ? assets : assets.slice(0, INITIAL_VISIBLE)).map(asset => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onUploadImage={onUploadImage}
          />
        ))}
      </div>

      {assets.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-400 transition-colors hover:border-white/20 hover:text-white"
        >
          {showAll
            ? '▲ Show less'
            : `▼ Show ${assets.length - INITIAL_VISIBLE} more item${assets.length - INITIAL_VISIBLE !== 1 ? 's' : ''}`}
        </button>
      )}

      {showForm && <AddAssetModal onClose={() => setShowForm(false)} onSubmit={handleAdd} />}
    </div>
  )
}
