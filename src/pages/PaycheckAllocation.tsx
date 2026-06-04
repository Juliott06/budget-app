import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { formatCurrency } from '../utils/format';

// All available categories a user can pick from
const allCategories: Record<string, { label: string; mode: 'dollar' | 'percent' }> = {
  savings: { label: 'Savings', mode: 'dollar' },
  emergency: { label: 'Emergency Fund', mode: 'dollar' },
  '401k': { label: '401k', mode: 'percent' },
  roth_ira: { label: 'Roth IRA', mode: 'percent' },
  brokerage: { label: 'Fidelity Investments', mode: 'dollar' },
  food: { label: 'Food', mode: 'dollar' },
  spending: { label: 'Spending / Fun', mode: 'dollar' },
  gas: { label: 'Gas / Transportation', mode: 'dollar' },
  bills: { label: 'Bills', mode: 'dollar' },
  misc: { label: 'Buffer / Misc', mode: 'dollar' },
  rent: { label: 'Rent', mode: 'dollar' },
  subscriptions: { label: 'Subscriptions', mode: 'dollar' },
  charity: { label: 'Charity / Giving', mode: 'dollar' },
  health: { label: 'Health / Medical', mode: 'dollar' },
  travel: { label: 'Travel', mode: 'dollar' },
  education: { label: 'Education', mode: 'dollar' },
};

const defaultActive = ['savings', 'emergency', '401k', 'roth_ira', 'brokerage', 'food', 'spending', 'gas', 'bills', 'misc'];

export function PaycheckAllocation() {
  const [paycheckAmount, setPaycheckAmount] = useState(0);
  const [values, setValues] = useState<Record<string, number>>({});
  const [activeCategories, setActiveCategories] = useState<string[]>(defaultActive);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  const history = useLiveQuery(() =>
    db.paycheckAllocations.orderBy('date').reverse().limit(5).toArray()
  );

  // Calculate dollar amounts (percent categories use paycheck * percent / 100)
  function getDollarAmount(key: string): number {
    const val = values[key] || 0;
    const cat = allCategories[key];
    if (cat && cat.mode === 'percent') {
      return Math.round((paycheckAmount * val) / 100);
    }
    return val;
  }

  const totalAllocated = activeCategories.reduce((sum, key) => sum + getDollarAmount(key), 0);
  const remaining = paycheckAmount - totalAllocated;

  function removeCategory(key: string) {
    setActiveCategories((prev) => prev.filter((k) => k !== key));
    setValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function addCategory(key: string) {
    if (!activeCategories.includes(key)) {
      setActiveCategories((prev) => [...prev, key]);
    }
    setShowAddMenu(false);
  }

  function suggestAllocations() {
    if (paycheckAmount <= 0) return;
    const suggestions: Record<string, number> = {};
    activeCategories.forEach((key) => {
      const cat = allCategories[key];
      if (!cat) return;
      if (key === '401k') suggestions[key] = 6;
      else if (key === 'roth_ira') suggestions[key] = 10;
      else if (cat.mode === 'percent') suggestions[key] = 5;
      else if (key === 'savings') suggestions[key] = Math.round(paycheckAmount * 0.2);
      else if (key === 'emergency') suggestions[key] = Math.round(paycheckAmount * 0.1);
      else if (key === 'brokerage') suggestions[key] = Math.round(paycheckAmount * 0.05);
      else if (key === 'food') suggestions[key] = Math.round(paycheckAmount * 0.15);
      else if (key === 'spending') suggestions[key] = Math.round(paycheckAmount * 0.1);
      else if (key === 'gas') suggestions[key] = Math.round(paycheckAmount * 0.08);
      else if (key === 'bills') suggestions[key] = Math.round(paycheckAmount * 0.07);
      else suggestions[key] = Math.round(paycheckAmount * 0.05);
    });
    setValues(suggestions);
  }

  async function saveAllocation() {
    const allocations: Record<string, number> = {};
    activeCategories.forEach((key) => {
      allocations[key] = getDollarAmount(key);
    });
    await db.paycheckAllocations.add({
      date: new Date().toISOString(),
      paycheckAmount,
      allocations: allocations as any,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const availableToAdd = Object.keys(allCategories).filter((k) => !activeCategories.includes(k));

  return (
    <div className="page">
      <h1 className="page-title">Paycheck Allocation</h1>

      <Card>
        <InputField
          label="Paycheck Amount"
          value={paycheckAmount}
          onChange={setPaycheckAmount}
        />
        <button className="btn" onClick={suggestAllocations}>
          Suggest Split
        </button>
      </Card>

      <Card title="Allocations">
        {activeCategories.map((key) => {
          const cat = allCategories[key];
          if (!cat) return null;
          const isPercent = cat.mode === 'percent';

          return (
            <div key={key} className="allocation-row">
              <div className="allocation-input">
                <InputField
                  label={`${cat.label}${isPercent ? ' (%)' : ''}`}
                  value={values[key] || 0}
                  onChange={(val) => setValues((prev) => ({ ...prev, [key]: val }))}
                  prefix={isPercent ? '%' : '$'}
                  step={isPercent ? 0.5 : 1}
                />
                {isPercent && paycheckAmount > 0 && (
                  <span className="percent-hint">
                    = {formatCurrency(getDollarAmount(key))}
                  </span>
                )}
              </div>
              <button
                className="btn-icon remove-btn"
                onClick={() => removeCategory(key)}
                aria-label={`Remove ${cat.label}`}
              >
                ✕
              </button>
            </div>
          );
        })}

        {availableToAdd.length > 0 && (
          <div className="add-category-section">
            <button className="btn btn-small" onClick={() => setShowAddMenu(!showAddMenu)}>
              + Add Category
            </button>
            {showAddMenu && (
              <div className="add-menu">
                {availableToAdd.map((key) => (
                  <button
                    key={key}
                    className="add-menu-item"
                    onClick={() => addCategory(key)}
                  >
                    {allCategories[key].label}
                    {allCategories[key].mode === 'percent' && ' (%)'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="stat-row">
          <span>Total Allocated</span>
          <span className="stat-value-sm">{formatCurrency(totalAllocated)}</span>
        </div>
        <div className="stat-row">
          <span>Remaining</span>
          <span className={`stat-value-sm ${remaining < 0 ? 'danger' : 'accent'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
        <button className="btn btn-primary" onClick={saveAllocation} disabled={paycheckAmount <= 0}>
          {saved ? '✓ Saved!' : 'Save Allocation'}
        </button>
      </Card>

      {history && history.length > 0 && (
        <Card title="Recent History">
          {history.map((h) => (
            <div key={h.id} className="history-item">
              <span>{new Date(h.date).toLocaleDateString()}</span>
              <span>{formatCurrency(h.paycheckAmount)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

