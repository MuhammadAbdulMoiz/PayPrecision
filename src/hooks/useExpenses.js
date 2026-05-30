import { useState, useEffect, useCallback } from 'react'

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function useExpenses() {
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    fetch('/api/expenses')
      .then((r) => r.json())
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const addExpense = useCallback(async (data) => {
    const entry = {
      id: genId(),
      name: data.name,
      category: data.category,
      amount: Number(data.amount) || 0,
      month: data.month,
      note: data.note || '',
      recurring: data.recurring || false,
    }
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {})
    setExpenses((prev) => [entry, ...prev])
  }, [])

  const updateExpense = useCallback(async (id, data) => {
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {})
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, ...data } : e))
  }, [])

  const deleteExpense = useCallback(async (id) => {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' }).catch(() => {})
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // Auto-populate recurring expenses into a new month
  const populateRecurring = useCallback(async (targetMonth) => {
    const recurring = expenses.filter((e) => e.recurring)
    const alreadyInMonth = expenses.filter((e) => e.month === targetMonth).map((e) => e.name)
    const toAdd = recurring.filter((e) => !alreadyInMonth.includes(e.name))
    for (const r of toAdd) {
      const entry = {
        id: genId(),
        name: r.name,
        category: r.category,
        amount: r.amount,
        month: targetMonth,
        note: r.note,
        recurring: true,
      }
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {})
      setExpenses((prev) => [entry, ...prev])
    }
    return toAdd.length
  }, [expenses])

  return { expenses, addExpense, updateExpense, deleteExpense, populateRecurring }
}
