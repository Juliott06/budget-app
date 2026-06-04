import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { formatCurrency } from '../utils/format';

const goalColors: Record<string, string> = {
  emergency: '#ef4444',
  roth_ira: '#8b5cf6',
  savings: '#10b981',
  custom: '#f59e0b',
};

export function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray());

  if (!goals) return <div className="loading">Loading...</div>;

  async function updateGoal(id: number, updates: Record<string, any>) {
    await db.goals.update(id, updates);
  }

  async function addGoal() {
    await db.goals.add({
      name: 'New Goal',
      type: 'custom',
      target: 1000,
      current: 0,
    });
  }

  async function deleteGoal(id: number) {
    if (confirm('Delete this goal?')) {
      await db.goals.delete(id);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Goals</h1>
      <p className="page-subtitle">Tap any value to edit it</p>

      {goals.map((goal) => {
        const remaining = goal.target - goal.current;
        return (
          <Card key={goal.id}>
            <div className="goal-name-row">
              <input
                type="text"
                value={goal.name}
                onChange={(e) => goal.id && updateGoal(goal.id, { name: e.target.value })}
                className="goal-name-input"
              />
              <button
                className="btn-icon remove-btn"
                onClick={() => goal.id && deleteGoal(goal.id)}
                aria-label="Delete goal"
              >
                🗑️
              </button>
            </div>

            <ProgressBar
              current={goal.current}
              target={goal.target}
              color={goalColors[goal.type] || '#6366f1'}
            />

            <div className="goal-edit-row">
              <div className="goal-edit-field">
                <label className="input-label">Current</label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={goal.current || ''}
                    onChange={(e) => goal.id && updateGoal(goal.id, { current: Number(e.target.value) || 0 })}
                    className="input-control"
                  />
                </div>
              </div>
              <div className="goal-edit-field">
                <label className="input-label">Target</label>
                <div className="input-wrapper">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={goal.target || ''}
                    onChange={(e) => goal.id && updateGoal(goal.id, { target: Number(e.target.value) || 0 })}
                    className="input-control"
                  />
                </div>
              </div>
            </div>

            <div className="goal-remaining">
              {remaining > 0
                ? `${formatCurrency(remaining)} to go`
                : '🎉 Goal reached!'}
            </div>
          </Card>
        );
      })}

      <button className="btn full-width" onClick={addGoal}>
        + Add Goal
      </button>
    </div>
  );
}
