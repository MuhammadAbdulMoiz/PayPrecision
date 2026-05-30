import { useState, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ── helpers ───────────────────────────────────────────────────────────────────

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function calcLaptopStats(item) {
  if (!item.startDate) return { monthsElapsed: 0, totalReimbursed: 0, remaining: item.totalAmount, monthsLeft: 36 }
  const start = new Date(item.startDate + '-01')
  const now = new Date()
  const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth())
  const elapsed = Math.min(months, 36)
  const reimbursed = elapsed * item.monthlyAmount
  return { monthsElapsed: elapsed, totalReimbursed: reimbursed, remaining: item.totalAmount - reimbursed, monthsLeft: 36 - elapsed }
}

function fmtUSD(v) {
  if (typeof v !== 'number' || isNaN(v)) return '$0.00'
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-emerald-500' : 'bg-white/20'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

// ── inline editable field ─────────────────────────────────────────────────────

function InlineEdit({ value, onChange, placeholder, className = '', type = 'text', step }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  function commit() {
    setEditing(false)
    if (local !== value) onChange(type === 'number' ? parseFloat(local) || 0 : local)
  }
  if (editing) {
    return (
      <input
        autoFocus type={type} step={step} value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className={`rounded bg-black/40 px-1 py-0.5 text-white outline-none ring-1 ring-white/40 ${className}`}
      />
    )
  }
  return (
    <span
      role="button" tabIndex={0}
      onClick={() => { setLocal(value); setEditing(true) }}
      onKeyDown={e => { if (e.key === 'Enter') { setLocal(value); setEditing(true) } }}
      className={`cursor-text hover:underline decoration-dotted underline-offset-2 ${className}`}
      title="Click to edit"
    >
      {value || <span className="opacity-40">{placeholder}</span>}
    </span>
  )
}

// ── image uploader ────────────────────────────────────────────────────────────

function ImageUploadTrigger({ id, hasImage, onUpload, children }) {
  const ref = useRef()
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await readFileAsDataURL(file)
    onUpload(data)
  }
  return (
    <>
      <div onClick={() => ref.current?.click()} className="cursor-pointer" title="Click to upload image">
        {children}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}

// ── AI provider card — GoalCard style, full-width ────────────────────────────

function AICard({ item, onUpdate, onDelete, onUploadLogo }) {
  const logoUrl = item.hasLogo ? `/api/images/${item.id}?v=${item.updatedAt || ''}` : null

  return (
    <div className="group relative overflow-hidden rounded-2xl" style={{ minHeight: '140px' }}>
      {/* Blurred background from logo */}
      {logoUrl ? (
        <img src={logoUrl} alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.3) blur(20px)', transform: 'scale(1.2)' }} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 to-slate-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Delete — top RIGHT, hover only — well away from toggle */}
      <button
        onClick={() => onDelete(item.id)}
        className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        title="Delete"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="relative flex h-full items-end gap-4 p-4" style={{ minHeight: '140px' }}>
        {/* Logo circle — left side */}
        <ImageUploadTrigger id={item.id} hasImage={item.hasLogo} onUpload={data => onUploadLogo(item.id, data)}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-black/40 overflow-hidden hover:border-white/50 transition-colors">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
              : <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
            }
          </div>
        </ImageUploadTrigger>

        {/* Name + amount — grows */}
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={item.name}
            onChange={name => onUpdate(item.id, { name })}
            placeholder="Provider name"
            className="block text-sm font-bold text-white drop-shadow"
          />
          <div className="mt-0.5 flex items-center gap-1 text-xs text-white/60">
            <span>$</span>
            <InlineEdit
              value={String(item.amount)}
              onChange={amount => onUpdate(item.id, { amount })}
              placeholder="10" type="number" step="0.01"
              className="w-14 text-white/80"
            />
            <span>/mo</span>
          </div>
        </div>

        {/* Apply toggle — bottom RIGHT, far from delete */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Toggle checked={item.applied} onChange={v => onUpdate(item.id, { applied: v })} />
          <span className={`text-[9px] font-semibold ${item.applied ? 'text-emerald-300' : 'text-white/35'}`}>
            {item.applied ? 'Applied' : 'Off'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── laptop card — GoalCard style ──────────────────────────────────────────────

function LaptopCard({ item, onUpdate, onDelete, onUploadImage }) {
  const imageUrl = item.hasImage ? `/api/images/${item.id}?v=${item.updatedAt || ''}` : null
  const stats = calcLaptopStats(item)
  const pct = Math.round((stats.monthsElapsed / 36) * 100)

  return (
    <div className="group relative overflow-hidden rounded-2xl" style={{ minHeight: '280px' }}>
      {/* Background */}
      <ImageUploadTrigger id={item.id} hasImage={item.hasImage} onUpload={data => onUploadImage(item.id, data)}>
        {imageUrl ? (
          <img src={imageUrl} alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: 'brightness(0.5)' }} />
        ) : (
          <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-900/60 to-slate-800">
            <svg className="h-6 w-6 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-[10px] text-white/30">Click to add image</span>
          </div>
        )}
      </ImageUploadTrigger>
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Apply toggle — top left */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
        <Toggle checked={item.applied} onChange={v => onUpdate(item.id, { applied: v })} />
        <span className={`text-[10px] font-semibold drop-shadow ${item.applied ? 'text-emerald-300' : 'text-white/40'}`}>
          {item.applied ? 'Applied' : 'Off'}
        </span>
      </div>

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-4" style={{ minHeight: '280px' }}>
        <InlineEdit
          value={item.name}
          onChange={name => onUpdate(item.id, { name })}
          placeholder="Laptop name"
          className="block text-base font-bold text-white drop-shadow"
        />

        {/* Specs row */}
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          {[['RAM', 'ram'], ['SSD', 'ssd'], ['GPU', 'gpu'], ['CPU', 'processor']].map(([label, key]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-white/40 shrink-0">{label}:</span>
              <InlineEdit
                value={item[key]}
                onChange={val => onUpdate(item.id, { [key]: val })}
                placeholder="—"
                className="text-white/70 truncate"
              />
            </div>
          ))}
        </div>

        {/* Amount row */}
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 text-white/60">
            <span>Total: $</span>
            <InlineEdit
              value={String(item.totalAmount)}
              onChange={totalAmount => onUpdate(item.id, { totalAmount })}
              placeholder="0" type="number" step="1"
              className="w-16 text-white font-semibold"
            />
          </div>
          <span className="text-emerald-300 font-semibold">{fmtUSD(item.monthlyAmount)}/mo × 36</span>
        </div>

        {/* Start date */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/50">
          <span>Start:</span>
          <input
            type="month" value={item.startDate}
            onChange={e => onUpdate(item.id, { startDate: e.target.value })}
            className="rounded bg-black/30 px-1.5 py-0.5 text-white/80 text-[11px] outline-none ring-1 ring-transparent focus:ring-white/30"
          />
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/40">
          <span>Month {stats.monthsElapsed} of 36</span>
          <span>{pct}% complete</span>
        </div>

        {/* Stats */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-wide">Reimbursed</p>
            <p className="text-[11px] font-bold text-emerald-400">{fmtUSD(stats.totalReimbursed)}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-wide">Remaining</p>
            <p className="text-[11px] font-bold text-amber-400">{fmtUSD(stats.remaining)}</p>
          </div>
          <div>
            <p className="text-[9px] text-white/40 uppercase tracking-wide">Months left</p>
            <p className="text-[11px] font-bold text-white">{stats.monthsLeft}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── main panel ────────────────────────────────────────────────────────────────

export default function ReimbursementsPanel({
  aiItems, laptopItems,
  onAddAI, onUpdateAI, onDeleteAI, onUploadAILogo,
  onAddLaptop, onUpdateLaptop, onDeleteLaptop, onUploadLaptopImage,
}) {
  const [open, setOpen] = useLocalStorage('pp-reimb-open', true)

  const appliedAI = aiItems.filter(i => i.applied)
  const appliedLaptops = laptopItems.filter(i => i.applied)
  const totalAI = appliedAI.reduce((s, i) => s + i.amount, 0)
  const totalLaptop = appliedLaptops.reduce((s, i) => s + i.monthlyAmount, 0)

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Reimbursements</h3>
            {(appliedAI.length > 0 || appliedLaptops.length > 0) && (
              <p className="text-xs text-slate-400">
                {appliedAI.length > 0 && <span className="text-violet-400">{fmtUSD(totalAI)}/mo AI</span>}
                {appliedAI.length > 0 && appliedLaptops.length > 0 && <span className="mx-1">·</span>}
                {appliedLaptops.length > 0 && <span className="text-emerald-400">{fmtUSD(totalLaptop)}/mo laptop</span>}
              </p>
            )}
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5 space-y-5">

          {/* AI Subscriptions */}
          <section className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">AI Subscriptions</h4>
                {appliedAI.length > 0 && (
                  <p className="text-[11px] text-violet-400">{appliedAI.length} applied · {fmtUSD(totalAI)}/mo</p>
                )}
              </div>
              <button
                onClick={() => onAddAI({ name: 'New Provider', amount: 10 })}
                className="flex items-center gap-1 rounded-lg bg-violet-500/15 px-2.5 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/25 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {aiItems.length === 0 && (
              <p className="text-xs text-slate-500 italic">No AI subscriptions yet.</p>
            )}

            <div className="space-y-2">
              {aiItems.map(item => (
                <AICard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdateAI}
                  onDelete={onDeleteAI}
                  onUploadLogo={onUploadAILogo}
                />
              ))}
            </div>
          </section>

          {/* Laptop */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Laptop</h4>
                {appliedLaptops.length > 0 && (
                  <p className="text-[11px] text-emerald-400">{fmtUSD(totalLaptop)}/mo · 36-month plan</p>
                )}
              </div>
              <button
                onClick={() => onAddLaptop({ name: 'New Laptop', totalAmount: 0 })}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {laptopItems.length === 0 && (
              <p className="text-xs text-slate-500 italic">No laptop reimbursement yet.</p>
            )}

            <div className="space-y-3">
              {laptopItems.map(item => (
                <LaptopCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdateLaptop}
                  onDelete={onDeleteLaptop}
                  onUploadImage={onUploadLaptopImage}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
