import { useCallback, useMemo, useEffect } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useWorkingDays } from './hooks/useWorkingDays'
import { calculateSalary } from './utils/calculate'

import { useHistory } from './hooks/useHistory'
import { useReimbursements } from './hooks/useReimbursements'

import { downloadInvoice, downloadAnnualReport } from './utils/pdf'

import Header from './components/Header'
import SummaryCard from './components/SummaryCard'
import BaseParameters from './components/BaseParameters'
import VariablesAdjustments from './components/VariablesAdjustments'
import WageArchitecture from './components/WageArchitecture'
import ResultsPanel from './components/ResultsPanel'
import FormulaPanel from './components/FormulaPanel'
import BottomNav from './components/BottomNav'
import HistoryPanel from './components/HistoryPanel'
import GoalsPage from './components/GoalsPage'
import InsightsPage from './components/InsightsPage'
import SettingsPage from './components/SettingsPage'
import ReimbursementsPanel from './components/ReimbursementsPanel'
import CareerPage from './components/CareerPage'

const DEFAULTS = {
  employeeType: 'intern',
  income: '106.34',
  dollarRate: '270',
  fixedWorkingDays: '21.75',
  extraDays: '0',
  leaveDays: '0',
  workingDayMode: 'fixed',
  selectedMonth: new Date().toISOString().slice(0, 7),
  publicHolidays: '0',
  theme: 'dark',
}

function validate(income, dollarRate, workingDays, extraDays, leaveDays, publicHolidays, dynamicWorkingDays, workingDayMode) {
  const errors = {}

  const checkNum = (val) => {
    const n = parseFloat(val)
    if (val === '' || isNaN(n)) return 'Please enter a valid number'
    if (n < 0) return 'Value cannot be negative'
    return null
  }

  errors.income = checkNum(income)
  errors.dollarRate = checkNum(dollarRate)
  errors.extraDays = checkNum(extraDays)
  errors.leaveDays = checkNum(leaveDays)

  const wd = parseFloat(workingDays)
  if (isNaN(wd) || workingDays === '') {
    errors.workingDays = 'Please enter a valid number'
  } else if (wd < 0) {
    errors.workingDays = 'Value cannot be negative'
  } else if (wd === 0) {
    errors.workingDays = 'Must be greater than 0'
  }

  if (workingDayMode === 'dynamic') {
    const ph = parseFloat(publicHolidays)
    if (!isNaN(ph) && ph > dynamicWorkingDays + ph) {
      errors.holidays = 'Holidays exceed available working days'
    }
  }

  return errors
}

export default function App() {
  const [activeTab, setActiveTab] = useLocalStorage('pp-tab', 'calculator')
  const [employeeType, setEmployeeType] = useLocalStorage('pp-empType', DEFAULTS.employeeType)
  const [income, setIncome] = useLocalStorage('pp-income', DEFAULTS.income)
  const [dollarRate, setDollarRate] = useLocalStorage('pp-rate', DEFAULTS.dollarRate)
  const [fixedWorkingDays, setFixedWorkingDays] = useLocalStorage('pp-fixedDays', DEFAULTS.fixedWorkingDays)
  const [extraDays, setExtraDays] = useLocalStorage('pp-extraDays', DEFAULTS.extraDays)
  const [leaveDays, setLeaveDays] = useLocalStorage('pp-leaveDays', DEFAULTS.leaveDays)
  const [workingDayMode, setWorkingDayMode] = useLocalStorage('pp-dayMode', DEFAULTS.workingDayMode)
  const [selectedMonth, setSelectedMonth] = useLocalStorage('pp-month', DEFAULTS.selectedMonth)
  const [publicHolidays, setPublicHolidays] = useLocalStorage('pp-holidays', DEFAULTS.publicHolidays)
  const [theme, setTheme] = useLocalStorage('pp-theme', DEFAULTS.theme)
  const [rawAttendance, setAttendanceBonuses] = useLocalStorage('pp-attendance', [])
  const [globalCurrency, setGlobalCurrency] = useLocalStorage('pp-currency', 'PKR')
  const [bonus1Month, setBonus1Month] = useLocalStorage('pp-bonus1m', 4000)
  const [bonus1MonthCurrency, setBonus1MonthCurrency] = useLocalStorage('pp-bonus1m-cur', 'PKR')
  const [enabledPages, setEnabledPages] = useLocalStorage('pp-pages', { history: true, goals: true, insights: false, career: false })
  const [annualBonus, setAnnualBonus] = useLocalStorage('pp-annual-bonus', '')
  const [annualBonusCurrency, setAnnualBonusCurrency] = useLocalStorage('pp-annual-bonus-cur', 'PKR')
  const [annualBonusMode, setAnnualBonusMode] = useLocalStorage('pp-annual-bonus-mode', 'fixed')
  const attendanceBonuses = Array.isArray(rawAttendance) ? rawAttendance : []

  const { entries, addEntry, clearHistory, deleteEntry } = useHistory()
  const {
    aiItems, laptopItems,
    addAI, updateAI, deleteAI, uploadAILogo,
    addLaptop, updateLaptop, deleteLaptop, uploadLaptopImage,
  } = useReimbursements()

  const parsedRate = parseFloat(dollarRate) || 1
  const bonus1PKR = bonus1MonthCurrency === 'USD'
    ? (Number(bonus1Month) || 0) * parsedRate
    : (Number(bonus1Month) || 0)
  const BONUS_MAP = { '1month': bonus1PKR, '3months': 10000, '6months': 20000 }
  const bonusAmount = attendanceBonuses.reduce((sum, key) => sum + (BONUS_MAP[key] || 0), 0)

  const dynamicWorkingDays = useWorkingDays(selectedMonth, parseFloat(publicHolidays) || 0)

  const workingDays = workingDayMode === 'fixed'
    ? parseFloat(fixedWorkingDays)
    : dynamicWorkingDays

  const errors = useMemo(
    () => validate(income, dollarRate, workingDays, extraDays, leaveDays, publicHolidays, dynamicWorkingDays, workingDayMode),
    [income, dollarRate, workingDays, extraDays, leaveDays, publicHolidays, dynamicWorkingDays, workingDayMode]
  )

  const isValid = !errors.income && !errors.dollarRate && !errors.workingDays && !errors.extraDays && !errors.leaveDays

  const results = useMemo(() => {
    if (!isValid) return { monthlyPKR: 0, dailyWage: 0, overtimeRate: 0, extraPay: 0, leaveDeduction: 0, offsetDays: 0, remainingExtra: 0, remainingLeave: 0, attendanceBonus: 0, providentFund: 0, finalSalary: 0 }
    return calculateSalary({
      income: parseFloat(income),
      dollarRate: parseFloat(dollarRate),
      workingDays,
      extraDays: parseFloat(extraDays),
      leaveDays: parseFloat(leaveDays),
      attendanceBonus: bonusAmount,
      empType: employeeType,
    })
  }, [isValid, income, dollarRate, workingDays, extraDays, leaveDays, bonusAmount, employeeType])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const handleEmployeeTypeChange = useCallback((type) => {
    setEmployeeType(type)
    if (type === 'intern') setIncome('106.34')
    else setIncome('')
  }, [setEmployeeType, setIncome])

  const handleThemeToggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [setTheme])

  const handleCurrencyToggle = useCallback(() => {
    setGlobalCurrency((c) => (c === 'PKR' ? 'USD' : 'PKR'))
  }, [setGlobalCurrency])

  const handleReset = useCallback(() => {
    setEmployeeType(DEFAULTS.employeeType)
    setIncome(DEFAULTS.income)
    setDollarRate(DEFAULTS.dollarRate)
    setFixedWorkingDays(DEFAULTS.fixedWorkingDays)
    setExtraDays(DEFAULTS.extraDays)
    setLeaveDays(DEFAULTS.leaveDays)
    setWorkingDayMode(DEFAULTS.workingDayMode)
    setPublicHolidays(DEFAULTS.publicHolidays)
    setAttendanceBonuses([])
  }, [setEmployeeType, setIncome, setDollarRate, setFixedWorkingDays, setExtraDays, setLeaveDays, setWorkingDayMode, setPublicHolidays, setAttendanceBonuses])

  const annualBonusPKR = annualBonusMode === 'percent'
    ? (parseFloat(annualBonus) / 100) * results.monthlyPKR * 12
    : annualBonusCurrency === 'USD'
      ? (parseFloat(annualBonus) || 0) * parsedRate
      : (parseFloat(annualBonus) || 0)

  const reimbursementUSD = [
    ...aiItems.filter(i => i.applied).map(i => i.amount),
    ...laptopItems.filter(i => i.applied).map(i => i.monthlyAmount),
  ].reduce((s, v) => s + v, 0)
  const reimbursementPKR = reimbursementUSD * parsedRate
  const totalEarnings = results.finalSalary + reimbursementPKR + annualBonusPKR

  const handleDownloadInvoice = useCallback(() => {
    if (!isValid) return
    downloadInvoice(
      results,
      { employeeType, income, dollarRate, workingDays, extraDays, leaveDays },
      { aiItems, laptopItems },
      { amountPKR: annualBonusPKR, mode: annualBonusMode, percentValue: annualBonus, currency: annualBonusCurrency },
    )
  }, [isValid, results, employeeType, income, dollarRate, workingDays, extraDays, leaveDays, aiItems, laptopItems, annualBonusPKR, annualBonusMode, annualBonus, annualBonusCurrency])

  const handleDownloadReport = useCallback(() => {
    downloadAnnualReport(entries)
  }, [entries])

  const handleSaveToHistory = useCallback(() => {
    if (!isValid) return
    addEntry(
      { employeeType, income, dollarRate, workingDays, extraDays, leaveDays, attendanceBonus: bonusAmount },
      { ...results, reimbursementPKR, annualBonusPKR, totalEarnings },
    )
  }, [isValid, addEntry, employeeType, income, dollarRate, workingDays, extraDays, leaveDays, bonusAmount, results, reimbursementPKR, annualBonusPKR, totalEarnings])

  const parsedDollarRate = parsedRate

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] transition-colors light:from-[#f0f4ff] light:to-[#e2e8f0]">
      <div className="mx-auto max-w-5xl">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDark={theme === 'dark'}
          onThemeToggle={handleThemeToggle}
          enabledPages={enabledPages}
        />

        {activeTab === 'calculator' && (
          <main className="space-y-4 px-6 pb-8">
            <SummaryCard
              finalSalary={totalEarnings}
              isValid={isValid}
              globalCurrency={globalCurrency}
              dollarRate={parsedDollarRate}
              onGlobalToggle={handleCurrencyToggle}
            />

            <div className="grid gap-4 md:grid-cols-2 items-start">
              <div className="space-y-4">
                <BaseParameters
                  employeeType={employeeType}
                  onEmployeeTypeChange={handleEmployeeTypeChange}
                  income={income}
                  onIncomeChange={setIncome}
                  dollarRate={dollarRate}
                  onDollarRateChange={setDollarRate}
                  workingDayMode={workingDayMode}
                  onWorkingDayModeChange={setWorkingDayMode}
                  fixedWorkingDays={fixedWorkingDays}
                  onFixedWorkingDaysChange={setFixedWorkingDays}
                  selectedMonth={selectedMonth}
                  onSelectedMonthChange={setSelectedMonth}
                  publicHolidays={publicHolidays}
                  onPublicHolidaysChange={setPublicHolidays}
                  dynamicWorkingDays={dynamicWorkingDays}
                  errors={errors}
                />

                <VariablesAdjustments
                  extraDays={extraDays}
                  onExtraDaysChange={setExtraDays}
                  leaveDays={leaveDays}
                  onLeaveDaysChange={setLeaveDays}
                  attendanceBonuses={attendanceBonuses}
                  onAttendanceBonusesChange={setAttendanceBonuses}
                  bonus1Month={bonus1Month}
                  onBonus1MonthChange={setBonus1Month}
                  bonus1MonthCurrency={bonus1MonthCurrency}
                  onBonus1MonthCurrencyChange={setBonus1MonthCurrency}
                  dollarRate={parsedDollarRate}
                  errors={errors}
                  annualBonus={annualBonus}
                  onAnnualBonusChange={setAnnualBonus}
                  annualBonusCurrency={annualBonusCurrency}
                  onAnnualBonusCurrencyChange={setAnnualBonusCurrency}
                  annualBonusMode={annualBonusMode}
                  onAnnualBonusModeChange={setAnnualBonusMode}
                  baseSalaryPKR={results.monthlyPKR}
                  dollarRate={parsedDollarRate}
                />
              </div>

              <div className="space-y-4">
                <ReimbursementsPanel
                  aiItems={aiItems}
                  laptopItems={laptopItems}
                  onAddAI={addAI}
                  onUpdateAI={updateAI}
                  onDeleteAI={deleteAI}
                  onUploadAILogo={uploadAILogo}
                  onAddLaptop={addLaptop}
                  onUpdateLaptop={updateLaptop}
                  onDeleteLaptop={deleteLaptop}
                  onUploadLaptopImage={uploadLaptopImage}
                />

                <WageArchitecture
                  dailyWage={results.dailyWage}
                  overtimeRate={results.overtimeRate}
                  isValid={isValid}
                  globalCurrency={globalCurrency}
                  dollarRate={parsedDollarRate}
                  aiItems={aiItems}
                  laptopItems={laptopItems}
                  annualBonusPKR={annualBonusPKR}
                  annualBonusMode={annualBonusMode}
                  annualBonusValue={annualBonus}
                />

                <ResultsPanel
                  results={results}
                  isValid={isValid}
                  globalCurrency={globalCurrency}
                  dollarRate={parsedDollarRate}
                  employeeType={employeeType}
                />

                <BottomNav
                  onReset={handleReset}
                  onCopy={() => {}}
                  finalSalary={results.finalSalary}
                  isValid={isValid}
                />

                <button
                  onClick={handleSaveToHistory}
                  disabled={!isValid}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 disabled:opacity-50 disabled:shadow-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save to History
                </button>

                <button
                  onClick={handleDownloadInvoice}
                  disabled={!isValid}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 py-3 text-sm font-semibold text-blue-400 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3" />
                  </svg>
                  Download Invoice
                </button>
              </div>
            </div>

            <FormulaPanel
              results={results}
              isValid={isValid}
              currency={globalCurrency}
              dollarRate={parsedDollarRate}
              employeeType={employeeType}
              reimbursementPKR={reimbursementPKR}
              aiItems={aiItems}
              laptopItems={laptopItems}
              annualBonusPKR={annualBonusPKR}
              annualBonusMode={annualBonusMode}
              annualBonusValue={annualBonus}
            />

            <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 p-3">
              <svg className="h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4m0-4h.01" />
              </svg>
              <p className="text-xs text-blue-300 light:text-blue-600">
                Rates are calculated based on your active employment contract and recent regional fiscal adjustments.
              </p>
            </div>
          </main>
        )}

        {activeTab === 'history' && (
          <main className="px-6 pb-8">
            <HistoryPanel
              entries={entries}
              onClear={clearHistory}
              onDelete={deleteEntry}
              onDownloadReport={handleDownloadReport}
            />
          </main>
        )}

        {activeTab === 'goals' && (
          <main className="px-6 pb-8">
            <GoalsPage finalSalary={results.finalSalary} />
          </main>
        )}

        {activeTab === 'insights' && enabledPages?.insights && (
          <main className="px-6 pb-8">
            <InsightsPage entries={entries} finalSalary={results.finalSalary} />
          </main>
        )}

        {activeTab === 'career' && enabledPages?.career && (
          <main className="px-6 pb-8">
            <CareerPage />
          </main>
        )}

        {activeTab === 'settings' && (
          <main className="px-6 pb-8">
            <SettingsPage
              enabledPages={enabledPages}
              onEnabledPagesChange={setEnabledPages}
              onTabChange={setActiveTab}
            />
          </main>
        )}
      </div>
    </div>
  )
}
