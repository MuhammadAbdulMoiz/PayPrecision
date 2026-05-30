import { useState, useRef } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const ADMIN_TOKEN_KEY = 'pp-admin-token'

function Section({ title, icon, children }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-300">
          {icon}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-white/10'}`}
        role="switch" aria-checked={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function StatusBadge({ type, text }) {
  const styles = {
    success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    error:   'bg-red-500/20 text-red-400 border-red-500/30',
    info:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${styles[type] || styles.info}`}>
      {text}
    </span>
  )
}

const THEMES = [
  { id: 'slate',    name: 'Slate',    desc: 'Default dark blue',      swatch: ['#0f172a', '#1e293b', '#3b82f6'] },
  { id: 'midnight', name: 'Midnight', desc: 'Deep purple dark',       swatch: ['#0a0a14', '#1c1233', '#a78bfa'] },
  { id: 'claude',   name: 'Claude',   desc: 'Warm paper, coral accent', swatch: ['#faf9f5', '#f0ece1', '#d97757'] },
]

function ThemePicker({ theme, onThemeChange }) {
  const current = theme === 'dark' ? 'slate' : theme === 'light' ? 'claude' : theme
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {THEMES.map((t) => {
        const active = current === t.id
        return (
          <button key={t.id} onClick={() => onThemeChange(t.id)}
            className={`rounded-xl border p-3 text-left transition-all ${
              active ? 'border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/30' : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}>
            <div className="mb-2 flex gap-1">
              {t.swatch.map((c, i) => (
                <span key={i} className="h-6 flex-1 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">{t.name}</p>
              {active && (
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <p className="text-[11px] text-slate-500">{t.desc}</p>
          </button>
        )
      })}
    </div>
  )
}

export default function SettingsPage({ enabledPages, onEnabledPagesChange, onTabChange, theme, onThemeChange }) {
  const [adminToken, setAdminToken] = useLocalStorage(ADMIN_TOKEN_KEY, '')
  const [backups, setBackups] = useState([])
  const [status, setStatus] = useState(null) // { type, text }
  const [loading, setLoading] = useState('')
  const fileInputRef = useRef(null)

  const setPage = (key, val) => onEnabledPagesChange((prev) => ({ ...prev, [key]: val }))

  const adminFetch = (path, opts = {}) =>
    fetch(path, {
      ...opts,
      headers: { 'x-admin-token': adminToken, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    })

  const flash = (type, text) => {
    setStatus({ type, text })
    setTimeout(() => setStatus(null), 4000)
  }

  const handleBackup = async () => {
    setLoading('backup')
    try {
      const r = await adminFetch('/admin/backup', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      flash('success', `Backup created: ${d.file} (${(d.size / 1024).toFixed(1)} KB)`)
      handleListBackups()
    } catch (e) { flash('error', e.message) }
    setLoading('')
  }

  const handleListBackups = async () => {
    setLoading('list')
    try {
      const r = await adminFetch('/admin/backups')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setBackups(Array.isArray(d) ? d : [])
    } catch (e) { flash('error', e.message) }
    setLoading('')
  }

  const handleRestore = async (file) => {
    if (!confirm(`Restore from "${file}"?\n\nCurrent DB will be auto-backed up first.`)) return
    setLoading('restore-' + file)
    try {
      const r = await adminFetch('/admin/restore', { method: 'POST', body: JSON.stringify({ file }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      flash('success', `Restored from ${d.restored}. Refresh the page to see restored data.`)
    } catch (e) { flash('error', e.message) }
    setLoading('')
  }

  const handleDeleteBackup = async (file) => {
    if (!confirm(`Delete backup "${file}"?`)) return
    try {
      const r = await adminFetch(`/admin/backups/${encodeURIComponent(file)}`, { method: 'DELETE' })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setBackups((prev) => prev.filter((b) => b.name !== file))
      flash('info', `Deleted ${file}`)
    } catch (e) { flash('error', e.message) }
  }

  const handleMigrate = async () => {
    setLoading('migrate')
    try {
      const r = await adminFetch('/admin/migrate', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      flash('success', d.message || 'Migrations ran successfully')
    } catch (e) { flash('error', e.message) }
    setLoading('')
  }

  // Download a backup file from the server to browser
  const handleDownloadBackup = async (file) => {
    try {
      const r = await fetch(`/admin/backups/${encodeURIComponent(file)}/download`, {
        headers: { 'x-admin-token': adminToken },
      })
      if (!r.ok) throw new Error('Download failed')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = file; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { flash('error', e.message) }
  }

  // Upload a .db file from browser to restore
  const handleUploadRestore = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm(`Upload and restore from "${file.name}"?\n\nCurrent DB will be auto-backed up first.`)) return
    setLoading('upload')
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]
        const r = await adminFetch('/admin/restore-upload', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, data: base64 }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        flash('success', `Restored from uploaded file. Refresh to see data.`)
        setLoading('')
      }
      reader.readAsDataURL(file)
    } catch (e) { flash('error', e.message); setLoading('') }
    e.target.value = ''
  }

  const fmtSize = (bytes) => {
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">Configure pages, manage backups, and control the app.</p>
      </div>

      {/* Status flash */}
      {status && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          status.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
          status.type === 'error'   ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                                      'border-blue-500/30 bg-blue-500/10 text-blue-400'
        }`}>
          <span>{status.type === 'success' ? '✓' : status.type === 'error' ? '✗' : 'ℹ'}</span>
          {status.text}
        </div>
      )}

      {/* Appearance */}
      <Section title="Appearance" icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.73 0l-1.41-1.41M6.34 6.34L4.93 4.93"/>
        </svg>
      }>
        <ThemePicker theme={theme} onThemeChange={onThemeChange} />
      </Section>

      {/* Pages */}
      <Section title="Pages" icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      }>
        <div className="space-y-2">
          <Toggle
            label="History"
            description="Salary history log, projection chart, PDF + CSV export"
            checked={enabledPages?.history !== false}
            onChange={(v) => setPage('history', v)}
          />
          <Toggle
            label="Goals"
            description="Financial goals, deposit log, expense tracker"
            checked={enabledPages?.goals !== false}
            onChange={(v) => setPage('goals', v)}
          />
          <Toggle
            label="Insights"
            description="Expense trends, net worth tracker, salary growth chart"
            checked={!!enabledPages?.insights}
            onChange={(v) => { setPage('insights', v); if (v) onTabChange('insights') }}
          />
          <Toggle
            label="Career"
            description="GitHub projects and certifications tracker"
            checked={!!enabledPages?.career}
            onChange={(v) => { setPage('career', v); if (v) onTabChange('career') }}
          />
        </div>
      </Section>

      {/* Admin token */}
      <Section title="Admin Token" icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      }>
        <p className="mb-3 text-[12px] text-slate-500">
          Enter the <code className="rounded bg-white/10 px-1 text-slate-300">ADMIN_TOKEN</code> set on your container to use backup controls below.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Paste your admin token..."
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/40"
          />
          {adminToken && (
            <StatusBadge type="success" text="Set" />
          )}
        </div>
      </Section>

      {/* Backup controls */}
      <Section title="Database Backup" icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3"/>
        </svg>
      }>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button onClick={handleBackup} disabled={!adminToken || loading === 'backup'}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-40">
            {loading === 'backup' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            )}
            Backup Now
          </button>

          <button onClick={handleListBackups} disabled={!adminToken || loading === 'list'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40">
            {loading === 'list' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
            List Backups
          </button>

          <button onClick={handleMigrate} disabled={!adminToken || loading === 'migrate'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 px-3 py-2.5 text-xs font-semibold text-purple-400 transition-colors hover:bg-purple-500/10 disabled:opacity-40">
            {loading === 'migrate' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400/30 border-t-purple-400" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            )}
            Run Migration
          </button>

          <button onClick={() => fileInputRef.current?.click()} disabled={!adminToken || loading === 'upload'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 px-3 py-2.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-40">
            {loading === 'upload' ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5-5-5 5m5-5v12"/>
              </svg>
            )}
            Import .db
          </button>
          <input ref={fileInputRef} type="file" accept=".db,.sqlite" className="hidden" onChange={handleUploadRestore} />
        </div>

        {/* Backup list */}
        {backups.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>File</span>
              <span>Size</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>
            {backups.map((b) => (
              <div key={b.name}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-white/5 px-4 py-3 text-xs last:border-0 hover:bg-white/[0.02]">
                <span className="truncate font-mono text-[11px] text-slate-300">{b.name}</span>
                <span className="text-slate-500">{fmtSize(b.size)}</span>
                <span className="text-slate-500 whitespace-nowrap">{fmtDate(b.createdAt)}</span>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => handleDownloadBackup(b.name)}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10"
                    title="Download to computer">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3"/>
                    </svg>
                    Export
                  </button>
                  <button onClick={() => handleRestore(b.name)}
                    disabled={loading === 'restore-' + b.name}
                    className="flex items-center gap-1 rounded-lg border border-blue-500/30 px-2 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/10 disabled:opacity-40"
                    title="Restore this backup">
                    {loading === 'restore-' + b.name
                      ? <span className="h-3 w-3 animate-spin rounded-full border border-blue-400/30 border-t-blue-400" />
                      : '↩'} Restore
                  </button>
                  <button onClick={() => handleDeleteBackup(b.name)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-red-500/20 hover:text-red-400"
                    title="Delete backup">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {backups.length === 0 && (
          <p className="rounded-xl bg-white/5 px-4 py-6 text-center text-[12px] text-slate-500">
            Click "List Backups" to see existing backups, or "Backup Now" to create one.
          </p>
        )}
      </Section>

      {/* Cron reference */}
      <Section title="Cron Auto-Backup" icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      }>
        <p className="mb-2 text-[12px] text-slate-500">Add this to your VM's crontab (<code className="text-slate-400">crontab -e</code>) for nightly 2 AM backups:</p>
        <div className="rounded-lg bg-slate-900/60 px-4 py-3 font-mono text-[11px] text-emerald-400 select-all">
          0 2 * * * curl -s -X POST http://localhost:3000/admin/backup -H "x-admin-token: YOUR_TOKEN"
        </div>
      </Section>
    </div>
  )
}
