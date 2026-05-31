import { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import { useLoans } from '../hooks/useLoans'
import { useAssets } from '../hooks/useAssets'
import { useExpenses } from '../hooks/useExpenses'
import GoalsDashboard from './GoalsDashboard'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'
import ExpenseTracker from './ExpenseTracker'
import LoansSection from './LoansSection'
import AssetsSection from './AssetsSection'
import AffordabilityTool from './AffordabilityTool'
import SavingsAccelerator from './SavingsAccelerator'

export default function GoalsPage({ finalSalary, dailyWage = 0 }) {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals()
  const { loans, addLoan, updateLoan, deleteLoan, uploadLoanImage } = useLoans()
  const { assets, addAsset, updateAsset, deleteAsset, uploadAssetImage } = useAssets()
  const { expenses } = useExpenses()
  const [showForm, setShowForm] = useState(false)
  const [showAllGoals, setShowAllGoals] = useState(false)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyExpenses = expenses
    .filter(e => e.month === currentMonth)
    .reduce((s, e) => s + (e.amount || 0), 0)

  const handleAddGoal = (data) => {
    addGoal(data)
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h2 className="text-2xl font-extrabold text-white light:text-slate-800">Financial Goals</h2>
          <p className="mt-1 text-sm text-slate-400 light:text-slate-500">
            Save toward what matters. Each goal has its own savings rate.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add Goal
        </button>
      </div>

      {/* Dashboard */}
      {goals.length > 0 && (
        <GoalsDashboard goals={goals} finalSalary={finalSalary} />
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="glass flex flex-col items-center gap-4 rounded-2xl p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-300">No goals yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first goal — a laptop, bike, or anything you&apos;re saving for.</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
            Create your first goal
          </button>
        </div>
      )}

      {/* Goals grid — active first, completed last */}
      {goals.length > 0 && (() => {
        const ordered = [
          ...goals.filter(g => (g.savedAmount || 0) < (g.targetAmount || 1)),
          ...goals.filter(g => (g.savedAmount || 0) >= (g.targetAmount || 1)),
        ]
        const visible = showAllGoals ? ordered : ordered.slice(0, 3)
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
              {visible.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={deleteGoal}
                  onUpdate={updateGoal}
                  finalSalary={finalSalary}
                  linkedLoans={loans.filter(l => l.goalId === goal.id)}
                  onAddAsset={addAsset}
                  assets={assets}
                />
              ))}
            </div>
            {ordered.length > 3 && (
              <button onClick={() => setShowAllGoals(v => !v)}
                className="mt-3 w-full rounded-xl border border-white/10 py-2 text-sm text-slate-400 transition-colors hover:border-white/20 hover:text-white">
                {showAllGoals ? '▲ Show less' : `▼ Show ${ordered.length - 3} more goal${ordered.length - 3 !== 1 ? 's' : ''}`}
              </button>
            )}
          </>
        )
      })()}

      {/* Owned Items / Assets */}
      <AssetsSection
        assets={assets}
        onAdd={addAsset}
        onUpdate={updateAsset}
        onDelete={deleteAsset}
        onUploadImage={uploadAssetImage}
      />

      {/* Loan Tracker */}
      <LoansSection
        goals={goals}
        loans={loans}
        onAdd={addLoan}
        onUpdate={updateLoan}
        onDelete={deleteLoan}
        onUploadImage={uploadLoanImage}
      />

      {/* Affordability Tool */}
      <AffordabilityTool
        finalSalary={finalSalary}
        dailyWage={dailyWage}
        goals={goals}
        monthlyExpenses={monthlyExpenses}
        totalAvailable={finalSalary + loans.filter(l => l.status !== 'paid' && !l.goalId && (l.currency === 'PKR' || !l.currency)).reduce((s, l) => s + (l.remaining || 0), 0)}
      />

      {/* Savings Accelerator */}
      <SavingsAccelerator goals={goals} finalSalary={finalSalary} />

      {/* Expense Tracker */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-white light:text-slate-800">Expense Tracker</h3>
        <ExpenseTracker finalSalary={finalSalary} loans={loans} />
      </div>

      {showForm && (
        <GoalForm onSubmit={handleAddGoal} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
