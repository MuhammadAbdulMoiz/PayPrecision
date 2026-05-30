import ToggleSwitch from './ToggleSwitch'

const TABS = ['Calculator', 'History', 'Goals']

export default function Header({ activeTab, onTabChange, isDark, onThemeToggle, enabledPages }) {
  const visibleTabs = TABS.filter((t) => {
    if (t === 'Calculator') return true
    return enabledPages?.[t.toLowerCase()] !== false
  })

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <h1 className="text-lg font-bold tracking-tight text-white light:text-slate-800">
        PayPrecision
      </h1>

      <nav className="flex gap-1 rounded-lg bg-white/5 p-1 light:bg-slate-200">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab.toLowerCase())}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.toLowerCase()
                ? 'bg-white/15 text-white shadow-sm light:bg-white light:text-slate-800'
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
        {enabledPages?.insights && (
          <button
            onClick={() => onTabChange('insights')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'insights'
                ? 'bg-white/15 text-white shadow-sm light:bg-white light:text-slate-800'
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-700'
            }`}
          >
            Insights
          </button>
        )}
        {enabledPages?.career && (
          <button
            onClick={() => onTabChange('career')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'career'
                ? 'bg-white/15 text-white shadow-sm light:bg-white light:text-slate-800'
                : 'text-slate-400 hover:text-slate-200 light:text-slate-500 light:hover:text-slate-700'
            }`}
          >
            Career
          </button>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <ToggleSwitch isDark={isDark} onToggle={onThemeToggle} />
        <button
          onClick={() => onTabChange('settings')}
          aria-label="Settings"
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            activeTab === 'settings' ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10'
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  )
}
