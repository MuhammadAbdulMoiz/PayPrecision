import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { usePayCycle, monthKeyOf } from './usePayCycle'

// "YYYY-MM" + delta months → "YYYY-MM"
function addMonthKey(key, delta) {
  const [y, m] = key.split('-').map(Number)
  return monthKeyOf(new Date(y, m - 1 + delta, 1))
}

// Normalise a salary-credit record. Older builds stored just the date string;
// we now store { date, amount }.
function normCredit(v) {
  if (!v) return null
  if (typeof v === 'string') return { date: v, amount: null }
  return { date: v.date || null, amount: typeof v.amount === 'number' ? v.amount : null }
}

/**
 * The real available-cash ledger.
 *
 * Money is only "available" once it actually exists:
 *  - startingBalance: cash you carry into the current month. Derived (auto-carry)
 *    from a user-set anchor balance, rolling each past month forward by
 *    (salary credited that month − spent that month).
 *  - salary is added to available cash ONLY for months you've marked credited.
 *
 * Pure derivation (no persisted rollover), so it self-corrects once async
 * expense data loads and never double-counts.
 */
export function useCashLedger(expenses = [], { loanCash = 0 } = {}) {
  const cycle = usePayCycle()
  const thisMonthKey = cycle.thisMonthKey

  const [creditsRaw, setCredits] = useLocalStorage('pp-salary-credits', {})
  // anchor = a known cash balance at the start of anchorMonth
  const [ledger, setLedger] = useLocalStorage('pp-cash-ledger', { anchorMonth: thisMonthKey, anchorBalance: 0 })

  const credits = useMemo(() => creditsRaw || {}, [creditsRaw])

  const spentOf = useMemo(() => {
    const map = {}
    expenses.forEach((e) => { map[e.month] = (map[e.month] || 0) + (e.amount || 0) })
    return (monthKey) => map[monthKey] || 0
  }, [expenses])

  // Carry the anchor balance forward to the current month.
  const startingBalance = useMemo(() => {
    const anchorMonth = ledger?.anchorMonth || thisMonthKey
    let bal = Number(ledger?.anchorBalance) || 0
    if (anchorMonth >= thisMonthKey) return bal
    let m = anchorMonth
    let guard = 0
    while (m < thisMonthKey && guard < 600) {
      const c = normCredit(credits[m])
      bal += (c && c.amount != null ? c.amount : 0) - spentOf(m)
      m = addMonthKey(m, 1)
      guard++
    }
    return bal
  }, [ledger, credits, spentOf, thisMonthKey])

  const credited = normCredit(credits[thisMonthKey])
  const creditedAmount = credited && credited.amount != null ? credited.amount : 0

  const cashOnHand = startingBalance + creditedAmount          // your own money right now
  const availableCash = cashOnHand + loanCash                  // spendable incl. borrowed
  const spentThisMonth = spentOf(thisMonthKey)
  const remaining = availableCash - spentThisMonth

  const setStartingBalance = (n) =>
    setLedger({ anchorMonth: thisMonthKey, anchorBalance: Number(n) || 0 })

  const creditSalary = (amount, date) =>
    setCredits((prev) => ({ ...(prev || {}), [thisMonthKey]: { date, amount: Number(amount) || 0 } }))

  const unCredit = (monthKey = thisMonthKey) =>
    setCredits((prev) => {
      const next = { ...(prev || {}) }
      delete next[monthKey]
      return next
    })

  return {
    ...cycle,
    credits,
    credited,            // { date, amount } | null  (current month)
    isCredited: !!credited,
    startingBalance,
    setStartingBalance,
    creditSalary,
    unCredit,
    cashOnHand,
    availableCash,
    loanCash,
    spentThisMonth,
    remaining,
  }
}
