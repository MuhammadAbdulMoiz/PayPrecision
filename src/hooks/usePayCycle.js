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

export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Pay-cycle config: which day of the month salary normally lands, and the
 * derived cycle window / countdown. Pure date math — no money is tracked here
 * (see useCashLedger for the actual available-cash ledger).
 */
export function usePayCycle() {
  const [payDay, setPayDayRaw] = useLocalStorage('pp-payday', 1)

  const setPayDay = (d) => {
    const n = Math.min(Math.max(Math.round(Number(d) || 1), 1), 31)
    setPayDayRaw(n)
  }

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

    return {
      today,
      currentCycleStart,
      nextPayDate,
      daysUntilNextPay,
      thisMonthKey: monthKeyOf(today),
    }
  }, [payDay])

  return { payDay, setPayDay, ...computed }
}

// Short label like "Jul 15" for a Date.
export function fmtShortDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return ''
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}
