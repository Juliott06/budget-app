import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { formatCurrency } from '../utils/format';

const payFrequencyLabels: Record<string, string> = {
  weekly: 'Weekly (4x/month)',
  biweekly: 'Biweekly (every 2 weeks)',
  semimonthly: 'Semi-monthly (15th & 30th)',
  monthly: 'Monthly (1x/month)',
};

const payFrequencyMultiplier: Record<string, number> = {
  weekly: 4,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
};

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
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoRedistribute, setAutoRedistribute] = useState(true);

  const history = useLiveQuery(() =>
    db.paycheckAllocations.orderBy('date').reverse().limit(5).toArray()
  );

  const settings = useLiveQuery(() => db.settings.toArray());
  const s = settings?.[0];

  // Auto-fill paycheck amount from settings
  useEffect(() => {
    if (s?.paycheckAmount && paycheckAmount === 0) {
      setPaycheckAmount(s.paycheckAmount);
    }
  }, [s?.paycheckAmount]);

  // Calculate dollar amount for a given key
  const getDollarAmount = useCallback((key: string, vals: Record<string, number> = values): number => {
    const val = vals[key] || 0;
    const cat = allCategories[key];
    if (cat && cat.mode === 'percent') {
      return Math.round((paycheckAmount * val) / 100);
    }
    return val;
  }, [paycheckAmount, values]);

  const totalAllocated = activeCategories.reduce((sum, key) => sum + getDollarAmount(key), 0);
  const remaining = paycheckAmount - totalAllocated;

  // Smart redistribution: when one value changes, spread the difference across unlocked dollar categories
  function handleValueChange(changedKey: string, newVal: number) {
    const oldVal = values[changedKey] || 0;
    const cat = allCategories[changedKey];
    if (!cat) return;

    const newValues = { ...values, [changedKey]: newVal };

    if (autoRedistribute && paycheckAmount > 0) {
      // Calculate the dollar difference this change creates
      let dollarDiff: number;
      if (cat.mode === 'percent') {
        dollarDiff = Math.round((paycheckAmount * newVal) / 100) - Math.round((paycheckAmount * oldVal) / 100);
      } else {
        dollarDiff = newVal - oldVal;
      }

      if (dollarDiff !== 0) {
        // Find other dollar-based categories that aren't locked and aren't the changed one
        const redistributable = activeCategories.filter((k) => {
          if (k === changedKey) return false;
          if (lockedKeys.has(k)) return false;
          const c = allCategories[k];
          return c && c.mode === 'dollar';
        });

        if (redistributable.length > 0) {
          // Get total of redistributable categories
          const redistTotal = redistributable.reduce((s, k) => s + (newValues[k] || 0), 0);

          if (redistTotal > 0) {
            // Distribute proportionally (reduce others if changedKey increased, increase if decreased)
            let distributed = 0;
            redistributable.forEach((k, i) => {
              const currentVal = newValues[k] || 0;
              const proportion = currentVal / redistTotal;
              if (i === redistributable.length - 1) {
                // Last one gets remainder to avoid rounding issues
                newValues[k] = Math.max(0, currentVal - (dollarDiff - distributed));
              } else {
                const adjustment = Math.round(dollarDiff * proportion);
                newValues[k] = Math.max(0, currentVal - adjustment);
                distributed += adjustment;
              }
            });
          } else {
            // All redistributable are zero — split evenly
            const perItem = Math.round(Math.abs(dollarDiff) / redistributable.length);
            redistributable.forEach((k) => {
              if (dollarDiff < 0) {
                // We freed up money, distribute it
                newValues[k] = (newValues[k] || 0) + perItem;
              }
              // If dollarDiff > 0 and others are 0, we can't reduce further
            });
          }
        }
      }
    }

    setValues(newValues);
  }

  function toggleLock(key: string) {
    setLockedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function removeCategory(key: string) {
    setActiveCategories((prev) => prev.filter((k) => k !== key));
    setValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLockedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
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
    setLockedKeys(new Set());
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

      {s && (
        <Card title="Pay Schedule">
          <div className="pay-schedule-info">
            <div className="stat-row">
              <span>Frequency</span>
              <span className="stat-value-sm">{payFrequencyLabels[s.payFrequency] || 'Semi-monthly'}</span>
            </div>
            {paycheckAmount > 0 && (
              <div className="stat-row">
                <span>Monthly total (est.)</span>
                <span className="stat-value-sm accent">
                  {formatCurrency(paycheckAmount * (payFrequencyMultiplier[s.payFrequency] || 2))}
                </span>
              </div>
            )}
            <p className="card-text" style={{ marginTop: 8 }}>
              Change your pay schedule in Settings.
            </p>
          </div>
        </Card>
      )}

      <Card title="Allocations">
        <div className="redistribute-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoRedistribute}
              onChange={(e) => setAutoRedistribute(e.target.checked)}
            />
            <span>Smart redistribute</span>
          </label>
          <span className="toggle-hint">
            {autoRedistribute ? 'Adjusting one will rebalance others' : 'Manual mode'}
          </span>
        </div>

        {activeCategories.map((key) => {
          const cat = allCategories[key];
          if (!cat) return null;
          const isPercent = cat.mode === 'percent';
          const isLocked = lockedKeys.has(key);

          return (
            <div key={key} className="allocation-row">
              <div className="allocation-input">
                <InputField
                  label={`${cat.label}${isPercent ? ' (%)' : ''}`}
                  value={values[key] || 0}
                  onChange={(val) => handleValueChange(key, val)}
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
                className={`btn-icon lock-btn ${isLocked ? 'locked' : ''}`}
                onClick={() => toggleLock(key)}
                aria-label={isLocked ? `Unlock ${cat.label}` : `Lock ${cat.label}`}
                title={isLocked ? 'Locked — won\'t change during redistribution' : 'Click to lock'}
              >
                {isLocked ? '🔒' : '🔓'}
              </button>
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
