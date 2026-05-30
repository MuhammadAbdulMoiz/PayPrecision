import { useState, useMemo } from 'react'

function fmtPKR(v) {
  return (v || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function AffordabilityTool({ finalSalary = 0, dailyWage = 0, goals = [], monthlyExpenses = 0, totalAvailable = 0 }) {
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)

  const cost = Number(amount) || 0

  const analysis = useMemo(() => {
    if (!cost || !finalSalary) return null

    const daysOfWork = dailyWage > 0 ? cost / dailyWage : null
    const pctOfSalary = (cost / finalSalary) * 100
    const budgetRemaining = Math.max(totalAvailable - monthlyExpenses, 0)
    const canAffordFromRemaining = cost <= budgetRemaining

    const activeGoals = goals.filter(g => (g.savedAmount || 0) < (g.targetAmount || 1))
    const goalImpacts = activeGoals.map(g => {
      const monthly = finalSalary * (g.savingsRate || 0.10)
      const remaining = Math.max(g.targetAmount - g.savedAmount, 0)
      const currentMonths = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity
      const newMonths = monthly > 0 ? Math.ceil((remaining + cost) / monthly) : Infinity
      const delay = isFinite(newMonths) && isFinite(currentMonths) ? newMonths - currentMonths : null
      return { name: g.name, delay, currentMonths, newMonths }
    }).filter(g => g.delay !== null && g.delay > 0)

    return { daysOfWork, pctOfSalary, budgetRemaining, canAffordFromRemaining, goalImpacts }
  }, [cost, finalSalary, dailyWage, goals, monthlyExpenses, totalAvailable])

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Can I Afford This?</h3>
            <p className="text-[11px] text-slate-500">Purchase impact on budget & goals</p>
          </div>
        </div>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">PKR</span>
              <input
                type="number" min="0" placeholder="How much does it cost?"
                value={amount} onChange={e => setAmount(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-blue-400/40 placeholder-slate-600"
              />
            </div>
            {amount && <button onClick={() => setAmount('')}
              className="text-slate-500 hover:text-white text-sm px-1">✕</button>}
          </div>

          {analysis && (
            <div className="space-y-3">
              {/* Quick verdict */}
              <div className={`rounded-xl p-3 border ${
                analysis.canAffordFromRemaining
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <p className={`text-sm font-bold ${analysis.canAffordFromRemaining ? 'text-emerald-400' : 'text-red-400'}`}>
                  {analysis.canAffordFromRemaining ? '✓ You can afford it' : '✗ This exceeds your remaining budget'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Budget remaining: PKR {fmtPKR(analysis.budgetRemaining)} · Cost: PKR {fmtPKR(cost)}
                </p>
              </div>

              {/* Impact grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/5 p-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Days of Work</p>
                  <p className="mt-1 text-sm font-bold text-amber-400">
                    {analysis.daysOfWork ? analysis.daysOfWork.toFixed(1) : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">% of Salary</p>
                  <p className="mt-1 text-sm font-bold text-blue-400">{analysis.pctOfSalary.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">After Purchase</p>
                  <p className={`mt-1 text-sm font-bold ${analysis.budgetRemaining - cost >= 0 ? 'text-slate-200' : 'text-red-400'}`}>
                    PKR {fmtPKR(Math.abs(analysis.budgetRemaining - cost))}
                    {analysis.budgetRemaining - cost < 0 && <span className="text-[9px] text-red-400 block">over</span>}
                  </p>
                </div>
              </div>

              {/* Goal impact */}
              {analysis.goalImpacts.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Goal Delays</p>
                  <div className="space-y-1.5">
                    {analysis.goalImpacts.map(g => (
                      <div key={g.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span className="text-xs font-medium text-slate-300 truncate">{g.name}</span>
                        <span className="text-[11px] font-semibold text-orange-400 shrink-0 ml-2">
                          +{g.delay} mo{g.delay !== 1 ? 's' : ''} later
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysis.goalImpacts.length === 0 && goals.length > 0 && (
                <p className="text-[11px] text-slate-500">No goal delays — your savings rates are unaffected.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
