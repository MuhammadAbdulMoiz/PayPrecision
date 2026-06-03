import { useState, useEffect, useMemo } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useGoals } from '../hooks/useGoals'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useLoans, useLoanPayments } from '../hooks/useLoans'
import { useAssets } from '../hooks/useAssets'
import { fmtShortDate } from '../hooks/usePayCycle'
import { useCashLedger } from '../hooks/useCashLedger'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '0'
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function monthLabel(iso) {
  const [y, m] = iso.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function lastNMonths(n) {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

// ─── SVG multi-line chart ────────────────────────────────────────────────────

const LINE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#ef4444','#a3e635','#e879f9','#22d3ee']

function MultiLineChart({ series, months }) {
  if (!months.length || !series.length) return null

  const W = 560, H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 56 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const allVals = series.flatMap((s) => s.values)
  const max = Math.max(...allVals, 1)
  const min = 0

  const xPos = (i) => PAD.left + (months.length > 1 ? (i / (months.length - 1)) * cW : cW / 2)
  const yPos = (v) => PAD.top + cH - ((v - min) / (max - min)) * cH

  const yTicks = [0, 0.5, 1].map((t) => ({ v: min + t * (max - min), y: PAD.top + cH - t * cH }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="rgba(148,163,184,0.7)">
            {t.v >= 1000 ? `${(t.v / 1000).toFixed(0)}k` : Math.round(t.v)}
          </text>
        </g>
      ))}

      {/* Lines + dots */}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => ({ x: xPos(i), y: yPos(v) }))
        const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
        return (
          <g key={s.label}>
            <path d={line} fill="none" stroke={LINE_COLORS[si % LINE_COLORS.length]} strokeWidth="1.8" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={LINE_COLORS[si % LINE_COLORS.length]} stroke="#0f172a" strokeWidth="1.5" />
            ))}
          </g>
        )
      })}

      {/* X labels */}
      {months.map((m, i) => (
        <text key={m} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.6)">
          {monthLabel(m)}
        </text>
      ))}
    </svg>
  )
}

// ─── Salary growth bar chart ──────────────────────────────────────────────────

function fmtK(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return Math.round(v / 1_000) + 'K'
  return Math.round(v)
}

function NetWorthTimeline({ entries }) {
  const [hovered, setHovered] = useState(null)
  const sorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12),
  [entries])

  // Build cumulative: each month's total earnings minus estimated spending (30% assumption if no data)
  // If netWorth snapshot saved use that, otherwise cumulative sum of earnings
  const points = useMemo(() => {
    let cumulative = 0
    return sorted.map(e => {
      const earned = e.results?.totalEarnings ?? e.results?.finalSalary ?? 0
      cumulative += earned
      return {
        month:     new Date(e.date).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        earnings:  earned,
        cumulative,
      }
    })
  }, [sorted])

  const maxVal = Math.max(...points.map(p => p.cumulative), 1)
  const W = 560, H = 180
  const PAD = { top: 20, right: 16, bottom: 36, left: 52 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const pts = points.map((p, i) => ({
    x: PAD.left + (i / (points.length - 1)) * cW,
    y: PAD.top + cH - (p.cumulative / maxVal) * cH,
    ...p,
  }))

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${pts[0].x},${PAD.top + cH} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length-1].x},${PAD.top + cH} Z`

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="nwtGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={PAD.top + cH - t * cH} x2={W - PAD.right} y2={PAD.top + cH - t * cH}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={t === 0 ? '0' : '4 3'} />
            <text x={PAD.left - 4} y={PAD.top + cH - t * cH + 3.5} textAnchor="end" fontSize="9" fill="rgba(100,116,139,0.9)">
              {fmtK(t * maxVal)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#nwtGrad)" />
        <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5}
              fill="#10b981" stroke="#0f172a" strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r .1s' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
            <text x={p.x} y={H - 10} textAnchor="middle" fontSize="9" fill="rgba(100,116,139,0.85)">{p.month}</text>
          </g>
        ))}
      </svg>
      {hovered !== null && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs backdrop-blur-sm"
          style={{ left: `${Math.min(Math.max((pts[hovered].x / W) * 100, 10), 80)}%`, transform: 'translateX(-50%)' }}>
          <p className="mb-1 font-semibold text-slate-200">{pts[hovered].month}</p>
          <p className="text-emerald-400">This month: PKR {fmtK(pts[hovered].earnings)}</p>
          <p className="text-blue-400">Cumulative: PKR {fmtK(pts[hovered].cumulative)}</p>
        </div>
      )}
      <p className="mt-1 text-center text-[10px] text-slate-600">Cumulative earnings trajectory — save entries regularly for accurate tracking</p>
    </div>
  )
}

function SalaryGrowthChart({ entries }) {
  const [hovered, setHovered] = useState(null)

  const sorted = useMemo(() =>
    [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12),
  [entries])

  if (sorted.length < 2) return (
    <p className="py-8 text-center text-sm text-slate-500">Need at least 2 history entries to show growth.</p>
  )

  const bars = sorted.map(e => ({
    base:  Math.round(e.results?.monthlyPKR || 0),
    ot:    Math.round(e.results?.extraPay   || 0),
    month: new Date(e.date).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
  }))

  const hasOT      = bars.some(b => b.ot > 0)
  const maxVal     = Math.max(...bars.map(b => b.base + b.ot), 1)
  const firstBase  = bars[0].base
  const lastBase   = bars[bars.length - 1].base
  const baseGrowth = firstBase > 0 ? ((lastBase - firstBase) / firstBase * 100) : 0
  const avgOT      = bars.reduce((s, b) => s + b.ot, 0) / bars.length

  const W = 560, H = 200
  const PAD = { top: 20, right: 12, bottom: 36, left: 48 }
  const cW  = W - PAD.left - PAD.right
  const cH  = H - PAD.top  - PAD.bottom
  const slot = cW / bars.length
  const barW = Math.max(Math.min(slot * 0.6, 40), 10)

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Base growth</p>
          <p className={`text-sm font-bold ${baseGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {baseGrowth >= 0 ? '+' : ''}{baseGrowth.toFixed(1)}%
            <span className="ml-1.5 text-[11px] font-normal text-slate-500">PKR {fmtK(firstBase)} → {fmtK(lastBase)}</span>
          </p>
          <p className="text-[10px] text-slate-600">Changes only on increment</p>
        </div>
        {hasOT && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Avg overtime</p>
            <p className="text-sm font-bold text-amber-400">PKR {fmtK(avgOT)}<span className="ml-1 text-[11px] font-normal text-slate-500">/mo avg</span></p>
            <p className="text-[10px] text-slate-600">Varies with extra days</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mb-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)' }} />
          Base Salary
        </span>
        {hasOT && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block h-2.5 w-3.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#fcd34d,#f59e0b)' }} />
            Overtime
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          <defs>
            <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Grid lines + Y labels */}
          {yTicks.map((t, i) => {
            const y = PAD.top + cH - t * cH
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray={t === 0 ? '0' : '4 3'} />
                <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="rgba(100,116,139,0.9)">
                  {fmtK(t * maxVal)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {bars.map((b, i) => {
            const x      = PAD.left + i * slot + (slot - barW) / 2
            const baseH  = (b.base / maxVal) * cH
            const otH    = (b.ot   / maxVal) * cH
            const isHov  = hovered === i
            const baseY  = PAD.top + cH - baseH
            const otY    = baseY - otH
            const r      = 4

            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>

                {/* Hover bg */}
                <rect x={x - 4} y={PAD.top} width={barW + 8} height={cH}
                  fill={isHov ? 'rgba(255,255,255,0.04)' : 'transparent'} rx="4" />

                {/* Base bar — rounded bottom if no OT, flat top if OT */}
                {baseH > 0 && (
                  <rect x={x} y={baseY} width={barW} height={baseH}
                    fill="url(#baseGrad)"
                    rx={hasOT && b.ot > 0 ? 0 : r}
                    opacity={isHov ? 1 : 0.85}
                    style={{ transition: 'opacity .15s' }}
                  />
                )}
                {/* OT bar on top — rounded top only */}
                {b.ot > 0 && (
                  <rect x={x} y={otY} width={barW} height={otH}
                    fill="url(#otGrad)"
                    rx={r}
                    opacity={isHov ? 1 : 0.85}
                    style={{ transition: 'opacity .15s' }}
                  />
                )}

                {/* X label */}
                <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="9" fill="rgba(100,116,139,0.85)">
                  {b.month}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered !== null && (() => {
          const b    = bars[hovered]
          const slot = cW / bars.length
          const xPct = ((PAD.left + hovered * slot + slot / 2) / W) * 100
          return (
            <div className="pointer-events-none absolute top-0 z-10 -translate-y-1 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs backdrop-blur-sm"
              style={{ left: `${Math.min(Math.max(xPct, 10), 80)}%`, transform: 'translateX(-50%)' }}>
              <p className="mb-1.5 font-semibold text-slate-200">{b.month}</p>
              <p className="text-blue-400">Base &nbsp;PKR {b.base.toLocaleString()}</p>
              {b.ot > 0 && <p className="text-amber-400">OT &nbsp;&nbsp;&nbsp;PKR {b.ot.toLocaleString()}</p>}
              {b.ot > 0 && (
                <p className="mt-1.5 border-t border-white/10 pt-1.5 font-bold text-white">
                  Total PKR {(b.base + b.ot).toLocaleString()}
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Loan debt row (synced from DB) ──────────────────────────────────────────

function LoanDebtRow({ loan, onPay }) {
  const [mode, setMode] = useState(false)
  const [payAmt, setPayAmt] = useState('')

  const remaining = loan.remaining ?? 0
  const paid      = loan.totalPaid ?? 0
  const progress  = loan.amount > 0 ? Math.min((paid / loan.amount) * 100, 100) : 0
  const isPaid    = remaining <= 0

  const handlePay = async (e) => {
    e.preventDefault()
    const p = Math.min(Number(payAmt), remaining)
    if (p > 0) {
      await onPay(loan.id, p)
      setPayAmt('')
      setMode(false)
    }
  }

  return (
    <div className={`rounded-lg px-3 py-2.5 ${isPaid ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isPaid
            ? <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Paid</span>
            : <span className="shrink-0 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400">Loan</span>
          }
          <span className={`text-sm truncate ${isPaid ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{loan.lenderName}</span>
          {loan.purpose && <span className="text-[10px] text-slate-600 truncate hidden sm:block">· {loan.purpose}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-sm font-semibold tabular-nums ${isPaid ? 'text-slate-600' : 'text-red-400'}`}>
            {isPaid ? `${loan.currency} 0` : `-${loan.currency} ${fmtPKR(remaining)}`}
          </span>
          {!isPaid && (
            <button onClick={() => setMode((v) => !v)}
              className="rounded bg-emerald-700/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-600/60">
              Pay
            </button>
          )}
        </div>
      </div>

      {loan.amount > 0 && paid > 0 && (
        <div className="mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-slate-600">
            <span>Paid {loan.currency} {fmtPKR(paid)}</span>
            <span>{Math.round(progress)}% done</span>
          </div>
        </div>
      )}

      {mode && (
        <form onSubmit={handlePay} className="mt-2 flex gap-1.5">
          <input type="number" min="1" max={remaining} placeholder={`Max ${fmtPKR(remaining)}`}
            value={payAmt} onChange={(e) => setPayAmt(e.target.value)} autoFocus required
            className="flex-1 rounded border border-emerald-500/30 bg-emerald-900/20 px-2 py-1 text-xs text-white outline-none focus:border-emerald-400/60" />
          <button type="submit" className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600">Confirm</button>
          <button type="button" onClick={() => setMode(false)} className="rounded px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
        </form>
      )}
    </div>
  )
}

// ─── Net worth tracker ────────────────────────────────────────────────────────

const DEBT_KEY = 'pp-debts'

function DebtRow({ debt, onPay, onEdit, onRemove }) {
  const [mode, setMode] = useState(null) // null | 'pay' | 'edit'
  const [payAmt, setPayAmt] = useState('')
  const [editName, setEditName] = useState(debt.name)
  const [editAmt, setEditAmt] = useState(String(debt.remaining ?? debt.amount))

  const remaining = debt.remaining ?? debt.amount
  const original  = debt.amount
  const paid      = original - remaining
  const progress  = original > 0 ? Math.min((paid / original) * 100, 100) : 0
  const isPaid    = remaining <= 0

  const handlePay = (e) => {
    e.preventDefault()
    const p = Math.min(Number(payAmt), remaining)
    if (p > 0) { onPay(debt.id, p); setPayAmt(''); setMode(null) }
  }

  const handleEdit = (e) => {
    e.preventDefault()
    onEdit(debt.id, editName.trim() || debt.name, Number(editAmt) || debt.amount)
    setMode(null)
  }

  return (
    <div className={`rounded-lg px-3 py-2.5 ${isPaid ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
      {/* Main row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {isPaid && (
            <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Paid</span>
          )}
          <span className={`text-sm truncate ${isPaid ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{debt.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-sm font-semibold tabular-nums ${isPaid ? 'text-slate-600' : 'text-red-400'}`}>
            {isPaid ? 'PKR 0' : `-PKR ${fmtPKR(remaining)}`}
          </span>
          {!isPaid && (
            <button onClick={() => setMode(mode === 'pay' ? null : 'pay')}
              className="rounded bg-emerald-700/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-600/60">
              Pay
            </button>
          )}
          <button onClick={() => setMode(mode === 'edit' ? null : 'edit')}
            className="text-slate-600 hover:text-slate-300 text-[10px] px-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button onClick={() => onRemove(debt.id)}
            className="text-slate-600 hover:text-red-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {original > 0 && paid > 0 && (
        <div className="mt-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-slate-600">
            <span>Paid PKR {fmtPKR(paid)}</span>
            <span>{Math.round(progress)}% done</span>
          </div>
        </div>
      )}

      {/* Pay form */}
      {mode === 'pay' && (
        <form onSubmit={handlePay} className="mt-2 flex gap-1.5">
          <input type="number" min="1" max={remaining} placeholder={`Max ${fmtPKR(remaining)}`}
            value={payAmt} onChange={(e) => setPayAmt(e.target.value)} autoFocus required
            className="flex-1 rounded border border-emerald-500/30 bg-emerald-900/20 px-2 py-1 text-xs text-white outline-none focus:border-emerald-400/60" />
          <button type="submit" className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600">Confirm</button>
          <button type="button" onClick={() => setMode(null)} className="rounded px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
        </form>
      )}

      {/* Edit form */}
      {mode === 'edit' && (
        <form onSubmit={handleEdit} className="mt-2 flex gap-1.5">
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name"
            className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-400/50" />
          <input type="number" min="1" value={editAmt} onChange={(e) => setEditAmt(e.target.value)} placeholder="Remaining"
            className="w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-400/50" />
          <button type="submit" className="rounded bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-600">Save</button>
          <button type="button" onClick={() => setMode(null)} className="rounded px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
        </form>
      )}
    </div>
  )
}

function NetWorthTracker({ goals, finalSalary, loans = [], onPayLoan, onAddLoan, assets = [] }) {
  const [debts, setDebts] = useLocalStorage(DEBT_KEY, [])
  const [dName, setDName] = useState('')
  const [dAmount, setDAmount] = useState('')
  const [showPaid, setShowPaid] = useState(false)

  const convertedGoalIds = new Set(assets.filter(a => a.goalId).map(a => a.goalId))
  const goalSavings = goals.reduce((s, g) => convertedGoalIds.has(g.id) ? s : s + (g.savedAmount || 0), 0)
  const physicalAssets = assets.reduce((s, a) => s + (a.currentValue || 0), 0)
  const totalAssets = goalSavings + physicalAssets
  const manualDebtTotal = debts.reduce((s, d) => s + ((d.remaining ?? d.amount) || 0), 0)
  const loanDebtTotal   = loans.reduce((s, l) => s + (l.remaining || 0), 0)
  const totalDebts  = manualDebtTotal + loanDebtTotal
  const netWorth    = totalAssets - totalDebts
  const positive    = netWorth >= 0

  const addDebt = async (e) => {
    e.preventDefault()
    if (!dName.trim() || !dAmount) return
    await onAddLoan({
      lenderName: dName.trim(),
      amount: Number(dAmount),
      currency: 'PKR',
      loanDate: new Date().toISOString().slice(0, 10),
      purpose: 'Manual liability',
      monthlyInstallment: 0,
      notes: '',
    })
    setDName(''); setDAmount('')
  }

  const removeDebt = (id) => setDebts((prev) => prev.filter((d) => d.id !== id))

  const payDebt = (id, payment) => {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== id) return d
      const remaining = Math.max((d.remaining ?? d.amount) - payment, 0)
      return { ...d, remaining }
    }))
  }

  const editDebt = (id, name, remaining) => {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== id) return d
      const newAmt = remaining > (d.amount || 0) ? remaining : d.amount
      return { ...d, name, amount: newAmt, remaining }
    }))
  }

  const activeDebts = debts.filter((d) => (d.remaining ?? d.amount) > 0)
  const paidDebts   = debts.filter((d) => (d.remaining ?? d.amount) <= 0)

  const maxBar = Math.max(totalAssets, totalDebts, 1)
  const assetsPct = (totalAssets / maxBar) * 100
  const debtsPct  = (totalDebts  / maxBar) * 100

  return (
    <div className="space-y-4">
      {/* Net worth headline */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Assets',  value: totalAssets, color: 'text-emerald-400' },
          { label: 'Total Debts',   value: totalDebts,  color: 'text-red-400' },
          { label: 'Net Worth',     value: netWorth,    color: positive ? 'text-blue-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
            <p className={`mt-1 text-sm font-bold tabular-nums ${s.color}`}>
              {s.value < 0 ? '-' : ''}PKR {fmtPKR(Math.abs(s.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Visual bars */}
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-emerald-400 font-medium">Assets (Savings + Items)</span>
            <span className="text-slate-400">PKR {fmtPKR(totalAssets)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${assetsPct}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-red-400 font-medium">Liabilities (Debts)</span>
            <span className="text-slate-400">PKR {fmtPKR(totalDebts)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${debtsPct}%` }} />
          </div>
        </div>
      </div>

      {/* Debts list */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Liabilities · {activeDebts.length + loans.filter(l => l.remaining > 0).length} active
        </p>

        {/* DB loans — synced from Loan Tracker */}
        {loans.length > 0 && (
          <div className="mb-2 space-y-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 mb-1">From Loan Tracker</p>
            {loans.map((loan) => (
              <LoanDebtRow key={loan.id} loan={loan} onPay={onPayLoan} />
            ))}
          </div>
        )}

        {/* Manual localStorage debts */}
        {(activeDebts.length > 0 || paidDebts.length > 0) && (
          <>
            {loans.length > 0 && <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 mb-1 mt-2">Manual Liabilities</p>}
            <div className="space-y-1.5">
              {activeDebts.map((d) => (
                <DebtRow key={d.id} debt={d} onPay={payDebt} onEdit={editDebt} onRemove={removeDebt} />
              ))}
              {paidDebts.length > 0 && (
                <button onClick={() => setShowPaid((v) => !v)}
                  className="mt-1 text-[11px] text-slate-600 hover:text-slate-400">
                  {showPaid ? '▾ Hide paid' : `▸ Show ${paidDebts.length} paid off`}
                </button>
              )}
              {showPaid && paidDebts.map((d) => (
                <DebtRow key={d.id} debt={d} onPay={payDebt} onEdit={editDebt} onRemove={removeDebt} />
              ))}
            </div>
          </>
        )}

        {loans.length === 0 && activeDebts.length === 0 && paidDebts.length === 0 && (
          <p className="text-[12px] text-slate-600 mb-2">No debts yet. Add via Loan Tracker or use the form below — it creates a real loan entry.</p>
        )}

        <div className="mt-3 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Add to Loan Tracker</p>
        </div>
        <form onSubmit={addDebt} className="flex gap-2">
          <input type="text" placeholder="Lender / name" value={dName}
            onChange={(e) => setDName(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/40" />
          <input type="number" min="1" placeholder="Amount (PKR)" value={dAmount}
            onChange={(e) => setDAmount(e.target.value)}
            className="w-32 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/40" />
          <button type="submit"
            className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
            Add
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Burn Rate (with optional asset sale) ─────────────────────────────────────

function survivalMeta(months) {
  if (months == null)  return { color: '#64748b', label: '—' }
  if (months < 3)  return { color: '#ef4444', label: 'Critical' }
  if (months < 6)  return { color: '#f59e0b', label: 'Low' }
  if (months < 12) return { color: '#f59e0b', label: 'Moderate' }
  return { color: '#10b981', label: 'Healthy' }
}

function BurnRateCard({ expenses, assets, months6, cashOnHand = 0 }) {
  const [selectedIds, setSelectedIds] = useLocalStorage('pp-burn-sell-assets', [])
  const [showAssets, setShowAssets] = useState(false)

  // Average burn over months that actually have spending data (not blindly /3)
  const avgBurn = useMemo(() => {
    const totals = months6
      .map((mo) => expenses.filter((e) => e.month === mo).reduce((a, e) => a + e.amount, 0))
      .filter((t) => t > 0)
    return totals.length ? totals.reduce((s, t) => s + t, 0) / totals.length : 0
  }, [expenses, months6])

  // Reserve = your real cash on hand (carryover + credited salary). Goal savings
  // are NOT counted; physical assets only count when you choose to sell them.
  const reserve = Math.max(cashOnHand, 0)
  const sellable = assets.filter((a) => (a.currentValue || 0) > 0)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedSellable = sellable.filter((a) => selectedSet.has(a.id))
  const selectedCount = selectedSellable.length
  const sellValue = selectedSellable.reduce((s, a) => s + (a.currentValue || 0), 0)
  const sellableTotal = sellable.reduce((s, a) => s + (a.currentValue || 0), 0)

  const baseMonths = avgBurn > 0 ? reserve / avgBurn : null
  const sellMonths = avgBurn > 0 ? (reserve + sellValue) / avgBurn : null
  const activeMonths = sellValue > 0 ? sellMonths : baseMonths
  const extraMonths = sellMonths != null && baseMonths != null ? sellMonths - baseMonths : 0

  const { color, label } = survivalMeta(activeMonths)
  const survivalText = activeMonths == null ? '—' : Math.floor(activeMonths)

  const toggle = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const selectAll = () => setSelectedIds(sellable.map((a) => a.id))
  const clearAll = () => setSelectedIds([])

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20">
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
            <path d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Burn Rate</h3>
          <p className="text-[11px] text-slate-500">How long your cash on hand lasts at current spending</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Survival</p>
          <p className="mt-1 text-2xl font-extrabold" style={{ color }}>{survivalText}</p>
          <p className="text-[10px] text-slate-500">months</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Avg Burn</p>
          <p className="mt-1 text-sm font-bold text-slate-200">PKR {fmtPKR(avgBurn)}</p>
          <p className="text-[10px] text-slate-500">/month</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Status</p>
          <p className="mt-1 text-sm font-bold" style={{ color }}>{label}</p>
          <p className="text-[10px] text-slate-500">runway</p>
        </div>
      </div>

      {/* Without-selling vs if-sold comparison */}
      {sellValue > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">If you don&apos;t sell</p>
            <p className="mt-0.5 text-sm font-bold text-slate-300">{baseMonths == null ? '—' : Math.floor(baseMonths)} mo</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">If you sell selected</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-400">
              {sellMonths == null ? '—' : Math.floor(sellMonths)} mo
              {extraMonths >= 1 && <span className="ml-1 text-[10px] font-semibold">(+{Math.floor(extraMonths)})</span>}
            </p>
          </div>
        </div>
      )}

      {/* Asset sale selector — collapsible */}
      {sellable.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <button onClick={() => setShowAssets((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Sell assets to extend runway
              {selectedCount > 0 && <span className="ml-1.5 text-emerald-400">· {selectedCount} selected</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">PKR {fmtPKR(sellableTotal)} available</span>
              <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showAssets ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
            </span>
          </button>

          {showAssets && (
            <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
              <div className="mb-2 flex items-center justify-end gap-2 text-[10px]">
                <button onClick={selectAll} className="text-slate-400 hover:text-emerald-400">Select all</button>
                <span className="text-slate-700">·</span>
                <button onClick={clearAll} className="text-slate-400 hover:text-red-400">Clear</button>
              </div>
              <div className="space-y-1.5">
                {sellable.map((a) => {
                  const checked = selectedSet.has(a.id)
                  return (
                    <button key={a.id} onClick={() => toggle(a.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        checked ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}>
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-emerald-400 bg-emerald-500/30 text-emerald-300' : 'border-white/20 text-transparent'
                        }`}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                        </span>
                        <span className="truncate text-xs text-slate-300">{a.name}</span>
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>
                        PKR {fmtPKR(a.currentValue || 0)}
                      </span>
                    </button>
                  )
                })}
              </div>
              {sellValue > 0 && (
                <p className="mt-2 text-[10px] text-emerald-400/80">
                  Selling {selectedCount} item{selectedCount !== 1 ? 's' : ''} frees PKR {fmtPKR(sellValue)} of cash.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-500">
        Based on PKR {fmtPKR(reserve + sellValue)} {sellValue > 0 ? '(cash on hand + selected items)' : 'cash on hand'} ÷ PKR {fmtPKR(avgBurn)}/mo avg spend.
        {sellable.length === 0 && ' Add owned items to model selling them here.'}
      </p>
      {reserve === 0 && sellValue === 0 && (
        <p className="mt-1 text-[11px] text-amber-400/80">
          No spare cash on hand. Set your balance &amp; mark salary credited in the calendar below, or tick assets to sell.
        </p>
      )}
      {activeMonths != null && activeMonths < 6 && (reserve > 0 || sellValue > 0) && (
        <p className="mt-1 text-[11px] text-amber-400/80">
          ⚠ Less than 6 months runway. Consider reducing spending or increasing savings.
        </p>
      )}
    </div>
  )
}

// ─── Financial Calendar (user-defined pay cycle) ──────────────────────────────

function FinancialCalendarCard({
  expenses, loans, salarySuggestion = 0, hasSavedInvoice = false,
  payDay, setPayDay, nextPayDate, currentCycleStart, daysUntilNextPay,
  startingBalance = 0, setStartingBalance, credited, creditSalary, unCredit,
  availableCash = 0, loanCash = 0,
}) {
  const [editingDay, setEditingDay] = useState(false)
  const [dayInput, setDayInput] = useState(String(payDay))
  const [editingBal, setEditingBal] = useState(false)
  const [balInput, setBalInput] = useState('')
  const [creditOpen, setCreditOpen] = useState(false)
  const [creditDate, setCreditDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [creditAmt, setCreditAmt] = useState('')

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDay = today.getDate()
  const salaryDay = Math.min(payDay, daysInMonth)
  const creditedDate = credited?.date || null
  const creditedAmount = credited?.amount ?? null
  // Net base salary to show (saved invoice value, or the credited amount once marked)
  const salaryShown = credited ? (creditedAmount ?? salarySuggestion) : salarySuggestion

  const saveDay = () => { setPayDay(dayInput); setEditingDay(false) }
  const saveBal = () => { setStartingBalance(Number(balInput) || 0); setEditingBal(false) }
  const openCredit = () => {
    setCreditAmt(salarySuggestion ? String(Math.round(salarySuggestion)) : '')
    setCreditDate(new Date().toISOString().slice(0, 10))
    setCreditOpen(true)
  }
  const saveCredit = () => {
    creditSalary(Number(creditAmt) || salarySuggestion || 0, creditDate)
    setCreditOpen(false)
  }

  // Loan installment events (real dates from loan records)
  const loanEvents = loans
    .filter((l) => l.status !== 'paid' && l.monthlyInstallment > 0)
    .map((l) => ({
      day: new Date(l.loanDate + 'T00:00:00').getDate(),
      label: `${l.lenderName} installment`,
      amount: l.monthlyInstallment,
      type: 'loan',
    }))

  const events = [
    { day: salaryDay, label: credited ? 'Salary credited' : 'Salary due', type: 'salary', amount: salaryShown || null, credited: !!credited },
    ...loanEvents,
  ].sort((a, b) => a.day - b.day)

  const upcoming = events.filter((e) => e.day >= todayDay || (e.type === 'salary' && e.credited))
  const past = events.filter((e) => e.day < todayDay && !(e.type === 'salary' && e.credited))

  // Recurring expenses listed per-cycle (no exact day in data) — mirrors Expense Tracker
  const recurring = expenses.filter((e) => e.recurring)
  const recurringByName = Object.values(
    recurring.reduce((acc, e) => {
      const k = e.name.toLowerCase().trim()
      if (!acc[k]) acc[k] = { name: e.name, amount: e.amount, category: e.category }
      return acc
    }, {})
  )
  const recurringTotal = recurringByName.reduce((s, e) => s + (e.amount || 0), 0)

  const typeColor = { salary: '#10b981', bill: '#f59e0b', loan: '#ef4444', sub: '#8b5cf6' }
  const typeLabel = { salary: '💰', bill: '📋', loan: '💳', sub: '🔄' }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Financial Calendar</h3>
            <p className="text-[11px] text-slate-500">
              Cycle {fmtShortDate(currentCycleStart)} – {fmtShortDate(nextPayDate)} · {daysUntilNextPay} day{daysUntilNextPay !== 1 ? 's' : ''} to pay
            </p>
          </div>
        </div>
      </div>

      {/* Available-now summary */}
      <div className={`mb-4 rounded-xl border p-3 ${credited ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Available now</p>
          <p className="text-lg font-extrabold tabular-nums" style={{ color: availableCash >= 0 ? '#10b981' : '#ef4444' }}>
            PKR {fmtPKR(availableCash)}
          </p>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500">
          Balance PKR {fmtPKR(startingBalance)}
          {credited
            ? <span className="text-emerald-400"> + Salary PKR {fmtPKR(creditedAmount ?? salaryShown)}</span>
            : <span className="text-amber-400/80"> · salary not yet credited</span>}
          {loanCash > 0 && <span className="text-red-400"> + Loans PKR {fmtPKR(loanCash)}</span>}
        </p>
      </div>

      {/* Config: pay day + cash balance */}
      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        {/* Pay day */}
        {editingDay ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Salary lands on day</span>
            <input type="number" min="1" max="31" value={dayInput} autoFocus
              onChange={(e) => setDayInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveDay(); if (e.key === 'Escape') setEditingDay(false) }}
              className="w-16 rounded-lg border border-blue-400/40 bg-white/5 px-2 py-1 text-sm text-white outline-none" />
            <span className="text-[11px] text-slate-500">of each month</span>
            <div className="ml-auto flex gap-1.5">
              <button onClick={saveDay} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500">Save</button>
              <button onClick={() => setEditingDay(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-300">
                Pay day: <span className="font-semibold text-blue-400">{payDay}{ordinal(payDay)}</span> of the month
              </p>
              <p className="text-[10px] text-slate-500">Next salary ≈ {fmtShortDate(nextPayDate)}</p>
            </div>
            <button onClick={() => { setDayInput(String(payDay)); setEditingDay(true) }}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:border-white/20 hover:text-white">
              Edit
            </button>
          </div>
        )}

        {/* Cash balance (auto-carries to next month) */}
        <div className="mt-2.5 border-t border-white/10 pt-2.5">
          {editingBal ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Balance before salary</span>
              <input type="number" value={balInput} autoFocus placeholder="0"
                onChange={(e) => setBalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveBal(); if (e.key === 'Escape') setEditingBal(false) }}
                className="w-28 rounded-lg border border-blue-400/40 bg-white/5 px-2 py-1 text-sm text-white outline-none" />
              <div className="ml-auto flex gap-1.5">
                <button onClick={saveBal} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-500">Save</button>
                <button onClick={() => setEditingBal(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300">
                  Carryover balance: <span className="font-semibold text-slate-200">PKR {fmtPKR(startingBalance)}</span>
                </p>
                <p className="text-[10px] text-slate-500">Money before this month&apos;s salary · auto-carries each cycle</p>
              </div>
              <button onClick={() => { setBalInput(String(Math.round(startingBalance))); setEditingBal(true) }}
                className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:border-white/20 hover:text-white">
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Salary credited status */}
        <div className="mt-2.5 border-t border-white/10 pt-2.5">
          {credited ? (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-emerald-400">
                ✓ Salary PKR {fmtPKR(creditedAmount ?? salaryShown)} credited
                {creditedDate && <> on {new Date(creditedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                {creditedDate && (() => {
                  const actual = new Date(creditedDate + 'T00:00:00').getDate()
                  const delay = actual - salaryDay
                  return delay > 0 ? <span className="ml-1 text-amber-400">({delay} day{delay !== 1 ? 's' : ''} late)</span> : null
                })()}
              </p>
              <button onClick={() => unCredit()}
                className="text-[11px] text-slate-500 hover:text-red-400">Undo</button>
            </div>
          ) : creditOpen ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-14">Amount</span>
                <span className="text-[11px] text-slate-500">PKR</span>
                <input type="number" value={creditAmt} autoFocus placeholder={salarySuggestion ? String(Math.round(salarySuggestion)) : 'Net salary'}
                  onChange={(e) => setCreditAmt(e.target.value)}
                  className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-900/20 px-2 py-1 text-sm text-white outline-none focus:border-emerald-400/60" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-14">On</span>
                <input type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none focus:border-emerald-400/50" />
                <div className="ml-auto flex gap-1.5">
                  <button onClick={saveCredit} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500">Credit it</button>
                  <button onClick={() => setCreditOpen(false)} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-white">✕</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {hasSavedInvoice
                  ? <>Salary due: <span className="font-semibold text-slate-200">PKR {fmtPKR(salarySuggestion)}</span> <span className="text-slate-600">(net base)</span></>
                  : <span className="text-slate-500">Save an invoice to set your salary</span>}
              </p>
              <button onClick={openCredit}
                className="rounded-lg bg-emerald-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500">
                Mark credited
              </button>
            </div>
          )}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Upcoming</p>
          <div className="space-y-1.5">
            {upcoming.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                  style={{ backgroundColor: typeColor[e.type] + '20', color: typeColor[e.type] }}>
                  {e.day}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {typeLabel[e.type]} {e.label}
                    {e.type === 'salary' && e.credited && <span className="ml-1.5 text-[10px] text-emerald-400">✓</span>}
                  </p>
                </div>
                {e.amount ? <span className="text-xs font-semibold shrink-0" style={{ color: typeColor[e.type] }}>
                  {e.type === 'salary' ? '+' : '-'}PKR {fmtPKR(e.amount)}
                </span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Earlier this month</p>
          <div className="space-y-1 opacity-50">
            {past.map((e, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-1.5">
                <span className="text-[11px] text-slate-600 w-6 text-center">{e.day}</span>
                <span className="text-xs text-slate-600 truncate">{typeLabel[e.type]} {e.label}</span>
                {e.amount ? <span className="text-[11px] text-slate-600 ml-auto shrink-0">PKR {fmtPKR(e.amount)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring this cycle — kept in sync with the Expense Tracker */}
      {recurringByName.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recurring this cycle</p>
            <span className="text-[11px] font-semibold text-slate-400">PKR {fmtPKR(recurringTotal)}/mo</span>
          </div>
          <div className="space-y-1">
            {recurringByName.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                <span className="text-xs text-slate-300 truncate">🔄 {e.name}</span>
                <span className="text-xs font-semibold text-slate-400 shrink-0">PKR {fmtPKR(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EXPENSE_CATS = ['Housing','Food','Transport','Subscriptions','Trips','Treats','Utilities','Healthcare','Education','Shopping','Other']
const CAT_COLORS   = ['#3b82f6','#10b981','#f59e0b','#7c3aed','#0ea5e9','#ec4899','#06b6d4','#ef4444','#6366f1','#f97316','#64748b']

export default function InsightsPage({ entries, finalSalary }) {
  const { expenses } = useExpenses()
  const { goals }    = useGoals()
  const { loans, payLoan, addLoan } = useLoans()
  const { assets }   = useAssets()
  const [months6]       = useState(() => lastNMonths(6))
  const currentMonth    = new Date().toISOString().slice(0, 7)
  const prevMonth       = lastNMonths(2)[0]

  // Cash on hand from active PKR loans not tied to a goal purchase
  const loanCash = loans
    .filter((l) => l.status !== 'paid' && !l.goalId && (l.currency === 'PKR' || !l.currency))
    .reduce((s, l) => s + (l.remaining || 0), 0)
  const ledger = useCashLedger(expenses, { loanCash })

  // Salary figure = net base after provident fund, from the latest SAVED invoice
  // (not the live calculator). Falls back to the live final salary if nothing saved.
  const salarySuggestion = entries.length
    ? Math.max((entries[0].results?.monthlyPKR || 0) - (entries[0].results?.providentFund || 0), 0)
    : finalSalary
  const [activeCatsArr, setActiveCatsArr] = useLocalStorage('pp-active-cats', EXPENSE_CATS.slice(0, 5))
  const activeCats = useMemo(() => new Set(activeCatsArr), [activeCatsArr])

  const toggleCat = (cat) => setActiveCatsArr((prev) => {
    const s = new Set(prev)
    s.has(cat) ? s.delete(cat) : s.add(cat)
    return [...s]
  })

  // Expense trend series — one line per selected category
  const trendSeries = useMemo(() =>
    EXPENSE_CATS
      .filter((c) => activeCats.has(c))
      .map((cat, i) => ({
        label: cat,
        color: CAT_COLORS[EXPENSE_CATS.indexOf(cat)],
        values: months6.map((m) =>
          expenses.filter((e) => e.month === m && e.category === cat)
            .reduce((s, e) => s + e.amount, 0)
        ),
      }))
      .filter((s) => s.values.some((v) => v > 0)),
  [expenses, months6, activeCats])

  // Total spending per month (for combined line)
  const totalSeries = useMemo(() => [{
    label: 'Total',
    values: months6.map((m) =>
      expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0)
    ),
  }], [expenses, months6])

  const hasExpenses = expenses.some((e) => months6.includes(e.month))

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-white">Insights</h2>
        <p className="mt-1 text-sm text-slate-400">Trends, growth, and your financial picture over time.</p>
      </div>

      {/* ── Expense Trend Chart ── */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Expense Trends</h3>
            <p className="text-[11px] text-slate-500">Last 6 months by category</p>
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {EXPENSE_CATS.map((cat, i) => (
            <button key={cat} onClick={() => toggleCat(cat)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors border ${
                activeCats.has(cat)
                  ? 'border-transparent text-white'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
              style={activeCats.has(cat) ? { backgroundColor: CAT_COLORS[i] + '33', borderColor: CAT_COLORS[i] + '66', color: CAT_COLORS[i] } : {}}>
              {cat}
            </button>
          ))}
        </div>

        {!hasExpenses ? (
          <p className="py-8 text-center text-sm text-slate-500">No expenses recorded in the last 6 months.</p>
        ) : trendSeries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Select at least one category above.</p>
        ) : (
          <>
            <MultiLineChart series={trendSeries} months={months6} />
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3">
              {trendSeries.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Total monthly spend trend ── */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/><polyline points="7 16 11 12 15 16 19 8"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Total Monthly Spending</h3>
            <p className="text-[11px] text-slate-500">All categories combined</p>
          </div>
        </div>
        {!hasExpenses ? (
          <p className="py-8 text-center text-sm text-slate-500">No expense data yet.</p>
        ) : (
          <>
            <MultiLineChart series={totalSeries} months={months6} />
            <div className="mt-3 grid grid-cols-3 gap-3">
              {months6.slice(-3).map((m) => {
                const spent = expenses.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0)
                return (
                  <div key={m} className="rounded-xl bg-white/5 p-2.5 text-center">
                    <p className="text-[10px] text-slate-500">{monthLabel(m)}</p>
                    <p className="mt-1 text-xs font-bold text-red-400">PKR {fmtPKR(spent)}</p>
                    {finalSalary > 0 && (
                      <p className="text-[10px] text-slate-600">{((spent / finalSalary) * 100).toFixed(0)}% of salary</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Salary growth chart ── */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Salary Growth</h3>
            <p className="text-[11px] text-slate-500">Base salary vs overtime across saved entries</p>
          </div>
        </div>
        <SalaryGrowthChart entries={entries} />
      </div>

      {/* ── Net Worth Timeline ── */}
      {entries.length >= 2 && (
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Net Worth Timeline</h3>
              <p className="text-[11px] text-slate-500">Cumulative earnings trajectory from history</p>
            </div>
          </div>
          <NetWorthTimeline entries={entries} />
        </div>
      )}

      {/* ── Net worth tracker ── */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Net Worth</h3>
            <p className="text-[11px] text-slate-500">Goal savings minus your debts/liabilities</p>
          </div>
        </div>
        <NetWorthTracker goals={goals} finalSalary={finalSalary} loans={loans} onPayLoan={payLoan} onAddLoan={addLoan} assets={assets} />
      </div>

      {/* ── Burn Rate Calculator ── */}
      <BurnRateCard expenses={expenses} assets={assets} months6={months6} cashOnHand={ledger.cashOnHand} />

      {/* ── Expense Leak Detector ── */}
      {(() => {
        const curr = expenses.filter(e => e.month === currentMonth)
        const prev = expenses.filter(e => e.month === prevMonth)
        const currTotal = cat => curr.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
        const prevTotal = cat => prev.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)

        const spikes = EXPENSE_CATS
          .map(cat => ({ cat, curr: currTotal(cat), prev: prevTotal(cat) }))
          .filter(c => c.prev > 0 && c.curr > c.prev * 1.5)
          .sort((a, b) => (b.curr - b.prev) - (a.curr - a.prev))

        const recurring = curr.filter(e => e.recurring)
        const recurringTotal = recurring.reduce((s, e) => s + e.amount, 0)

        // Small repeated expenses: non-recurring, amount < 5000, appearing 3+ times
        const nameCounts = curr.filter(e => !e.recurring).reduce((acc, e) => {
          const key = e.name.toLowerCase().trim()
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
        const coffeeLeaks = Object.entries(nameCounts)
          .filter(([, count]) => count >= 2)
          .map(([name, count]) => ({
            name,
            count,
            total: curr.filter(e => e.name.toLowerCase().trim() === name).reduce((s, e) => s + e.amount, 0),
          }))

        const hasLeaks = spikes.length > 0 || coffeeLeaks.length > 0

        return (
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Expense Leak Detector</h3>
                  <p className="text-[11px] text-slate-500">Unusual spikes and repeated spending</p>
                </div>
              </div>
              {!hasLeaks && <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400">No leaks ✓</span>}
            </div>

            {spikes.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-orange-400">Category Spikes vs Last Month</p>
                <div className="space-y-2">
                  {spikes.slice(0, 4).map(s => {
                    const pct = Math.round(((s.curr - s.prev) / s.prev) * 100)
                    return (
                      <div key={s.cat} className="flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
                        <span className="text-sm font-medium text-slate-200">{s.cat}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-orange-400">+{pct}%</span>
                          <p className="text-[10px] text-slate-500">PKR {fmtPKR(s.prev)} → {fmtPKR(s.curr)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {coffeeLeaks.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400">Repeated Expenses</p>
                <div className="space-y-1.5">
                  {coffeeLeaks.slice(0, 4).map(l => (
                    <div key={l.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-sm capitalize text-slate-300">{l.name}</span>
                      <span className="text-[11px] text-amber-400">{l.count}× · PKR {fmtPKR(l.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recurringTotal > 0 && (
              <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Total recurring subscriptions/bills</span>
                <span className="text-sm font-bold text-slate-200">PKR {fmtPKR(recurringTotal)}/mo</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Subscription Timeline ── */}
      {(() => {
        const recurring = expenses.filter(e => e.recurring)
        if (recurring.length === 0) return null
        const byCategory = EXPENSE_CATS.map(cat => ({
          cat,
          items: recurring.filter(e => e.category === cat),
          total: recurring.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
        })).filter(c => c.items.length > 0)
        const grandTotal = recurring.reduce((s, e) => s + e.amount, 0)
        return (
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Subscription Timeline</h3>
                  <p className="text-[11px] text-slate-500">Recurring monthly commitments</p>
                </div>
              </div>
              <span className="text-sm font-bold text-purple-400">PKR {fmtPKR(grandTotal)}<span className="text-[11px] font-normal text-slate-500">/mo</span></span>
            </div>
            <div className="space-y-3">
              {byCategory.map(({ cat, items, total }) => {
                const i = EXPENSE_CATS.indexOf(cat)
                const color = CAT_COLORS[i] || '#64748b'
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{cat}</span>
                      <span className="text-[11px] text-slate-400">PKR {fmtPKR(total)}/mo</span>
                    </div>
                    <div className="space-y-1">
                      {items.map(e => (
                        <div key={e.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                          <span className="text-xs text-slate-300">{e.name}</span>
                          <span className="text-xs font-semibold text-slate-200">PKR {fmtPKR(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Financial Calendar ── */}
      <FinancialCalendarCard
        expenses={expenses}
        loans={loans}
        salarySuggestion={salarySuggestion}
        hasSavedInvoice={entries.length > 0}
        payDay={ledger.payDay}
        setPayDay={ledger.setPayDay}
        nextPayDate={ledger.nextPayDate}
        currentCycleStart={ledger.currentCycleStart}
        daysUntilNextPay={ledger.daysUntilNextPay}
        thisMonthKey={ledger.thisMonthKey}
        startingBalance={ledger.startingBalance}
        setStartingBalance={ledger.setStartingBalance}
        credited={ledger.credited}
        creditSalary={ledger.creditSalary}
        unCredit={ledger.unCredit}
        availableCash={ledger.availableCash}
        loanCash={ledger.loanCash}
      />
    </div>
  )
}
