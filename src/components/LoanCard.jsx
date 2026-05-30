import { useState, useRef } from 'react'
import { useLoanPayments } from '../hooks/useLoans'

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  return v.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function LoanCard({ loan, goals = [], onDelete, onUpdate, onUploadImage }) {
  const imageSrc = loan.hasImage ? `/api/images/${loan.id}` : null
  const [showPayments, setShowPayments] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [payNote, setPayNote] = useState('')
  const [editForm, setEditForm] = useState({
    lenderName: loan.lenderName,
    amount: loan.amount,
    currency: loan.currency,
    loanDate: loan.loanDate,
    purpose: loan.purpose || '',
    monthlyInstallment: loan.monthlyInstallment || '',
    notes: loan.notes || '',
  })
  const fileRef = useRef()

  const { payments, addPayment, deletePayment } = useLoanPayments(showPayments ? loan.id : null)

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(loan.amount - totalPaid, 0)
  const progress = loan.amount > 0 ? Math.min((totalPaid / loan.amount) * 100, 100) : 0
  const isPaid = loan.status === 'paid' || remaining <= 0

  const linkedGoal = goals.find(g => g.id === loan.goalId)

  const handleAddPayment = async (e) => {
    e.preventDefault()
    if (!payAmount) return
    await addPayment(loan.id, Number(payAmount), payDate, payNote)
    setPayAmount('')
    setPayNote('')
    if (remaining - Number(payAmount) <= 0) {
      onUpdate(loan.id, { status: 'paid' })
    }
  }

  const handleDeletePayment = async (payId) => {
    await deletePayment(loan.id, payId)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) await onUploadImage(loan.id, file)
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg h-full" style={{ minHeight: '280px' }}>
      {/* Background */}
      {imageSrc ? (
        <img src={imageSrc} alt={loan.lenderName}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.45)' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-red-900/30 to-transparent" />

      {/* Top-right actions */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => fileRef.current?.click()} aria-label="Upload image"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-blue-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button onClick={() => setShowEdit(true)} aria-label="Edit loan"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-blue-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onDelete(loan.id)} aria-label="Delete loan"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-4" style={{ minHeight: '280px' }}>
        {/* Status badge */}
        <div className="mb-1 flex items-center gap-2">
          {isPaid ? (
            <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Paid Off</span>
          ) : (
            <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Active</span>
          )}
          {linkedGoal && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 truncate max-w-[120px]">
              → {linkedGoal.name}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-white drop-shadow">{loan.lenderName}</h3>
        {loan.purpose && (
          <p className="mt-0.5 text-xs text-white/60 line-clamp-1">{loan.purpose}</p>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400 transition-all duration-700"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Stats row */}
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Total</p>
            <p className="text-sm font-bold text-white">{loan.currency} {fmtPKR(loan.amount)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Paid</p>
            <p className="text-sm font-bold text-emerald-400">{loan.currency} {fmtPKR(totalPaid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Remaining</p>
            <p className="text-sm font-bold text-red-400">{loan.currency} {fmtPKR(remaining)}</p>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-orange-400">{Math.round(progress)}% repaid</span>
          {loan.monthlyInstallment > 0 && (
            <span className="text-[11px] text-slate-400">{loan.currency} {fmtPKR(loan.monthlyInstallment)}/mo</span>
          )}
        </div>

        {loan.loanDate && (
          <p className="mt-0.5 text-[10px] text-white/30">Since {fmtDate(loan.loanDate)}</p>
        )}

        {/* Payment log toggle */}
        <button onClick={() => setShowPayments((v) => !v)}
          className="mt-2 w-full rounded-lg bg-white/10 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white">
          Payment Log
        </button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-white">Edit Loan</p>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault()
              onUpdate(loan.id, {
                lenderName: editForm.lenderName,
                amount: Number(editForm.amount),
                currency: editForm.currency,
                loanDate: editForm.loanDate,
                purpose: editForm.purpose,
                monthlyInstallment: Number(editForm.monthlyInstallment) || 0,
                notes: editForm.notes,
              })
              setShowEdit(false)
            }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lender</label>
                  <input type="text" required value={editForm.lenderName}
                    onChange={e => setEditForm(f => ({ ...f, lenderName: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Amount</label>
                  <input type="number" min="0" required value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Currency</label>
                  <select value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none">
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Loan Date</label>
                  <input type="date" required value={editForm.loanDate}
                    onChange={e => setEditForm(f => ({ ...f, loanDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monthly Installment</label>
                  <input type="number" min="0" placeholder="0" value={editForm.monthlyInstallment}
                    onChange={e => setEditForm(f => ({ ...f, monthlyInstallment: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Purpose</label>
                  <input type="text" value={editForm.purpose}
                    onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
                  <input type="text" value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit"
                  className="flex-1 rounded-xl bg-red-700 py-2 text-sm font-semibold text-white hover:bg-red-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal — fixed, centered */}
      {showPayments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayments(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-white">Payments · {loan.lenderName}</p>
              <button onClick={() => setShowPayments(false)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
            </div>
            <form onSubmit={handleAddPayment} className="mb-3 flex gap-1.5 flex-wrap">
              <input type="number" min="1" placeholder="Amount" value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)} required autoFocus
                className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-red-400/50" />
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                className="flex-1 min-w-[120px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-red-400/50" />
              <input type="text" placeholder="Note" value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="flex-1 min-w-[120px] rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-white outline-none focus:border-red-400/50" />
              <button type="submit"
                className="rounded bg-red-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600">
                +Pay
              </button>
            </form>
            {payments.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-slate-500">No payments yet.</p>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                    <div>
                      <span className="text-[11px] font-semibold text-red-400">−{loan.currency} {fmtPKR(p.amount)}</span>
                      <span className="ml-2 text-[10px] text-slate-400">{fmtDate(p.paymentDate)}</span>
                      {p.note && <span className="ml-2 text-[10px] text-slate-500">{p.note}</span>}
                    </div>
                    <button onClick={() => handleDeletePayment(p.id)}
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
