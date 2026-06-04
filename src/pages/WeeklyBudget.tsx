import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { formatCurrency } from '../utils/format';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().slice(0, 10);
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

type ViewMode = 'weekly' | 'monthly';

const weeklyCategories = ['fun', 'food', 'coffee', 'misc'] as const;
const weeklyCategoryLabels: Record<string, string> = {
  fun: '🎉 Fun / Spending',
  food: '🍕 Eating Out',
  coffee: '☕ Coffee / Snacks',
  misc: '📦 Misc',
};

const monthlyCategories = ['food', 'gas', 'bills', 'subscriptions', 'spending', 'misc'] as const;
const monthlyCategoryLabels: Record<string, string> = {
  food: '🛒 Groceries & Food',
  gas: '⛽ Gas / Transport',
  bills: '📄 Bills & Utilities',
  subscriptions: '📱 Subscriptions',
  spending: '🛍️ General Spending',
  misc: '📦 Misc / Other',
};

export function WeeklyBudget() {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const weekStart = getWeekStart();
  const currentMonth = getCurrentMonth();

  const weeklyBudget = useLiveQuery(() => db.weeklyBudgets.where('weekStart').equals(weekStart).first());
  const monthlyBudget = useLiveQuery(() => db.monthlyBudgets.where('month').equals(currentMonth).first());
  const settings = useLiveQuery(() => db.settings.toArray());

  const [weeklyData, setWeeklyData] = useState<Record<string, { budgeted: number; used: number }>>({});
  const [monthlyData, setMonthlyData] = useState<Record<string, { budgeted: number; used: number }>>({});
  const [rollover, setRollover] = useState(0);

  const s = settings?.[0];

  useEffect(() => {
    if (weeklyBudget) {
      setWeeklyData(weeklyBudget.categories || {});
      setRollover(weeklyBudget.rollover || 0);
    } else {
      const defaultWeekly: Record<string, { budgeted: number; used: number }> = {};
      weeklyCategories.forEach((cat) => {
        if (cat === 'fun') defaultWeekly[cat] = { budgeted: s?.weeklyFunBudget || 50, used: 0 };
        else if (cat === 'food') defaultWeekly[cat] = { budgeted: 40, used: 0 };
        else if (cat === 'coffee') defaultWeekly[cat] = { budgeted: 15, used: 0 };
        else defaultWeekly[cat] = { budgeted: 20, used: 0 };
      });
      setWeeklyData(defaultWeekly);
      setRollover(s?.funRolloverBalance || 0);
    }
  }, [weeklyBudget, s]);

  useEffect(() => {
    if (monthlyBudget) {
      setMonthlyData(monthlyBudget.categories || {});
    } else {
      const defaultMonthly: Record<string, { budgeted: number; used: number }> = {};
      monthlyCategories.forEach((cat) => {
        if (cat === 'food') defaultMonthly[cat] = { budgeted: 300, used: 0 };
        else if (cat === 'gas') defaultMonthly[cat] = { budgeted: 150, used: 0 };
        else if (cat === 'bills') defaultMonthly[cat] = { budgeted: 200, used: 0 };
        else if (cat === 'subscriptions') defaultMonthly[cat] = { budgeted: 50, used: 0 };
        else if (cat === 'spending') defaultMonthly[cat] = { budgeted: 200, used: 0 };
        else defaultMonthly[cat] = { budgeted: 100, used: 0 };
      });
      setMonthlyData(defaultMonthly);
    }
  }, [monthlyBudget]);

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

  async function endWeekRollover() {
    // Calculate unspent fun money
    const funItem = weeklyData['fun'];
    if (!funItem) return;
    const unspent = Math.max(0, funItem.budgeted - funItem.used);
    const newRollover = rollover + unspent;

    // Save to settings
    if (s?.id) {
      await db.settings.update(s.id, { funRolloverBalance: newRollover });
    }
    setRollover(newRollover);
    alert(`Nice! $${unspent} rolled over. Your fun savings pot is now ${formatCurrency(newRollover)}.`);
  }

  async function spendFromRollover(amount: number) {
    const newRollover = Math.max(0, rollover - amount);
    setRollover(newRollover);
    if (s?.id) {
      await db.settings.update(s.id, { funRolloverBalance: newRollover });
    }
  }

  function renderBudgetCategory(
    cat: string,
    label: string,
    data: Record<string, { budgeted: number; used: number }>,
    setData: (d: Record<string, { budgeted: number; used: number }>) => void
  ) {
    const item = data[cat] || { budgeted: 0, used: 0 };
    const remaining = item.budgeted - item.used;
    const percent = item.budgeted > 0 ? (item.used / item.budgeted) * 100 : 0;

    return (
      <Card key={cat}>
        <div className="budget-category">
          <h4>{label}</h4>
          <div className="budget-bar-container">
            <div className="budget-bar">
              <div
                className={`budget-bar-fill ${percent > 100 ? 'over' : ''}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
            <span className="budget-bar-text">
              {formatCurrency(item.used)} / {formatCurrency(item.budgeted)}
            </span>
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
                  onChange={(e) =>
                    setData({ ...data, [cat]: { ...item, budgeted: Number(e.target.value) || 0 } })
                  }
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
                  onChange={(e) =>
                    setData({ ...data, [cat]: { ...item, used: Number(e.target.value) || 0 } })
                  }
                  className="input-control"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Budget</h1>

      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
          onClick={() => setViewMode('weekly')}
        >
          This Week
        </button>
        <button
          className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
          onClick={() => setViewMode('monthly')}
        >
          This Month
        </button>
      </div>

      {viewMode === 'weekly' && (
        <>
          <p className="page-subtitle">Week of {new Date(weekStart).toLocaleDateString()}</p>

          {/* Fun money rollover pot */}
          <Card className="rollover-card">
            <div className="rollover-header">
              <span className="rollover-label">🐷 Fun Savings Pot</span>
              <span className="rollover-amount">{formatCurrency(rollover)}</span>
            </div>
            <p className="card-text">
              Unspent weekly fun money rolls over here. Use it for bigger splurges!
            </p>
            <div className="rollover-actions">
              <button className="btn btn-small" onClick={endWeekRollover}>
                Roll over this week's unspent
              </button>
              {rollover > 0 && (
                <button
                  className="btn btn-small"
                  onClick={() => {
                    const amt = prompt('How much to spend from the pot?');
                    if (amt) spendFromRollover(Number(amt) || 0);
                  }}
                >
                  Spend from pot
                </button>
              )}
            </div>
          </Card>

          {weeklyCategories.map((cat) =>
            renderBudgetCategory(cat, weeklyCategoryLabels[cat], weeklyData, setWeeklyData)
          )}

          <button className="btn btn-primary full-width" onClick={saveWeekly}>
            Save Weekly Budget
          </button>
        </>
      )}

      {viewMode === 'monthly' && (
        <>
          <p className="page-subtitle">
            {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          {s && (
            <Card className="pay-info-card">
              <div className="stat-row">
                <span>Pay Frequency</span>
                <span className="stat-value-sm">{s.payFrequency === 'semimonthly' ? '2x/month' : s.payFrequency}</span>
              </div>
              <div className="stat-row">
                <span>Monthly Income</span>
                <span className="stat-value-sm">{formatCurrency(s.monthlyIncome || s.paycheckAmount * 2)}</span>
              </div>
            </Card>
          )}

          {monthlyCategories.map((cat) =>
            renderBudgetCategory(cat, monthlyCategoryLabels[cat], monthlyData, setMonthlyData)
          )}

          <button className="btn btn-primary full-width" onClick={saveMonthly}>
            Save Monthly Budget
          </button>
        </>
      )}
    </div>
  );
}
