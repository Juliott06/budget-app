import { useLiveQuery } from 'dexie-react-hooks';
import { db, spendingCategoryKeys } from '../db/database';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { formatCurrency, formatPercent } from '../utils/format';
import { getWeekStart, getCurrentMonth, formatWeekRange, getNextPayDate } from '../utils/dates';
import { DataNotice } from '../components/DataNotice';

export function Dashboard() {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  const activePlan = useLiveQuery(() => db.activePlan.toArray());
  const goals = useLiveQuery(() => db.goals.toArray());
  const weeklyBudget = useLiveQuery(() => db.weeklyBudgets.where('weekStart').equals(getWeekStart()).first());
  const monthlyBudget = useLiveQuery(() => db.monthlyBudgets.where('month').equals(getCurrentMonth()).first());

  if (!accounts || !settings) return <div className="loading">Loading...</div>;

  const s = settings[0];
  const plan = activePlan?.[0];
  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsRate = s.monthlyIncome > 0 ? (s.monthlySaved / s.monthlyIncome) * 100 : 0;

  // Calculate weekly spending progress
  const weeklySpent = weeklyBudget
    ? Object.values(weeklyBudget.categories).reduce((sum, cat) => sum + cat.used, 0)
    : 0;
  const weeklyBudgeted = weeklyBudget
    ? Object.values(weeklyBudget.categories).reduce((sum, cat) => sum + cat.budgeted, 0)
    : 0;

  // Calculate monthly spending progress
  const monthlySpent = monthlyBudget
    ? Object.values(monthlyBudget.categories).reduce((sum, cat) => sum + cat.used, 0)
    : 0;
  const monthlyBudgeted = monthlyBudget
    ? Object.values(monthlyBudget.categories).reduce((sum, cat) => sum + cat.budgeted, 0)
    : 0;

  // From the plan, calculate spending vs saving per paycheck
  const planSpending = plan
    ? plan.categories.filter((k) => spendingCategoryKeys.includes(k)).reduce((sum, k) => sum + (plan.allocations[k]?.amount || 0), 0)
    : 0;
  const planSaving = plan
    ? plan.categories.filter((k) => !spendingCategoryKeys.includes(k)).reduce((sum, k) => sum + (plan.allocations[k]?.amount || 0), 0)
    : 0;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <DataNotice />

      {/* Net Worth */}
      <Card className="highlight-card">
        <div className="stat-big">
          <span className="stat-label">Net Worth</span>
          <span className="stat-value">{formatCurrency(netWorth)}</span>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid-2">
        <Card>
          <div className="stat">
            <span className="stat-label">Savings Rate</span>
            <span className="stat-value-sm accent">{formatPercent(savingsRate)}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Next Pay</span>
            <span className="stat-value-sm">{getNextPayDate(s.payFrequency, s.payDays)}</span>
          </div>
        </Card>
      </div>

      {/* Active Plan Summary */}
      {plan ? (
        <Card title="Your Plan (per paycheck)">
          <div className="stat-row">
            <span>Paycheck</span>
            <span className="stat-value-sm">{formatCurrency(plan.paycheckAmount)}</span>
          </div>
          <div className="stat-row">
            <span>→ Saving / Investing</span>
            <span className="stat-value-sm accent">{formatCurrency(planSaving)}</span>
          </div>
          <div className="stat-row">
            <span>→ Spending / Bills</span>
            <span className="stat-value-sm">{formatCurrency(planSpending)}</span>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="card-text">No plan set yet. Go to the <strong>Pay</strong> tab to create your paycheck allocation plan.</p>
        </Card>
      )}

      {/* This Week */}
      {weeklyBudgeted > 0 && (
        <Card title={`This Week · ${formatWeekRange(getWeekStart())}`}>
          <ProgressBar current={weeklySpent} target={weeklyBudgeted} color="#6366f1" />
          <div className="goal-amounts">
            <span>{formatCurrency(weeklySpent)} spent</span>
            <span className="goal-target">{formatCurrency(weeklyBudgeted - weeklySpent)} left</span>
          </div>
        </Card>
      )}

      {/* This Month */}
      {monthlyBudgeted > 0 && (
        <Card title="This Month">
          <ProgressBar current={monthlySpent} target={monthlyBudgeted} color="#8b5cf6" />
          <div className="goal-amounts">
            <span>{formatCurrency(monthlySpent)} spent</span>
            <span className="goal-target">{formatCurrency(monthlyBudgeted - monthlySpent)} left</span>
          </div>
        </Card>
      )}

      {/* Top Goals */}
      {goals && goals.length > 0 && (
        <Card title="Goals">
          {goals.slice(0, 3).map((goal) => (
            <div key={goal.id} style={{ marginBottom: 12 }}>
              <div className="goal-amounts" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{goal.name}</span>
                <span className="goal-target">{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</span>
              </div>
              <ProgressBar current={goal.current} target={goal.target} color="#10b981" />
            </div>
          ))}
        </Card>
      )}

      {/* Account Balances */}
      <Card title="Accounts">
        {accounts.map((a) => (
          <div key={a.id} className="stat-row">
            <span>{a.name}</span>
            <span className="stat-value-sm">{formatCurrency(a.balance)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
