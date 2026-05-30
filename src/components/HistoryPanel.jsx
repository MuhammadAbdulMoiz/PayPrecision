import { useState, useMemo } from 'react'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatShortDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPKR(v) {
  if (typeof v !== 'number' || isNaN(v)) return '---'
  return 'PKR ' + v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function invId(iso, idx) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `#PP-${y}-${m}-${String(idx + 1).padStart(2, '0')}`
}

function totalFor(e) {
  return e.results.totalEarnings ?? e.results.finalSalary ?? 0
}

function downloadCSV(entries) {
  const headers = ['Invoice ID', 'Date', 'Base Salary (PKR)', 'Extra Pay (PKR)', 'Leave Deduction (PKR)', 'Attendance Bonus (PKR)', 'Provident Fund (PKR)', 'Reimbursements (PKR)', 'Annual Bonus (PKR)', 'Total Earnings (PKR)']
  const rows = entries.map((e, idx) => [
    invId(e.date, idx),
    formatDate(e.date),
    (e.results.monthlyPKR || 0).toFixed(2),
    (e.results.extraPay || 0).toFixed(2),
    (e.results.leaveDeduction || 0).toFixed(2),
    (e.results.attendanceBonus || 0).toFixed(2),
    (e.results.providentFund || 0).toFixed(2),
    (e.results.reimbursementPKR || 0).toFixed(2),
    (e.results.annualBonusPKR || 0).toFixed(2),
    totalFor(e).toFixed(2),
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payprecision-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function fmtK(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (v >= 1_000)     return Math.round(v / 1_000) + 'K'
  return Math.round(v)
}

// Stacked bar comparison chart — base / OT / reimbursements / bonus per month
function SalaryChart({ entries }) {
  const [hovered, setHovered] = useState(null)
  if (entries.length < 2) return null

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12)
  const bars = sorted.map(e => ({
    month:  new Date(e.date).toLocaleString('en-US', { month: 'short', year: '2-digit' }),
    base:   Math.round(e.results?.monthlyPKR      || 0),
    ot:     Math.round(e.results?.extraPay        || 0),
    reimb:  Math.round(e.results?.reimbursementPKR || 0),
    bonus:  Math.round(e.results?.annualBonusPKR  || 0),
  }))

  const maxVal  = Math.max(...bars.map(b => b.base + b.ot + b.reimb + b.bonus), 1)
  const W = 560, H = 200
  const PAD = { top: 20, right: 12, bottom: 36, left: 52 }
  const cW  = W - PAD.left - PAD.right
  const cH  = H - PAD.top  - PAD.bottom
  const slot = cW / bars.length
  const barW = Math.max(Math.min(slot * 0.65, 44), 10)

  const segments = [
    { key: 'base',  color: '#3b82f6', label: 'Base' },
    { key: 'ot',    color: '#f59e0b', label: 'OT'   },
    { key: 'reimb', color: '#8b5cf6', label: 'Reimb' },
    { key: 'bonus', color: '#10b981', label: 'Bonus' },
  ]
  const hasOT    = bars.some(b => b.ot > 0)
  const hasReimb = bars.some(b => b.reimb > 0)
  const hasBonus = bars.some(b => b.bonus > 0)
  const visibleSegs = segments.filter(s =>
    s.key === 'base' || (s.key === 'ot' && hasOT) || (s.key === 'reimb' && hasReimb) || (s.key === 'bonus' && hasBonus)
  )

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Monthly Earnings Breakdown</h3>
        <div className="flex items-center gap-3">
          {visibleSegs.map(s => (
            <span key={s.key} className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          <defs>
            {visibleSegs.map(s => (
              <linearGradient key={s.key} id={`hg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
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

          {bars.map((b, i) => {
            const x      = PAD.left + i * slot + (slot - barW) / 2
            const isHov  = hovered === i
            let stackY   = PAD.top + cH
            return (
              <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                <rect x={x - 4} y={PAD.top} width={barW + 8} height={cH}
                  fill={isHov ? 'rgba(255,255,255,0.04)' : 'transparent'} rx="3" />
                {visibleSegs.map(s => {
                  const val = b[s.key]
                  if (!val) return null
                  const segH = (val / maxVal) * cH
                  stackY -= segH
                  return (
                    <rect key={s.key} x={x} y={stackY} width={barW} height={segH}
                      fill={`url(#hg-${s.key})`} opacity={isHov ? 1 : 0.85} rx="2"
                      style={{ transition: 'opacity .15s' }} />
                  )
                })}
                <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="9" fill="rgba(100,116,139,0.85)">
                  {b.month}
                </text>
              </g>
            )
          })}
        </svg>

        {hovered !== null && (() => {
          const b    = bars[hovered]
          const xPct = ((PAD.left + hovered * slot + slot / 2) / W) * 100
          const total = b.base + b.ot + b.reimb + b.bonus
          return (
            <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs backdrop-blur-sm"
              style={{ left: `${Math.min(Math.max(xPct, 12), 80)}%`, transform: 'translateX(-50%)' }}>
              <p className="mb-1.5 font-semibold text-slate-200">{b.month}</p>
              <p className="text-blue-400">Base &nbsp;&nbsp;PKR {b.base.toLocaleString()}</p>
              {b.ot    > 0 && <p className="text-amber-400">OT &nbsp;&nbsp;&nbsp;&nbsp;PKR {b.ot.toLocaleString()}</p>}
              {b.reimb > 0 && <p className="text-purple-400">Reimb &nbsp;PKR {b.reimb.toLocaleString()}</p>}
              {b.bonus > 0 && <p className="text-emerald-400">Bonus &nbsp;PKR {b.bonus.toLocaleString()}</p>}
              <p className="mt-1.5 border-t border-white/10 pt-1.5 font-bold text-white">Total PKR {total.toLocaleString()}</p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function toMonthValue(iso) {
  return new Date(iso).toISOString().slice(0, 7)
}

export default function HistoryPanel({ entries, onClear, onDelete, onUpdateDate, onDownloadReport }) {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editMonth, setEditMonth] = useState('')

  const years = useMemo(() => {
    const set = new Set(entries.map((e) => new Date(e.date).getFullYear()))
    return [...set].sort((a, b) => b - a)
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const d = new Date(e.date)
      if (yearFilter !== 'all' && d.getFullYear() !== Number(yearFilter)) return false
      if (monthFilter !== 'all' && d.getMonth() !== Number(monthFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        const dateStr = formatDate(e.date).toLowerCase()
        const amount = e.results.finalSalary.toFixed(2)
        return dateStr.includes(q) || amount.includes(q)
      }
      return true
    })
  }, [entries, search, yearFilter, monthFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white light:text-slate-800">Earnings History</h2>
          <p className="mt-1 text-sm text-slate-400">Track and analyze your professional revenue stream over time.</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <>
              <button
                onClick={() => downloadCSV(entries)}
                className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
              >
                Export CSV
              </button>
              <button
                onClick={onClear}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">No calculations saved yet.</p>
          <p className="mt-1 text-xs text-slate-600">Use the calculator and click "Save to History" to start tracking.</p>
        </div>
      ) : (
        <>
          {/* Salary projection chart */}
          <SalaryChart entries={entries} />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 light:bg-slate-100 light:text-slate-700 light:border-slate-200"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 light:bg-slate-100 light:text-slate-700 light:border-slate-200"
            >
              <option value="all" className="bg-slate-800">All Years</option>
              {years.map((y) => (
                <option key={y} value={y} className="bg-slate-800">Year: {y}</option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 light:bg-slate-100 light:text-slate-700 light:border-slate-200"
            >
              <option value="all" className="bg-slate-800">All Months</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i} className="bg-slate-800">
                  {new Date(2000, i).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {/* Table header */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 light:border-slate-200">
              <span>Billing Period</span>
              <span>Amount</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">
                No matching entries found.
              </div>
            ) : (
              filtered.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center gap-4 border-b border-white/5 px-5 py-4 last:border-b-0 transition-colors hover:bg-white/[0.02] light:border-slate-100 light:hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                    <div>
                      {editingId === entry.id ? (
                        <form
                          className="flex items-center gap-1.5"
                          onSubmit={async (e) => {
                            e.preventDefault()
                            const iso = new Date(editMonth + '-01T12:00:00').toISOString()
                            await onUpdateDate(entry.id, iso)
                            setEditingId(null)
                          }}
                        >
                          <input
                            type="month"
                            value={editMonth}
                            onChange={e => setEditMonth(e.target.value)}
                            autoFocus
                            required
                            className="rounded border border-blue-400/40 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-400/70"
                          />
                          <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-500">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white text-[10px] px-1">✕</button>
                        </form>
                      ) : (
                        <button
                          className="group/date flex items-center gap-1.5 text-left"
                          onClick={() => { setEditingId(entry.id); setEditMonth(toMonthValue(entry.date)) }}
                          title="Click to change month"
                        >
                          <p className="text-sm font-medium text-slate-200 group-hover/date:text-blue-400 transition-colors">
                            {formatDate(entry.date)}
                          </p>
                          <svg className="h-3 w-3 text-slate-600 group-hover/date:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Inv {invId(entry.date, idx)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-semibold tabular-nums text-slate-100 light:text-slate-800">
                      {formatPKR(totalFor(entry))}
                    </p>
                    {(entry.results.reimbursementPKR || entry.results.annualBonusPKR) && (
                      <p className="text-[10px] text-slate-500">
                        Base {formatPKR(entry.results.finalSalary)}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                    SAVED
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/30 hover:text-red-400 light:border-slate-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Annual report card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6">
        <div className="relative">
          <h3 className="text-xl font-bold text-white">Annual Revenue Report</h3>
          <p className="mt-2 text-sm text-blue-100/80">
            {entries.length > 0
              ? `You have ${entries.length} calculation${entries.length > 1 ? 's' : ''} saved. Download your comprehensive fiscal summary.`
              : 'Your earnings data will be compiled here. Download your comprehensive fiscal summary.'}
          </p>
          <button
            onClick={onDownloadReport}
            disabled={entries.length === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
