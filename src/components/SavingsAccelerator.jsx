import { useState } from 'react'

function fmtPKR(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return Math.round(v / 1_000) + 'K'
  return Math.round(v).toLocaleString()
}

function monthsLabel(months) {
  if (!isFinite(months)) return '—'
  if (months <= 0) return 'Reached'
  return months > 12
    ? `${Math.floor(months / 12)}y ${months % 12}m`
    : `${months}m`
}

const BOOSTS = [0.05, 0.10, 0.15]

export default function SavingsAccelerator({ goals = [], finalSalary = 0 }) {
  const [open, setOpen] = useState(false)

  const activeGoals = goals.filter(g => (g.savedAmount || 0) < (g.targetAmount || 1))
  if (activeGoals.length === 0 || finalSalary <= 0) return null

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Savings Accelerator</h3>
            <p className="text-[11px] text-slate-500">See how saving more reaches goals faster</p>
          </div>
        </div>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
          {activeGoals.map(g => {
            const rate = g.savingsRate || 0.10
            const remaining = Math.max(g.targetAmount - g.savedAmount, 0)
            const baseMonthly = finalSalary * rate
            const baseMonths = baseMonthly > 0 ? Math.ceil(remaining / baseMonthly) : Infinity

            return (
              <div key={g.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-200 truncate">{g.name}</p>
                  <span className="text-[11px] text-slate-500">{Math.round(rate * 100)}% now · {monthsLabel(baseMonths)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BOOSTS.map(boost => {
                    const newRate = rate + boost
                    const newMonthly = finalSalary * newRate
                    const newMonths = newMonthly > 0 ? Math.ceil(remaining / newMonthly) : Infinity
                    const saved = isFinite(baseMonths) && isFinite(newMonths) ? baseMonths - newMonths : 0
                    return (
                      <div key={boost} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">+{Math.round(boost * 100)}%</p>
                        <p className="text-sm font-bold text-emerald-400">{monthsLabel(newMonths)}</p>
                        {saved > 0 && <p className="text-[9px] text-emerald-500/80">{saved}m sooner</p>}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  At {Math.round(rate * 100)}% = PKR {fmtPKR(baseMonthly)}/mo. Each +5% adds PKR {fmtPKR(finalSalary * 0.05)}/mo.
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
