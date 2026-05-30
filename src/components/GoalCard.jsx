import { useState, useRef } from 'react'
import { useDeposits } from '../hooks/useDeposits'
import { PHYSICAL_GOAL_CATEGORIES, GOAL_CATEGORIES } from './GoalForm'

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtMonth(m) {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

const RATE_OPTIONS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]
const CATEGORIES = ['Electronics', 'Furniture', 'Vehicle', 'Appliances', 'Tools', 'Other']

export default function GoalCard({ goal, onDelete, onUpdate, finalSalary, linkedLoans = [], onAddAsset, assets = [] }) {
  const imageSrc = goal.hasImage ? `/api/images/${goal.id}` : null
  const fileRef = useRef()
  const [showDeposits, setShowDeposits] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [convertCategory, setConvertCategory] = useState('Other')
  const [depAmount, setDepAmount] = useState('')
  const [depMonth, setDepMonth] = useState(new Date().toISOString().slice(0, 7))
  const [depNote, setDepNote] = useState('')
  const [localSaved, setLocalSaved] = useState(goal.savedAmount)
  const [localRate, setLocalRate] = useState(goal.savingsRate ?? 0.10)
  const [editForm, setEditForm] = useState({ name: goal.name, description: goal.description || '', targetAmount: goal.targetAmount, category: goal.category ?? 'Other' })

  const { deposits, addDeposit, deleteDeposit } = useDeposits(showDeposits ? goal.id : null)

  const isConverted = assets.some(a => a.goalId === goal.id)
  const isPhysical = PHYSICAL_GOAL_CATEGORIES.has(goal.category ?? 'Other')
  const isCompleted = localSaved >= goal.targetAmount && goal.targetAmount > 0
  const saved = localSaved
  const progress = goal.targetAmount > 0 ? Math.min((saved / goal.targetAmount) * 100, 100) : 0
  const remaining = Math.max(goal.targetAmount - saved, 0)
  const monthlyContribution = (finalSalary || 0) * localRate

  let timeLabel = 'Goal reached!'
  if (remaining > 0) {
    if (monthlyContribution <= 0) {
      timeLabel = 'Set salary to estimate'
    } else {
      const months = Math.ceil(remaining / monthlyContribution)
      timeLabel = months > 12
        ? `~${Math.ceil(months / 12)} yr${Math.ceil(months / 12) !== 1 ? 's' : ''}`
        : `~${months} mo${months !== 1 ? 's' : ''}`
    }
  }

  const handleRateChange = (rate) => {
    setLocalRate(rate)
    onUpdate(goal.id, { savingsRate: rate })
  }

  const handleAddDeposit = async (e) => {
    e.preventDefault()
    if (!depAmount) return
    const newSaved = await addDeposit(depAmount, depMonth, depNote)
    if (newSaved !== null) {
      setLocalSaved(newSaved)
      onUpdate(goal.id, { savedAmount: newSaved })
    }
    setDepAmount('')
    setDepNote('')
  }

  const handleDeleteDeposit = async (id) => {
    const newSaved = await deleteDeposit(id)
    if (newSaved !== null) {
      setLocalSaved(newSaved)
      onUpdate(goal.id, { savedAmount: newSaved })
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    await onUpdate(goal.id, {
      name: editForm.name,
      description: editForm.description,
      targetAmount: Number(editForm.targetAmount),
      category: editForm.category,
    })
    setShowEdit(false)
  }

  const handleConvertToAsset = async (e) => {
    e.preventDefault()
    if (!onAddAsset) return
    await onAddAsset({
      name: goal.name,
      category: convertCategory,
      purchasePrice: localSaved,
      currentValue: localSaved,
      purchaseDate: new Date().toISOString().slice(0, 10),
      goalId: goal.id,
      notes: `From goal: ${goal.name}`,
    })
    setShowConvert(false)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      await fetch(`/api/images/${goal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: ev.target.result }),
      })
      await onUpdate(goal.id, { hasImage: true })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg h-full" style={{ minHeight: '260px' }}>
      {/* Background */}
      {imageSrc ? (
        <img src={imageSrc} alt={goal.name}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.55)' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Top-right actions */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => fileRef.current?.click()} aria-label="Upload image"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-blue-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button onClick={() => setShowEdit(true)} aria-label="Edit goal"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-blue-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(goal.id)} aria-label="Delete goal"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-4" style={{ minHeight: '260px' }}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {isCompleted && (
            <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Completed
            </span>
          )}
          {linkedLoans.length > 0 && (
            <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              {linkedLoans.length} loan{linkedLoans.length !== 1 ? 's' : ''}
            </span>
          )}
          {isConverted && (
            <span className="rounded-full bg-teal-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-400">
              In Items
            </span>
          )}
          {goal.category && goal.category !== 'Other' && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">
              {goal.category}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-white drop-shadow">{goal.name}</h3>
        {goal.description && (
          <p className="mt-0.5 text-xs text-white/60 line-clamp-1">{goal.description}</p>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Stats row */}
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Saved</p>
            <p className="text-sm font-bold text-white">PKR {fmtPKR(saved)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Target</p>
            <p className="text-sm font-bold text-white">PKR {fmtPKR(goal.targetAmount)}</p>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-emerald-400">{Math.round(progress)}% complete</span>
          <span className="text-[11px] text-blue-300">{timeLabel}</span>
        </div>

        {/* Savings rate picker — hidden once goal is complete */}
        {!isCompleted && (
          <div className="mt-2">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/40">
              My savings rate for this goal
            </p>
            <div className="flex gap-1">
              {RATE_OPTIONS.map((r) => (
                <button key={r} onClick={() => handleRateChange(r)}
                  className={`flex-1 rounded py-1 text-[10px] font-bold transition-colors ${
                    localRate === r
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}>
                  {Math.round(r * 100)}%
                </button>
              ))}
            </div>
            {finalSalary > 0 && (
              <p className="mt-1 text-[10px] text-white/40">
                = PKR {fmtPKR(monthlyContribution)} / month
              </p>
            )}
          </div>
        )}

        <button onClick={() => setShowDeposits((v) => !v)}
          className="mt-2 w-full rounded-lg bg-white/10 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white">
          Deposit Log
        </button>

        {/* Convert button — only for physical categories, when 100% complete and not already converted */}
        {isCompleted && isPhysical && onAddAsset && !isConverted && (
          <button onClick={() => setShowConvert(true)}
            className="mt-1.5 w-full rounded-lg bg-teal-700/60 py-1 text-[11px] font-semibold text-teal-300 transition-colors hover:bg-teal-700 hover:text-white">
            Log as Owned Item
          </button>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Edit Goal</p>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Description</label>
                <input type="text" placeholder="Optional" value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Amount (PKR)</label>
                <input type="number" min="1" required value={editForm.targetAmount}
                  onChange={e => setEditForm(f => ({ ...f, targetAmount: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Category</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none">
                  <optgroup label="Physical">
                    {GOAL_CATEGORIES.filter(c => c.physical).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Non-Physical">
                    {GOAL_CATEGORIES.filter(c => !c.physical).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to physical item modal */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowConvert(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-white">Log as Physical Item</p>
              <button onClick={() => setShowConvert(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <p className="mb-1 text-[11px] text-slate-400">
              Only use this if you actually bought a physical thing with this goal. Trips, experiences, and services should not be added here.
            </p>
            <p className="mb-3 text-[11px] text-white/60">
              Adding: <strong className="text-white">{goal.name}</strong> · PKR {fmtPKR(localSaved)}
            </p>
            <form onSubmit={handleConvertToAsset} className="space-y-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</label>
                <select value={convertCategory} onChange={e => setConvertCategory(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowConvert(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit"
                  className="flex-1 rounded-xl bg-teal-700 py-2 text-sm font-semibold text-white hover:bg-teal-600">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit modal */}
      {showDeposits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeposits(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-white">Deposit Log · {goal.name}</p>
              <button onClick={() => setShowDeposits(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <form onSubmit={handleAddDeposit} className="mb-3 flex gap-1.5 flex-wrap">
              <input type="number" min="1" placeholder="Amount (PKR)" value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)} required autoFocus
                className="w-28 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/50" />
              <input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)}
                className="flex-1 min-w-[110px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/50" />
              <input type="text" placeholder="Note (optional)" value={depNote}
                onChange={(e) => setDepNote(e.target.value)}
                className="flex-1 min-w-[120px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/50" />
              <button type="submit"
                className="rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500">
                +Add
              </button>
            </form>
            {deposits.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-slate-500">No deposits yet.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400">+PKR {fmtPKR(d.amount)}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{fmtMonth(d.month)}</span>
                      {d.note && <span className="ml-2 text-[10px] text-slate-500">{d.note}</span>}
                    </div>
                    <button onClick={() => handleDeleteDeposit(d.id)}
                      className="text-slate-600 hover:text-red-400 text-[10px] ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
