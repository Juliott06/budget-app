import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, WeeklyBudget as WeeklyBudgetType } from '../db/database';
import { Card } from '../components/Card';
import { formatCurrency } from '../utils/format';

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().slice(0, 10);
}

const categories = ['food', 'spending', 'gas', 'misc'] as const;
const categoryLabels: Record<string, string> = {
  food: '🍕 Food',
  spending: '🎉 Spending / Fun',
  gas: '⛽ Gas / Transport',
  misc: '📦 Miscellaneous',
};

export function WeeklyBudget() {
  const weekStart = getWeekStart();
  const budget = useLiveQuery(() => db.weeklyBudgets.where('weekStart').equals(weekStart).first());
  const [data, setData] = useState<WeeklyBudgetType | null>(null);

  useEffect(() => {
    if (budget) {
      setData(budget);
    } else {
      setData({
        weekStart,
        food: { budgeted: 75, used: 0 },
        spending: { budgeted: 50, used: 0 },
        gas: { budgeted: 40, used: 0 },
        misc: { budgeted: 25, used: 0 },
      });
    }
  }, [budget, weekStart]);

  async function save() {
    if (!data) return;
    if (data.id) {
      await db.weeklyBudgets.update(data.id, data);
    } else {
      await db.weeklyBudgets.add(data);
    }
  }

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h1 className="page-title">Weekly Budget</h1>
      <p className="page-subtitle">Week of {new Date(weekStart).toLocaleDateString()}</p>

      {categories.map((cat) => {
        const item = data[cat];
        const remaining = item.budgeted - item.used;
        const percent = item.budgeted > 0 ? (item.used / item.budgeted) * 100 : 0;

        return (
          <Card key={cat}>
            <div className="budget-category">
              <h4>{categoryLabels[cat]}</h4>
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
      })}

      <button className="btn btn-primary full-width" onClick={save}>
        Save Budget
      </button>
    </div>
  );
}
