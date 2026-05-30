import { useState } from 'react'
import { useGitHub } from '../hooks/useGitHub'
import { useCertifications } from '../hooks/useCertifications'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeSince(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C#': '#178600',
  'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Vue: '#41b883', Svelte: '#ff3e00', Dart: '#00B4AB',
}

// ─── GitHub section ──────────────────────────────────────────────────────────

function RepoCard({ repo, pinned, hidden, onPin, onHide }) {
  const langColor = LANG_COLORS[repo.language] || '#64748b'
  const isPinned = pinned.includes(repo.id)
  const isHidden = hidden.includes(repo.id)

  if (isHidden) return null

  return (
    <div className={`group relative rounded-2xl border p-4 transition-all ${
      isPinned ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate">
              {repo.name}
            </a>
            {repo.private && (
              <span className="rounded-full border border-slate-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Private</span>
            )}
            {isPinned && (
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">Pinned</span>
            )}
          </div>
          {repo.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{repo.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {repo.language && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: langColor }} />
                {repo.language}
              </span>
            )}
            {repo.stargazers_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                </svg>
                {repo.stargazers_count}
              </span>
            )}
            <span className="text-[11px] text-slate-500">Updated {timeSince(repo.pushed_at)}</span>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onPin(repo.id)} title={isPinned ? 'Unpin' : 'Pin'}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-colors ${
              isPinned ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-blue-600 hover:text-white'
            }`}>
            📌
          </button>
          <button onClick={() => onHide(repo.id)} title="Hide"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-slate-400 hover:bg-red-600 hover:text-white transition-colors text-[10px]">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function GitHubSection() {
  const { token, repos, loading, error, username, hidden, pinned, saveToken, clearToken, fetchRepos, toggleHide, togglePin } = useGitHub()
  const [draft, setDraft] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const visibleRepos = repos.filter(r => !hidden.includes(r.id))
  const hiddenRepos = repos.filter(r => hidden.includes(r.id))
  const pinnedFirst = [
    ...visibleRepos.filter(r => pinned.includes(r.id)),
    ...visibleRepos.filter(r => !pinned.includes(r.id)),
  ]

  const handleConnect = (e) => {
    e.preventDefault()
    if (draft.trim()) saveToken(draft.trim())
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">GitHub Projects</h3>
            <p className="text-xs text-slate-500">Connect with a Personal Access Token to pull your repos</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 space-y-1">
            <p className="font-semibold">How to get a token:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-300/80">
              <li>Go to GitHub → Settings → Developer Settings → Personal access tokens → Tokens (classic)</li>
              <li>Generate new token — only need <strong>read:user</strong> and <strong>repo</strong> scopes</li>
              <li>Paste it below — stored locally on your machine only</li>
            </ol>
          </div>
          <form onSubmit={handleConnect} className="flex gap-2">
            <input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={draft}
              onChange={e => setDraft(e.target.value)} required autoComplete="off"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-400/50" />
            <button type="submit"
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600">
              Connect
            </button>
          </form>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">GitHub Projects</h3>
          {username && <p className="text-xs text-slate-400">@{username} · {repos.length} repos</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchRepos()} disabled={loading}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/20 disabled:opacity-50">
            {loading ? 'Syncing…' : 'Sync'}
          </button>
          <button onClick={clearToken}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10">
            Disconnect
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

      {loading && repos.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-slate-500">Loading repos…</div>
      ) : pinnedFirst.length === 0 && !loading ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-slate-500">No repos found</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pinnedFirst.map(repo => (
            <RepoCard key={repo.id} repo={repo} pinned={pinned} hidden={hidden} onPin={togglePin} onHide={toggleHide} />
          ))}
        </div>
      )}

      {hiddenRepos.length > 0 && (
        <button onClick={() => setShowHidden(v => !v)}
          className="text-[11px] text-slate-600 hover:text-slate-400">
          {showHidden ? '▾ Hide hidden repos' : `▸ Show ${hiddenRepos.length} hidden repo${hiddenRepos.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {showHidden && hiddenRepos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 opacity-50">
          {hiddenRepos.map(repo => (
            <div key={repo.id} className="relative">
              <RepoCard repo={{...repo}} pinned={pinned} hidden={[]} onPin={togglePin} onHide={toggleHide} />
              <button onClick={() => toggleHide(repo.id)}
                className="absolute top-2 right-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white">
                Unhide
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Certifications section ──────────────────────────────────────────────────

function AddCertModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '', issuer: '', dateEarned: '', credentialUrl: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Add Certification</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form) }} className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Certificate Name</label>
            <input type="text" placeholder="e.g. AWS Solutions Architect" required value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Issuer</label>
              <input type="text" placeholder="e.g. Coursera, AWS" value={form.issuer}
                onChange={e => set('issuer', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date Earned</label>
              <input type="month" value={form.dateEarned}
                onChange={e => set('dateEarned', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Credential URL (LinkedIn / Credly / other)</label>
            <input type="url" placeholder="https://linkedin.com/learning/certificates/..." value={form.credentialUrl}
              onChange={e => set('credentialUrl', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
            <input type="text" placeholder="e.g. Valid until 2027, used for job application" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/50" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit"
              className="flex-1 rounded-xl bg-violet-700 py-2 text-sm font-semibold text-white hover:bg-violet-600">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CertCard({ cert, onDelete }) {
  const monthLabel = cert.dateEarned
    ? new Date(cert.dateEarned + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{cert.name}</p>
            <p className="text-xs text-slate-400">{cert.issuer}{monthLabel ? ` · ${monthLabel}` : ''}</p>
          </div>
          <button onClick={() => onDelete(cert.id)}
            className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs">✕</button>
        </div>
        {cert.notes && <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{cert.notes}</p>}
        {cert.credentialUrl && (
          <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300">
            View credential
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

function CertificationsSection() {
  const { certs, addCert, deleteCert } = useCertifications()
  const [showForm, setShowForm] = useState(false)

  const handleAdd = async (data) => {
    await addCert(data)
    setShowForm(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Certifications</h3>
          <p className="text-xs text-slate-500">Courses, certificates, and credentials you&apos;ve earned</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add
        </button>
      </div>

      {certs.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20">
            <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-300">No certifications yet</p>
          <p className="text-xs text-slate-500">Add your LinkedIn Learning, Coursera, AWS, or any other credentials.</p>
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-violet-700 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-600">
            Add your first certification
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {certs.map(cert => (
            <CertCard key={cert.id} cert={cert} onDelete={deleteCert} />
          ))}
        </div>
      )}

      {showForm && <AddCertModal onClose={() => setShowForm(false)} onSubmit={handleAdd} />}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CareerPage() {
  return (
    <div className="space-y-8">
      <div className="pt-2">
        <h2 className="text-2xl font-extrabold text-white">Career</h2>
        <p className="mt-1 text-sm text-slate-400">Your projects, credentials, and professional record.</p>
      </div>

      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-300/80">
        <strong className="text-amber-300">LinkedIn note:</strong> LinkedIn&apos;s API doesn&apos;t allow reading certifications without partner-level approval. Add them manually below and paste the LinkedIn credential URL — it opens directly when you click &quot;View credential&quot;.
      </div>

      <GitHubSection />
      <CertificationsSection />
    </div>
  )
}
