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

// SVG salary projection chart
function SalaryChart({ entries }) {
  if (entries.length < 2) return null

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12)
  const salaries = sorted.map((e) => totalFor(e))
  const min = Math.min(...salaries)
  const max = Math.max(...salaries)
  const range = max - min || 1

  const W = 600
  const H = 140
  const PAD = { top: 16, right: 16, bottom: 32, left: 64 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const pts = sorted.map((e, i) => {
    const x = PAD.left + (i / (sorted.length - 1)) * chartW
    const y = PAD.top + chartH - ((e.results.finalSalary - min) / range) * chartH
    return { x, y, e }
  })

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  // Filled area path
  const area = `M${pts[0].x},${PAD.top + chartH} ` +
    pts.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length - 1].x},${PAD.top + chartH} Z`

  // Y axis labels
  const yTicks = [0, 0.5, 1].map((t) => ({
    value: min + t * range,
    y: PAD.top + chartH - t * chartH,
  }))

  return (
    <div className="glass rounded-2xl p-5 mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Salary Projection
        </h3>
        <span className="text-[10px] text-slate-500">Last {sorted.length} entries</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <line key={i} x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}

        {/* Y axis labels */}
        {yTicks.map((t, i) => (
          <text key={i} x={PAD.left - 6} y={t.y + 4} textAnchor="end"
            fontSize="9" fill="rgba(148,163,184,0.8)">
            {t.value >= 1000 ? `${(t.value / 1000).toFixed(0)}k` : t.value.toFixed(0)}
          </text>
        ))}

        {/* Area fill */}
        <path d={area} fill="url(#chartGrad)" />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
        ))}

        {/* X axis labels — show first, middle, last */}
        {[0, Math.floor(sorted.length / 2), sorted.length - 1].map((i) => {
          if (!pts[i]) return null
          const d = new Date(sorted[i].date)
          const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          return (
            <text key={i} x={pts[i].x} y={H - 6} textAnchor="middle"
              fontSize="9" fill="rgba(148,163,184,0.7)">
              {label}
            </text>
          )
        })}
      </svg>
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
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center gap-4 border-b border-white/5 px-5 py-4 transition-colors hover:bg-white/[0.02] last:border-b-0 light:border-slate-100 light:hover:bg-slate-50"
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
