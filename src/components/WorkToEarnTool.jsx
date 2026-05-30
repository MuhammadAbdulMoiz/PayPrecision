import { useState } from 'react'

function fmtPKR(v) {
  return (v || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function WorkToEarnTool({ dailyWage = 0 }) {
  const [amount, setAmount] = useState('')

  if (dailyWage <= 0) return null

  const days  = amount ? Number(amount) / dailyWage : null
  const hours = days ? days * 8 : null

  const intensity = days
    ? days < 1   ? { label: 'Less than a day',  color: 'text-emerald-400' }
    : days < 3   ? { label: 'A few days',        color: 'text-blue-400'    }
    : days < 7   ? { label: 'About a week',       color: 'text-amber-400'   }
    : days < 22  ? { label: 'Multiple weeks',     color: 'text-orange-400'  }
                 : { label: 'More than a month',  color: 'text-red-400'     }
    : null

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
          <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Work-to-Earn</h3>
          <p className="text-[11px] text-slate-500">How many days of work does this cost?</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">PKR</span>
          <input
            type="number"
            min="0"
            placeholder="Enter amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-400/40 placeholder-slate-600"
          />
        </div>
        {days !== null && (
          <div className="text-right shrink-0">
            <p className={`text-lg font-extrabold tabular-nums ${intensity.color}`}>
              {days < 0.1 ? '< 0.1' : days.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-slate-400">days</span>
            </p>
          </div>
        )}
      </div>

      {days !== null && (
        <div className="mt-3 rounded-xl bg-white/5 p-3 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Your daily wage</span>
            <span className="font-semibold text-slate-200">PKR {fmtPKR(dailyWage)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Work hours</span>
            <span className="font-semibold text-slate-200">~{hours.toFixed(1)} hours</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Verdict</span>
            <span className={`font-bold ${intensity.color}`}>{intensity.label}</span>
          </div>
        </div>
      )}
    </div>
  )
}
