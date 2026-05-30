function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

export default function GoalsDashboard({ goals, finalSalary }) {
  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0)
  const totalSaved  = goals.reduce((s, g) => s + (g.savedAmount  || 0), 0)
  const totalRemaining = Math.max(totalTarget - totalSaved, 0)
  const overallPct  = totalTarget > 0 ? Math.min(totalSaved / totalTarget, 1) : 0

  const activeGoals    = goals.filter(g => (g.savedAmount || 0) < (g.targetAmount || 1))
  const completedGoals = goals.filter(g => (g.savedAmount || 0) >= (g.targetAmount || 1))

  // Only sum active goals — completed goals no longer need saving toward
  const totalSavingsRate  = activeGoals.reduce((s, g) => s + (g.savingsRate || 0.10), 0)
  const totalMonthlySaved = (finalSalary || 0) * totalSavingsRate

  // SVG donut
  const R = 38, cx = 50, cy = 50
  const C = 2 * Math.PI * R
  const dashOffset = C * (1 - overallPct)

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300 light:text-slate-600">
        Goals Overview
      </h3>

      <div className="flex flex-col gap-5 sm:flex-row">
        {/* Donut */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#goalGrad)" strokeWidth="9"
              strokeDasharray={C} strokeDashoffset={dashOffset} strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="16" fontWeight="700" fill="white">
              {Math.round(overallPct * 100)}%
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle"
              fontSize="9" fill="rgba(148,163,184,1)">
              overall
            </text>
          </svg>
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {goals.length} goal{goals.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats + per-goal bars */}
        <div className="flex-1 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Target', value: `PKR ${fmtPKR(totalTarget)}`, color: 'text-slate-200' },
              { label: 'Total Saved',  value: `PKR ${fmtPKR(totalSaved)}`,  color: 'text-emerald-400' },
              { label: 'Remaining',    value: `PKR ${fmtPKR(totalRemaining)}`, color: 'text-blue-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 p-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={`mt-1 text-xs font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Per-goal mini bars — active only */}
          <div className="space-y-2">
            {activeGoals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0
              return (
                <div key={g.id}>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="truncate text-[11px] font-medium text-slate-300" style={{ maxWidth: '60%' }}>
                      {g.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {Math.round((g.savingsRate || 0.10) * 100)}% rate · {Math.round(pct)}% done
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {completedGoals.length > 0 && (
              <p className="text-[10px] text-slate-600">
                + {completedGoals.length} completed goal{completedGoals.length !== 1 ? 's' : ''} not included in rate
              </p>
            )}
          </div>

          {/* Combined savings rate summary — active goals only */}
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Total savings rate
              </p>
              <span className="text-xs font-bold text-blue-400">
                {(totalSavingsRate * 100).toFixed(0)}% of salary
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(totalSavingsRate * 100, 100)}%` }} />
            </div>
            {activeGoals.length > 0 ? (
              <p className="mt-1.5 text-[10px] text-slate-500">
                {activeGoals.map((g) => `${g.name} ${Math.round((g.savingsRate || 0.10) * 100)}%`).join(' + ')}
                {' = '}
                <span className="text-blue-400">~PKR {fmtPKR(totalMonthlySaved)} / month</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-emerald-500">All goals completed!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
