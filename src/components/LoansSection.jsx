import { useState } from 'react'
import LoanCard from './LoanCard'

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function AddLoanModal({ goals, onClose, onSubmit }) {
  const [form, setForm] = useState({
    lenderName: '',
    amount: '',
    currency: 'PKR',
    loanDate: new Date().toISOString().slice(0, 10),
    purpose: '',
    goalId: '',
    monthlyInstallment: '',
    notes: '',
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      amount: Number(form.amount) || 0,
      monthlyInstallment: Number(form.monthlyInstallment) || 0,
      goalId: form.goalId || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add Loan</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lender / From</label>
              <input type="text" placeholder="e.g. Brother, Bank, Friend" required value={form.lenderName}
                onChange={e => set('lenderName', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount</label>
              <input type="number" min="1" placeholder="0" required value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50">
                <option value="PKR">PKR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Loan Date</label>
              <input type="date" required value={form.loanDate}
                onChange={e => set('loanDate', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monthly Installment</label>
              <input type="number" min="0" placeholder="0 (optional)" value={form.monthlyInstallment}
                onChange={e => set('monthlyInstallment', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purpose</label>
              <input type="text" placeholder="What was it for?" value={form.purpose}
                onChange={e => set('purpose', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50" />
            </div>
            {goals.length > 0 && (
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Link to Goal (optional)</label>
                <select value={form.goalId} onChange={e => set('goalId', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50">
                  <option value="">— No goal —</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
              <textarea rows={2} placeholder="Any extra details..." value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/50 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 rounded-xl bg-red-700 py-2 text-sm font-semibold text-white hover:bg-red-600">
              Add Loan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PeopleLedger({ loans = [] }) {
  // Group loans by lender name
  const byPerson = {}
  loans.forEach(l => {
    const key = (l.lenderName || 'Unknown').trim()
    if (!byPerson[key]) byPerson[key] = { name: key, borrowed: 0, repaid: 0, outstanding: 0, count: 0, active: 0 }
    byPerson[key].borrowed    += l.amount
    byPerson[key].repaid      += (l.totalPaid || 0)
    byPerson[key].outstanding += (l.status !== 'paid' ? (l.remaining || 0) : 0)
    byPerson[key].count       += 1
    if (l.status !== 'paid') byPerson[key].active += 1
  })

  const people = Object.values(byPerson).sort((a, b) => b.outstanding - a.outstanding)

  if (people.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No people to show.</p>
  }

  return (
    <div className="space-y-2.5">
      {people.map(p => {
        const pct = p.borrowed > 0 ? Math.round((p.repaid / p.borrowed) * 100) : 0
        const settled = p.outstanding <= 0
        return (
          <div key={p.name} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-bold text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {p.count} loan{p.count !== 1 ? 's' : ''}{p.active > 0 ? ` · ${p.active} active` : ''}
                  </p>
                </div>
              </div>
              {settled ? (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400">Settled ✓</span>
              ) : (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">You owe</p>
                  <p className="text-sm font-bold text-red-400 tabular-nums">PKR {fmtPKR(p.outstanding)}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Borrowed PKR {fmtPKR(p.borrowed)}</span>
              <span className="text-emerald-400">Repaid PKR {fmtPKR(p.repaid)} ({pct}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LoansSection({ goals = [], loans = [], onAdd, onUpdate, onDelete, onUploadImage }) {
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('cards') // 'cards' | 'ledger'
  const [showAll, setShowAll] = useState(false)

  const handleAdd = async (data) => {
    await onAdd(data)
    setShowForm(false)
  }

  const activeLoans = loans.filter(l => l.status !== 'paid')
  const paidLoans = loans.filter(l => l.status === 'paid')
  const totalOwed = activeLoans.reduce((s, l) => s + l.amount, 0)

  if (loans.length === 0) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white light:text-slate-800">Loan Tracker</h3>
            <p className="text-xs text-slate-500">Track money you owe and repayment progress</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Loan
          </button>
        </div>
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-300">No loans tracked</p>
          <p className="text-xs text-slate-500">Track money borrowed and mark payments as you go.</p>
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600">
            Add your first loan
          </button>
        </div>
        {showForm && <AddLoanModal goals={goals} onClose={() => setShowForm(false)} onSubmit={handleAdd} />}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white light:text-slate-800">Loan Tracker</h3>
          {activeLoans.length > 0 && (
            <p className="text-xs text-red-400">PKR {fmtPKR(totalOwed)} outstanding across {activeLoans.length} loan{activeLoans.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-white/5 p-0.5">
            <button onClick={() => setView('cards')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${view === 'cards' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Cards
            </button>
            <button onClick={() => setView('ledger')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${view === 'ledger' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              People
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Loan
          </button>
        </div>
      </div>

      {/* Overview card */}
      {(() => {
        const totalBorrowed  = loans.reduce((s, l) => s + l.amount, 0)
        const totalRepaid    = loans.reduce((s, l) => s + (l.totalPaid || 0), 0)
        const totalOutstanding = activeLoans.reduce((s, l) => s + (l.remaining || 0), 0)
        const pctRepaid = totalBorrowed > 0 ? Math.round((totalRepaid / totalBorrowed) * 100) : 0
        const paidLoans = loans.filter(l => l.status === 'paid')
        return (
          <div className="glass rounded-2xl p-4 mb-2">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Borrowed</p>
                  <p className="text-sm font-bold text-white tabular-nums">PKR {fmtPKR(totalBorrowed)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Repaid</p>
                  <p className="text-sm font-bold text-emerald-400 tabular-nums">PKR {fmtPKR(totalRepaid)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Outstanding</p>
                  <p className="text-sm font-bold text-red-400 tabular-nums">PKR {fmtPKR(totalOutstanding)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{pctRepaid}% repaid overall</span>
                <span>{activeLoans.length} active · {paidLoans.length} paid off</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700"
                  style={{ width: `${pctRepaid}%` }} />
              </div>
            </div>
          </div>
        )
      })()}

      {view === 'cards' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {(showAll ? loans : loans.slice(0, 3)).map(loan => (
              <LoanCard
                key={loan.id}
                loan={loan}
                goals={goals}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onUploadImage={onUploadImage}
              />
            ))}
          </div>
          {loans.length > 3 && (
            <button onClick={() => setShowAll(v => !v)}
              className="mt-3 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-400 transition-colors hover:border-white/20 hover:text-white">
              {showAll ? '▲ Show less' : `▼ Show ${loans.length - 3} more loan${loans.length - 3 !== 1 ? 's' : ''}`}
            </button>
          )}
        </>
      ) : (
        <PeopleLedger loans={loans} />
      )}

      {showForm && <AddLoanModal goals={goals} onClose={() => setShowForm(false)} onSubmit={handleAdd} />}
    </div>
  )
}
