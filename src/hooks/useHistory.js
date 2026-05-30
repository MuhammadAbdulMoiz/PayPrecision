import { useState, useEffect, useCallback } from 'react'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function useHistory() {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {})
  }, [])

  const addEntry = useCallback(async (params, results) => {
    const entry = {
      id: genId(),
      date: new Date().toISOString(),
      params: { ...params },
      results: { ...results },
    }
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {})
    setEntries((prev) => [entry, ...prev].slice(0, 50))
  }, [])

  const clearHistory = useCallback(async () => {
    await fetch('/api/history', { method: 'DELETE' }).catch(() => {})
    setEntries([])
  }, [])

  const deleteEntry = useCallback(async (id) => {
    await fetch(`/api/history/${id}`, { method: 'DELETE' }).catch(() => {})
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateEntryDate = useCallback(async (id, date) => {
    await fetch(`/api/history/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }).catch(() => {})
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, date } : e))
  }, [])

  return { entries, addEntry, clearHistory, deleteEntry, updateEntryDate }
}
