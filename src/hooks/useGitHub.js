import { useState, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

const HIDDEN_KEY = 'pp-gh-hidden'
const PINNED_KEY = 'pp-gh-pinned'

export function useGitHub() {
  const [token, setToken] = useLocalStorage('pp-github-token', '')
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState(null)
  const [hidden, setHidden] = useLocalStorage(HIDDEN_KEY, [])
  const [pinned, setPinned] = useLocalStorage(PINNED_KEY, [])

  const fetchRepos = useCallback(async (tok = token) => {
    if (!tok) return
    setLoading(true)
    setError(null)
    try {
      const [userRes, repoRes] = await Promise.all([
        fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' },
        }),
        fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
          headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' },
        }),
      ])
      if (!userRes.ok || !repoRes.ok) throw new Error('Invalid token or GitHub API error')
      const [user, data] = await Promise.all([userRes.json(), repoRes.json()])
      setUsername(user.login)
      setRepos(data)
    } catch (e) {
      setError(e.message)
      setRepos([])
      setUsername(null)
    }
    setLoading(false)
  }, [token])

  const saveToken = useCallback((tok) => {
    setToken(tok)
    if (tok) fetchRepos(tok)
    else { setRepos([]); setUsername(null) }
  }, [setToken, fetchRepos])

  const clearToken = useCallback(() => {
    setToken('')
    setRepos([])
    setUsername(null)
    setError(null)
  }, [setToken])

  const toggleHide = useCallback((id) => {
    setHidden(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [setHidden])

  const togglePin = useCallback((id) => {
    setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [setPinned])

  return { token, repos, loading, error, username, hidden, pinned, saveToken, clearToken, fetchRepos, toggleHide, togglePin }
}
