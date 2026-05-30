import { useState, useMemo } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useBudgets } from '../hooks/useBudgets'

const CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Subscriptions', 'Trips',
  'Treats', 'Utilities', 'Healthcare', 'Education', 'Shopping', 'Other',
]

const CAT_META = {
  Housing:       { bar: '#3b82f6', icon: '🏠', light: 'rgba(59,130,246,0.15)'  },
  Food:          { bar: '#10b981', icon: '🍔', light: 'rgba(16,185,129,0.15)'  },
  Transport:     { bar: '#f59e0b', icon: '🚗', light: 'rgba(245,158,11,0.15)'  },
  Subscriptions: { bar: '#7c3aed', icon: '📱', light: 'rgba(124,58,237,0.15)'  },
  Trips:         { bar: '#0ea5e9', icon: '✈️',  light: 'rgba(14,165,233,0.15)'  },
  Treats:        { bar: '#ec4899', icon: '🍰', light: 'rgba(236,72,153,0.15)'  },
  Utilities:     { bar: '#06b6d4', icon: '💡', light: 'rgba(6,182,212,0.15)'   },
  Healthcare:    { bar: '#ef4444', icon: '🏥', light: 'rgba(239,68,68,0.15)'   },
  Education:     { bar: '#6366f1', icon: '📚', light: 'rgba(99,102,241,0.15)'  },
  Shopping:      { bar: '#f97316', icon: '🛍️', light: 'rgba(249,115,22,0.15)'  },
  Other:         { bar: '#64748b', icon: '📦', light: 'rgba(100,116,139,0.15)' },
}
const m = (cat) => CAT_META[cat] || CAT_META.Other

function fmtPKR(v) {
  return (v || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function downloadCSV(expenses, month) {
  const headers = ['Name', 'Category', 'Amount (PKR)', 'Month', 'Note', 'Recurring']
  const rows = expenses.filter((e) => e.month === month)
    .map((e) => [e.name, e.category, e.amount, e.month, e.note || '', e.recurring ? 'Yes' : 'No'])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `expenses-${month}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// Circular progress ring
function RingProgress({ pct, color, size = 52, stroke = 5 }) {
  const r = (size - stroke * 2) / 2
  const C = 2 * Math.PI * r
  const offset = C * (1 - Math.min(pct / 100, 1))
  const over = pct > 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={over ? '#ef4444' : color} strokeWidth={stroke}
        strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="700" fill={over ? '#f87171' : 'white'}>
        {Math.min(Math.round(pct), 999)}%
      </text>
    </svg>
  )
}

// Budget card grid
function BudgetCards({ byCategory, getBudget, setBudget, filterMonth }) {
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')

  const startEdit = (cat) => { setEditing(cat); setEditVal(String(getBudget(cat) || '')) }
  const saveEdit  = (cat) => { if (editVal !== '') setBudget(cat, Number(editVal)); setEditing(null) }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((cat) => {
        const row    = byCategory.find((x) => x.cat === cat) || { cat, spent: 0, budget: getBudget(cat) }
        const spent  = row.spent
        const budget = getBudget(cat)
        const pct    = budget > 0 ? (spent / budget) * 100 : 0
        const over   = budget > 0 && spent > budget
        const hasData = spent > 0 || budget > 0

        return (
          <div key={cat}
            className={`relative overflow-hidden rounded-2xl border transition-all ${
              hasData ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.015]'
            }`}
            style={{ borderColor: hasData ? m(cat).bar + '30' : undefined }}
          >
            {/* Coloured top stripe */}
            <div className="h-1 w-full" style={{ backgroundColor: m(cat).bar + '60' }} />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg leading-none">{m(cat).icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{cat}</p>
                    <p className="text-[11px] text-slate-500">
                      {budget > 0 ? `Budget: PKR ${fmtPKR(budget)}` : 'No budget set'}
                    </p>
                  </div>
                </div>
                {budget > 0 && <RingProgress pct={pct} color={m(cat).bar} />}
              </div>

              {/* Progress bar */}
              {budget > 0 && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: over ? '#ef4444' : m(cat).bar }} />
                </div>
              )}

              {/* Spend vs budget */}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Spent</p>
                  <p className={`text-base font-extrabold tabular-nums ${over ? 'text-red-400' : 'text-slate-100'}`}>
                    PKR {fmtPKR(spent)}
                  </p>
                </div>
                {budget > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Remaining</p>
                    <p className={`text-sm font-bold tabular-nums ${over ? 'text-red-400' : 'text-emerald-400'}`}>
                      {over ? '-' : ''}PKR {fmtPKR(Math.abs(budget - spent))}
                    </p>
                  </div>
                )}
              </div>

              {/* Edit budget inline */}
              {editing === cat ? (
                <div className="mt-3 flex gap-1.5">
                  <input type="number" min="0" placeholder="Budget (PKR)"
                    value={editVal} onChange={(e) => setEditVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditing(null) }}
                    autoFocus
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500/40" />
                  <button onClick={() => saveEdit(cat)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors"
                    style={{ backgroundColor: m(cat).bar }}>
                    Save
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5">
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit(cat)}
                  className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-white/20 hover:text-slate-300">
                  {budget > 0 ? 'Edit budget' : '+ Set budget'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donut chart (unchanged, just polished)
function SpendingDonut({ data, total }) {
  if (!data.length || total === 0) return null
  const R = 40, cx = 50, cy = 50, C = 2 * Math.PI * R
  let cum = 0
  const slices = data.map((d) => {
    const pct = d.spent / total
    const offset = C * (1 - pct)
    const rotation = -90 + cum * 360
    cum += pct
    return { ...d, pct, offset, rotation }
  })
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="shrink-0" style={{ width: 100, height: 100 }}>
        {slices.map((s) => (
          <circle key={s.cat} cx={cx} cy={cy} r={R} fill="none"
            stroke={m(s.cat).bar} strokeWidth="12"
            strokeDasharray={C} strokeDashoffset={s.offset}
            transform={`rotate(${s.rotation} ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        ))}
        <circle cx={cx} cy={cy} r={R - 6} fill="rgba(15,23,42,0.85)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
          {data.length}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.8)">cats</text>
      </svg>
      <div className="flex-1 space-y-1">
        {slices.map((s) => (
          <div key={s.cat} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: m(s.cat).bar }} />
              <span className="text-[11px] text-slate-300 truncate">{m(s.cat).icon} {s.cat}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold text-slate-400">{(s.pct * 100).toFixed(0)}%</span>
              <span className="text-[10px] text-slate-500">PKR {fmtPKR(s.spent)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const EMPTY_FORM = { name: '', category: 'Food', amount: '', note: '', recurring: false }

export default function ExpenseTracker({ finalSalary = 0, loans = [] }) {
  const { expenses, addExpense, updateExpense, deleteExpense, populateRecurring } = useExpenses()
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const { getBudget, setBudget } = useBudgets(filterMonth)
  const [view, setView] = useState('log')   // 'log' | 'budget' | 'chart'
  const [chartMode, setChartMode] = useState('donut')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [populating, setPopulating] = useState(false)

  // Active loans that are in PKR and not yet fully paid — represent cash you received but haven't returned
  const activeLoanCash = loans
    .filter(l => l.status !== 'paid' && (l.currency === 'PKR' || !l.currency))
    .reduce((s, l) => s + (l.remaining || 0), 0)

  // Total available = salary + cash from active loans still in your possession
  const totalAvailable = finalSalary + activeLoanCash

  const filtered = expenses.filter((e) => e.month === filterMonth)
  const total    = filtered.reduce((s, e) => s + (e.amount || 0), 0)
  const salaryRatio = totalAvailable > 0 ? (total / totalAvailable) * 100 : 0

  const byCategory = useMemo(() =>
    CATEGORIES.map((cat) => ({
      cat,
      spent:  filtered.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
      budget: getBudget(cat),
    })),
  [filtered, getBudget])

  const withSpend = byCategory.filter((x) => x.spent > 0)

  const handleAdd = (ev) => {
    ev.preventDefault()
    if (!form.name.trim() || !form.amount) return
    addExpense({ ...form, month: filterMonth })
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const handlePopulate = async () => {
    setPopulating(true)
    const n = await populateRecurring(filterMonth)
    setPopulating(false)
    if (n === 0) alert('No new recurring expenses to add for this month.')
  }

  const healthColor = salaryRatio < 50 ? '#10b981' : salaryRatio < 80 ? '#f59e0b' : '#ef4444'
  const healthLabel = salaryRatio < 50 ? 'Healthy' : salaryRatio < 80 ? 'Caution' : 'Over budget'

  // Safe-to-Spend: remaining cash / remaining days in month
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(daysInMonth - today.getDate() + 1, 1)
  const remaining = Math.max(totalAvailable - total, 0)
  const safePerDay = remaining / remainingDays

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20">
            <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
            </svg>
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Monthly Expenses</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 outline-none focus:border-blue-500/40" />
          <button onClick={handlePopulate} disabled={populating}
            className="rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
            title="Auto-fill recurring">
            {populating ? '...' : '↻'}
          </button>
          <button onClick={() => downloadCSV(expenses, filterMonth)}
            className="rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10">
            CSV
          </button>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* ── View tabs ── */}
      <div className="flex border-b border-white/10">
        {[
          { id: 'log',    label: 'Transactions' },
          { id: 'budget', label: 'Budget Manager' },
          { id: 'chart',  label: 'Charts' },
        ].map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              view === v.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── Cash availability bar ── */}
        {totalAvailable > 0 && total > 0 && (
          <div className="mb-5 rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400">
                Expenses vs Available Cash
              </span>
              <span className="text-[11px] font-bold" style={{ color: healthColor }}>
                {healthLabel} · {salaryRatio.toFixed(1)}%
              </span>
            </div>
            {/* Stacked bar: salary portion + loan portion */}
            <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full transition-all duration-500"
                style={{ width: `${Math.min(salaryRatio, 100)}%`, backgroundColor: healthColor }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
              <span>Spent: PKR {fmtPKR(total)}</span>
              <span style={{ color: totalAvailable - total >= 0 ? '#10b981' : '#ef4444' }}>
                {totalAvailable - total >= 0 ? 'Left: ' : 'Over by: '}PKR {fmtPKR(Math.abs(totalAvailable - total))}
              </span>
            </div>
            {activeLoanCash > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
                Salary PKR {fmtPKR(finalSalary)}
                <span className="text-red-400 ml-1">+ PKR {fmtPKR(activeLoanCash)} from active loans</span>
                <span className="ml-1">= PKR {fmtPKR(totalAvailable)} available</span>
              </div>
            )}
          </div>
        )}

        {/* ── Safe-to-Spend ── */}
        {totalAvailable > 0 && (
          <div className={`mb-5 rounded-xl p-3 flex items-center justify-between ${
            safePerDay > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Safe to spend today</p>
              <p className={`text-lg font-extrabold tabular-nums ${safePerDay > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                PKR {fmtPKR(Math.abs(safePerDay))}<span className="text-sm font-normal text-slate-400">/day</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                PKR {fmtPKR(remaining)} left · {remainingDays} day{remainingDays !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Month progress</p>
              <p className="text-sm font-bold text-slate-300">{today.getDate()}/{daysInMonth}</p>
              <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-slate-400 transition-all"
                  style={{ width: `${(today.getDate() / daysInMonth) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Add expense form ── */}
        {showForm && (
          <form onSubmit={handleAdd} className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">New Expense</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input type="text" placeholder="Name" value={form.name} required
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/40 sm:col-span-1" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-lg border border-white/10 bg-[#1e293b] px-2.5 py-2 text-xs text-slate-300 outline-none focus:border-blue-500/40">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="number" min="1" placeholder="Amount (PKR)" value={form.amount} required
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/40" />
              <input type="text" placeholder="Note (optional)" value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/40 sm:col-span-4" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.recurring}
                  onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
                  className="h-3.5 w-3.5 accent-amber-400" />
                <span className="text-[11px] text-amber-300">↻ Recurring monthly</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                  Add Expense
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── TRANSACTIONS view ── */}
        {view === 'log' && (
          <>
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500">No expenses for {filterMonth}.</p>
                <button onClick={() => setShowForm(true)}
                  className="mt-3 text-xs font-semibold text-blue-400 hover:text-blue-300">
                  + Add your first expense
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                      <th className="pb-2 pl-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Note</th>
                      <th className="pb-2 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => {
                      const isEditing = editingId === e.id
                      return isEditing ? (
                        <tr key={e.id} className="border-b border-white/5 last:border-0 bg-white/[0.03]">
                          <td className="py-1.5 pr-2">
                            <input autoFocus value={editForm.name}
                              onChange={ev => setEditForm(f => ({ ...f, name: ev.target.value }))}
                              className="w-full rounded border border-blue-400/40 bg-white/5 px-2 py-1 text-sm text-white outline-none" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <select value={editForm.category}
                              onChange={ev => setEditForm(f => ({ ...f, category: ev.target.value }))}
                              className="w-full rounded border border-white/10 bg-slate-800 px-1.5 py-1 text-xs text-white outline-none">
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <input type="number" min="0" value={editForm.amount}
                              onChange={ev => setEditForm(f => ({ ...f, amount: ev.target.value }))}
                              className="w-full rounded border border-blue-400/40 bg-white/5 px-2 py-1 text-sm text-right text-white outline-none" />
                          </td>
                          <td className="py-1.5 pl-3 pr-2">
                            <input value={editForm.note}
                              onChange={ev => setEditForm(f => ({ ...f, note: ev.target.value }))}
                              placeholder="Note"
                              className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 outline-none" />
                          </td>
                          <td className="py-1.5">
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                await updateExpense(e.id, { name: editForm.name, category: editForm.category, amount: Number(editForm.amount), note: editForm.note })
                                setEditingId(null)
                              }} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-500">
                                Save
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="rounded px-2 py-1 text-[10px] text-slate-500 hover:text-white">✕</button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={e.id} className="group border-b border-white/5 last:border-0">
                          <td className="py-2.5 font-medium text-slate-200">
                            {e.name}
                            {e.recurring && <span className="ml-1.5 rounded px-1 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300">↻</span>}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: m(e.category).light, color: m(e.category).bar }}>
                              {m(e.category).icon} {e.category}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-slate-200">PKR {fmtPKR(e.amount)}</td>
                          <td className="py-2.5 pl-3 text-xs text-slate-500">{e.note}</td>
                          <td className="py-2.5">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingId(e.id); setEditForm({ name: e.name, category: e.category, amount: e.amount, note: e.note || '' }) }}
                                aria-label="Edit"
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-blue-500/20 hover:text-blue-400">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                              <button onClick={() => deleteExpense(e.id)} aria-label="Delete"
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-red-500/20 hover:text-red-400">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total · {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-red-400">PKR {fmtPKR(total)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── BUDGET MANAGER view ── */}
        {view === 'budget' && (
          <div>
            <p className="mb-4 text-[12px] text-slate-500">
              Set a monthly budget for each category. Click any card to edit. Rings fill as you spend.
            </p>
            <BudgetCards
              byCategory={byCategory}
              getBudget={getBudget}
              setBudget={setBudget}
              filterMonth={filterMonth}
            />
          </div>
        )}

        {/* ── CHARTS view ── */}
        {view === 'chart' && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
                {[{ id: 'donut', label: '◉ Donut' }, { id: 'bars', label: '▐ Bars' }].map((opt) => (
                  <button key={opt.id} onClick={() => setChartMode(opt.id)}
                    className={`rounded px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      chartMode === opt.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {withSpend.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No spending data for {filterMonth}.</p>
            ) : chartMode === 'donut' ? (
              <SpendingDonut data={withSpend} total={total} />
            ) : (
              /* Polished horizontal bar chart */
              <div className="space-y-3">
                {withSpend.sort((a, b) => b.spent - a.spent).map((d) => {
                  const budget = getBudget(d.cat)
                  const maxVal = Math.max(...withSpend.map((x) => Math.max(x.spent, getBudget(x.cat) || 0)))
                  const spentW = maxVal > 0 ? (d.spent / maxVal) * 100 : 0
                  const budgetW = budget > 0 && maxVal > 0 ? (budget / maxVal) * 100 : 0
                  const over = budget > 0 && d.spent > budget
                  return (
                    <div key={d.cat}>
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>{m(d.cat).icon}</span>
                          <span className="text-[12px] font-medium text-slate-300">{d.cat}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={over ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                            PKR {fmtPKR(d.spent)}
                          </span>
                          {budget > 0 && (
                            <span className="text-slate-600">/ PKR {fmtPKR(budget)}</span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                        {/* Budget marker */}
                        {budgetW > 0 && (
                          <div className="absolute top-0 h-full w-0.5 bg-white/30 z-10" style={{ left: `${budgetW}%` }} />
                        )}
                        {/* Spent bar */}
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${spentW}%`,
                            backgroundColor: over ? '#ef4444' : m(d.cat).bar,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
