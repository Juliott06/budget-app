import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, spendingCategoryKeys } from '../db/database';
import { Card } from '../components/Card';
import { formatCurrency } from '../utils/format';
import { getWeekStart, getCurrentMonth, formatWeekRange, formatMonthYear } from '../utils/dates';

type ViewMode = 'weekly' | 'monthly';

const categoryLabels: Record<string, string> = {
  food: '🍕 Food',
  spending: '🎉 Spending / Fun',
  gas: '⛽ Gas / Transport',
  bills: '📄 Bills',
  misc: '📦 Misc',
  rent: '🏠 Rent',
  subscriptions: '📱 Subscriptions',
  charity: '💝 Charity',
  health: '🏥 Health',
  travel: '✈️ Travel',
  education: '📚 Education',
};

const payFrequencyMultiplier: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
};

export function WeeklyBudget() {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const weekStart = getWeekStart();
  const currentMonth = getCurrentMonth();

  const weeklyBudget = useLiveQuery(() => db.weeklyBudgets.where('weekStart').equals(weekStart).first());
  const monthlyBudget = useLiveQuery(() => db.monthlyBudgets.where('month').equals(currentMonth).first());
  const activePlan = useLiveQuery(() => db.activePlan.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());

  const [weeklyData, setWeeklyData] = useState<Record<string, { budgeted: number; used: number }>>({});
  const [monthlyData, setMonthlyData] = useState<Record<string, { budgeted: number; used: number }>>({});
  const [rollover, setRollover] = useState(0);

  const plan = activePlan?.[0];
  const s = settings?.[0];

  // Build budget from the active plan
  useEffect(() => {
    if (weeklyBudget) {
      setWeeklyData(weeklyBudget.categories || {});
      setRollover(weeklyBudget.rollover || 0);
    } else if (plan) {
      // Auto-generate weekly budgets from plan (divide monthly amounts by ~4.33)
      const freq = payFrequencyMultiplier[plan.payFrequency] || 2;
      const weekly: Record<string, { budgeted: number; used: number }> = {};
      plan.categories.forEach((key) => {
        if (spendingCategoryKeys.includes(key)) {
          const monthlyAmount = (plan.allocations[key]?.amount || 0) * freq;
          weekly[key] = { budgeted: Math.round(monthlyAmount / 4.33), used: 0 };
        }
      });
      // Add fun/spending with fun budget from settings
      if (!weekly['spending'] && s?.weeklyFunBudget) {
        weekly['spending'] = { budgeted: s.weeklyFunBudget, used: 0 };
      }
      setWeeklyData(weekly);
      setRollover(s?.funRolloverBalance || 0);
    } else {
      // No plan — use defaults
      setWeeklyData({
        food: { budgeted: 75, used: 0 },
        spending: { budgeted: 50, used: 0 },
        gas: { budgeted: 40, used: 0 },
        misc: { budgeted: 25, used: 0 },
      });
      setRollover(s?.funRolloverBalance || 0);
    }
  }, [weeklyBudget, plan, s]);

  useEffect(() => {
    if (monthlyBudget) {
      setMonthlyData(monthlyBudget.categories || {});
    } else if (plan) {
      // Auto-generate monthly budgets from plan
      const freq = payFrequencyMultiplier[plan.payFrequency] || 2;
      const monthly: Record<string, { budgeted: number; used: number }> = {};
      plan.categories.forEach((key) => {
        if (spendingCategoryKeys.includes(key)) {
          monthly[key] = { budgeted: Math.round((plan.allocations[key]?.amount || 0) * freq), used: 0 };
        }
      });
      setMonthlyData(monthly);
    } else {
      setMonthlyData({
        food: { budgeted: 300, used: 0 },
        gas: { budgeted: 150, used: 0 },
        bills: { budgeted: 200, used: 0 },
        spending: { budgeted: 200, used: 0 },
        misc: { budgeted: 100, used: 0 },
      });
    }
  }, [monthlyBudget, plan]);

  async function saveWeekly() {
    const data = { weekStart, categories: weeklyData, rollover };
    if (weeklyBudget?.id) {
      await db.weeklyBudgets.update(weeklyBudget.id, data);
    } else {
      await db.weeklyBudgets.add(data);
    }
  }

  async function saveMonthly() {
    const data = { month: currentMonth, categories: monthlyData };
    if (monthlyBudget?.id) {
      await db.monthlyBudgets.update(monthlyBudget.id, data);
    } else {
      await db.monthlyBudgets.add(data);
    }
  }

  async function rolloverUnspent() {
    const spendingItem = weeklyData['spending'];
    if (!spendingItem) return;
    const unspent = Math.max(0, spendingItem.budgeted - spendingItem.used);
    const newRollover = rollover + unspent;
    setRollover(newRollover);
    if (s?.id) {
      await db.settings.update(s.id, { funRolloverBalance: newRollover });
    }
    alert(`$${unspent} rolled over! Fun savings pot: ${formatCurrency(newRollover)}`);
  }

  async function spendFromPot() {
    const amt = prompt('How much to spend from the pot?');
    if (!amt) return;
    const amount = Number(amt) || 0;
    const newRollover = Math.max(0, rollover - amount);
    setRollover(newRollover);
    if (s?.id) {
      await db.settings.update(s.id, { funRolloverBalance: newRollover });
    }
  }

  // Totals
  const data = viewMode === 'weekly' ? weeklyData : monthlyData;
  const totalBudgeted = Object.values(data).reduce((sum, c) => sum + c.budgeted, 0);
  const totalSpent = Object.values(data).reduce((sum, c) => sum + c.used, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  return (
    <div className="page">
      <h1 className="page-title">Budget</h1>

      <div className="view-toggle">
        <button className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>
          This Week
        </button>
        <button className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>
          This Month
        </button>
      </div>

      {/* Summary bar */}
      <Card>
        <div className="budget-summary">
          <div className="budget-summary-row">
            <span className="budget-summary-label">
              {viewMode === 'weekly' ? formatWeekRange(weekStart) : formatMonthYear(currentMonth)}
            </span>
          </div>
          <div className="budget-summary-amounts">
            <div className="budget-summary-item">
              <span className="budget-summary-num">{formatCurrency(totalSpent)}</span>
              <span className="budget-summary-sub">spent</span>
            </div>
            <div className="budget-summary-item">
              <span className="budget-summary-num">{formatCurrency(totalBudgeted)}</span>
              <span className="budget-summary-sub">budgeted</span>
            </div>
            <div className="budget-summary-item">
              <span className={`budget-summary-num ${totalRemaining < 0 ? 'danger' : 'accent'}`}>{formatCurrency(totalRemaining)}</span>
              <span className="budget-summary-sub">left</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Rollover pot (weekly view only) */}
      {viewMode === 'weekly' && (
        <Card className="rollover-card">
          <div className="rollover-header">
            <span className="rollover-label">🐷 Fun Savings Pot</span>
            <span className="rollover-amount">{formatCurrency(rollover)}</span>
          </div>
          <div className="rollover-actions">
            <button className="btn btn-small" onClick={rolloverUnspent}>Roll over unspent</button>
            {rollover > 0 && <button className="btn btn-small" onClick={spendFromPot}>Spend from pot</button>}
          </div>
        </Card>
      )}

      {!plan && (
        <Card>
          <p className="card-text">💡 <strong>Tip:</strong> Create a plan in the Pay tab — your budget categories will auto-populate from it!</p>
        </Card>
      )}

      {/* Budget categories */}
      {Object.entries(data).map(([cat, item]) => {
        const remaining = item.budgeted - item.used;
        const percent = item.budgeted > 0 ? (item.used / item.budgeted) * 100 : 0;

        return (
          <Card key={cat}>
            <div className="budget-category">
              <h4>{categoryLabels[cat] || cat}</h4>
              <div className="budget-bar-container">
                <div className="budget-bar">
                  <div className={`budget-bar-fill ${percent > 100 ? 'over' : ''}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <span className="budget-bar-text">{formatCurrency(item.used)} / {formatCurrency(item.budgeted)}</span>
              </div>
              <div className="budget-remaining">
                <span className={remaining < 0 ? 'danger' : ''}>
                  {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                </span>
              </div>
              <div className="budget-inputs">
                <div className="input-field compact">
                  <label className="input-label">Budget</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.budgeted || ''}
                      onChange={(e) => {
                        const newData = { ...data, [cat]: { ...item, budgeted: Number(e.target.value) || 0 } };
                        viewMode === 'weekly' ? setWeeklyData(newData) : setMonthlyData(newData);
                      }}
                      className="input-control"
                    />
                  </div>
                </div>
                <div className="input-field compact">
                  <label className="input-label">Spent</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.used || ''}
                      onChange={(e) => {
                        const newData = { ...data, [cat]: { ...item, used: Number(e.target.value) || 0 } };
                        viewMode === 'weekly' ? setWeeklyData(newData) : setMonthlyData(newData);
                      }}
                      className="input-control"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <button className="btn btn-primary full-width" onClick={viewMode === 'weekly' ? saveWeekly : saveMonthly}>
        Save {viewMode === 'weekly' ? 'Weekly' : 'Monthly'} Budget
      </button>
    </div>
  );
}
