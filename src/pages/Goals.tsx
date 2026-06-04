import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { formatCurrency } from '../utils/format';
import { useState } from 'react';

const goalColors: Record<string, string> = {
  emergency: '#ef4444',
  roth_ira: '#8b5cf6',
  savings: '#10b981',
  custom: '#f59e0b',
};

export function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray());
  const [editingId, setEditingId] = useState<number | null>(null);

  if (!goals) return <div className="loading">Loading...</div>;

  async function updateGoal(id: number, field: 'current' | 'target', value: number) {
    await db.goals.update(id, { [field]: value });
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
    await db.goals.delete(id);
    setEditingId(null);
  }

  return (
    <div className="page">
      <h1 className="page-title">Goals</h1>

      {goals.map((goal) => (
        <Card key={goal.id}>
          <div className="goal-header">
            <h4>{goal.name}</h4>
            <button
              className="btn-icon"
              onClick={() => setEditingId(editingId === goal.id ? null : (goal.id ?? null))}
              aria-label="Edit goal"
            >
              ✏️
            </button>
          </div>
          <ProgressBar
            current={goal.current}
            target={goal.target}
            color={goalColors[goal.type] || '#6366f1'}
          />
          <div className="goal-amounts">
            <span>{formatCurrency(goal.current)}</span>
            <span className="goal-target">of {formatCurrency(goal.target)}</span>
          </div>

          {editingId === goal.id && (
            <div className="goal-edit">
              <div className="input-field compact">
                <label className="input-label">Name</label>
                <input
                  type="text"
                  value={goal.name}
                  onChange={(e) => {
                    if (goal.id) db.goals.update(goal.id, { name: e.target.value });
                  }}
                  className="input-control"
                />
              </div>
              <div className="budget-inputs">
                <div className="input-field compact">
                  <label className="input-label">Current</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={goal.current || ''}
                      onChange={(e) => goal.id && updateGoal(goal.id, 'current', Number(e.target.value) || 0)}
                      className="input-control"
                    />
                  </div>
                </div>
                <div className="input-field compact">
                  <label className="input-label">Target</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={goal.target || ''}
                      onChange={(e) => goal.id && updateGoal(goal.id, 'target', Number(e.target.value) || 0)}
                      className="input-control"
                    />
                  </div>
                </div>
              </div>
              {goal.type === 'custom' && (
                <button className="btn btn-danger btn-small" onClick={() => goal.id && deleteGoal(goal.id)}>
                  Delete Goal
                </button>
              )}
            </div>
          )}
        </Card>
      ))}

      <button className="btn full-width" onClick={addGoal}>
        + Add Custom Goal
      </button>
    </div>
  );
}
