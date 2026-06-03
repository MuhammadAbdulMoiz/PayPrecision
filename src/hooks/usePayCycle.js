import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'

const DAY_MS = 86_400_000

// Resolve the salary date for a given month, clamping the configured pay day to
// the last day of that month (so pay day 31 lands on Feb 28/29, etc.).
// monthIndex may overflow/underflow (e.g. -1 or 12) — Date normalises it.
function payDateFor(year, monthIndex, payDay) {
  const probe = new Date(year, monthIndex, 1)
  const y = probe.getFullYear()
  const m = probe.getMonth()
  const lastDay = new Date(y, m + 1, 0).getDate()
  const d = new Date(y, m, Math.min(payDay, lastDay))
  d.setHours(0, 0, 0, 0)
  return d
}

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Pay-cycle config shared across the app.
 *
 * - payDay: day of the month salary is normally credited (1–31, default 1).
 * - credits: { 'YYYY-MM': 'YYYY-MM-DD' } — actual credited date per month, for
 *   when pay is delayed and the user records when it really landed.
 *
 * Derived: the current cycle runs from the most recent pay day up to the next
 * one, and `daysUntilNextPay` is how long current cash has to last.
 */
export function usePayCycle() {
  const [payDay, setPayDayRaw] = useLocalStorage('pp-payday', 1)
  const [credits, setCredits] = useLocalStorage('pp-salary-credits', {})

  const setPayDay = (d) => {
    const n = Math.min(Math.max(Math.round(Number(d) || 1), 1), 31)
    setPayDayRaw(n)
  }

  const setCredit = (monthKey, dateStr) =>
    setCredits((prev) => ({ ...(prev || {}), [monthKey]: dateStr }))

  const clearCredit = (monthKey) =>
    setCredits((prev) => {
      const next = { ...(prev || {}) }
      delete next[monthKey]
      return next
    })

  const computed = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const y = today.getFullYear()
    const mo = today.getMonth()
    const thisMonthPay = payDateFor(y, mo, payDay)

    let currentCycleStart
    let nextPayDate
    if (today.getTime() >= thisMonthPay.getTime()) {
      currentCycleStart = thisMonthPay
      nextPayDate = payDateFor(y, mo + 1, payDay)
    } else {
      currentCycleStart = payDateFor(y, mo - 1, payDay)
      nextPayDate = thisMonthPay
    }

    const daysUntilNextPay = Math.max(Math.round((nextPayDate - today) / DAY_MS), 1)
    const cycleLength = Math.max(Math.round((nextPayDate - currentCycleStart) / DAY_MS), 1)
    const cycleElapsed = Math.min(Math.max(Math.round((today - currentCycleStart) / DAY_MS), 0), cycleLength)

    return {
      today,
      currentCycleStart,
      nextPayDate,
      daysUntilNextPay,
      cycleLength,
      cycleElapsed,
      thisMonthKey: monthKeyOf(today),
    }
  }, [payDay])

  return { payDay, setPayDay, credits: credits || {}, setCredit, clearCredit, ...computed }
}

// Short label like "Jul 15" for a Date.
export function fmtShortDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return ''
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}
