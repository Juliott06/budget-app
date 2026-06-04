import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { formatCurrency } from '../utils/format';
import { formatDate } from '../utils/dates';

const payFrequencyMultiplier: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
};

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

  const settings = useLiveQuery(() => db.settings.toArray());
  const activePlan = useLiveQuery(() => db.activePlan.toArray());
  const history = useLiveQuery(() =>
    db.paycheckAllocations.orderBy('date').reverse().limit(5).toArray()
  );

  const s = settings?.[0];
  const currentPlan = activePlan?.[0];

  // Load from active plan or settings on mount
  useEffect(() => {
    if (currentPlan && paycheckAmount === 0) {
      setPaycheckAmount(currentPlan.paycheckAmount);
      setActiveCategories(currentPlan.categories);
      const vals: Record<string, number> = {};
      Object.entries(currentPlan.allocations).forEach(([key, alloc]) => {
        vals[key] = alloc.isPercent ? alloc.percentValue : alloc.amount;
      });
      setValues(vals);
    } else if (s?.paycheckAmount && paycheckAmount === 0) {
      setPaycheckAmount(s.paycheckAmount);
    }
  }, [currentPlan, s?.paycheckAmount]);

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
  const multiplier = payFrequencyMultiplier[s?.payFrequency || 'semimonthly'] || 2;

  function handleValueChange(changedKey: string, newVal: number) {
    const oldVal = values[changedKey] || 0;
    const cat = allCategories[changedKey];
    if (!cat) return;

    const newValues = { ...values, [changedKey]: newVal };

    if (autoRedistribute && paycheckAmount > 0) {
      let dollarDiff: number;
      if (cat.mode === 'percent') {
        dollarDiff = Math.round((paycheckAmount * newVal) / 100) - Math.round((paycheckAmount * oldVal) / 100);
      } else {
        dollarDiff = newVal - oldVal;
      }

      if (dollarDiff !== 0) {
        const redistributable = activeCategories.filter((k) => {
          if (k === changedKey) return false;
          if (lockedKeys.has(k)) return false;
          const c = allCategories[k];
          return c && c.mode === 'dollar';
        });

        if (redistributable.length > 0) {
          const redistTotal = redistributable.reduce((sum, k) => sum + (newValues[k] || 0), 0);

          if (redistTotal > 0) {
            let distributed = 0;
            redistributable.forEach((k, i) => {
              const currentVal = newValues[k] || 0;
              const proportion = currentVal / redistTotal;
              if (i === redistributable.length - 1) {
                newValues[k] = Math.max(0, currentVal - (dollarDiff - distributed));
              } else {
                const adjustment = Math.round(dollarDiff * proportion);
                newValues[k] = Math.max(0, currentVal - adjustment);
                distributed += adjustment;
              }
            });
          } else if (dollarDiff < 0) {
            const perItem = Math.round(Math.abs(dollarDiff) / redistributable.length);
            redistributable.forEach((k) => {
              newValues[k] = (newValues[k] || 0) + perItem;
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
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function removeCategory(key: string) {
    setActiveCategories((prev) => prev.filter((k) => k !== key));
    setValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
    setLockedKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  function addCategory(key: string) {
    if (!activeCategories.includes(key)) setActiveCategories((prev) => [...prev, key]);
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

  async function savePlan() {
    // Build the allocations record
    const allocations: Record<string, { amount: number; isPercent: boolean; percentValue: number }> = {};
    activeCategories.forEach((key) => {
      const cat = allCategories[key];
      if (!cat) return;
      const isPercent = cat.mode === 'percent';
      allocations[key] = {
        amount: getDollarAmount(key),
        isPercent,
        percentValue: isPercent ? (values[key] || 0) : 0,
      };
    });

    // Save as active plan (replace existing)
    await db.activePlan.clear();
    await db.activePlan.add({
      paycheckAmount,
      payFrequency: s?.payFrequency || 'semimonthly',
      allocations,
      categories: activeCategories,
      createdAt: new Date().toISOString(),
    });

    // Also save to history
    const historyAllocations: Record<string, number> = {};
    activeCategories.forEach((key) => { historyAllocations[key] = getDollarAmount(key); });
    await db.paycheckAllocations.add({
      date: new Date().toISOString(),
      paycheckAmount,
      allocations: historyAllocations,
    });

    // Update settings monthly income
    if (s?.id) {
      await db.settings.update(s.id, {
        paycheckAmount,
        monthlyIncome: Math.round(paycheckAmount * multiplier),
        monthlySaved: Math.round(
          (['savings', 'emergency', '401k', 'roth_ira', 'brokerage']
            .reduce((sum, k) => sum + getDollarAmount(k), 0)) * multiplier
        ),
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const availableToAdd = Object.keys(allCategories).filter((k) => !activeCategories.includes(k));

  return (
    <div className="page">
      <h1 className="page-title">Paycheck Plan</h1>
      {currentPlan && (
        <p className="page-subtitle">Active plan from {formatDate(currentPlan.createdAt)}</p>
      )}

      <Card>
        <InputField label="Paycheck Amount (after tax)" value={paycheckAmount} onChange={setPaycheckAmount} />
        <div className="btn-row">
          <button className="btn" onClick={suggestAllocations}>Suggest Split</button>
        </div>
        {paycheckAmount > 0 && (
          <p className="card-text" style={{ marginTop: 8 }}>
            Monthly est: <strong>{formatCurrency(paycheckAmount * multiplier)}</strong>
          </p>
        )}
      </Card>

      <Card title="Allocations">
        <div className="redistribute-toggle">
          <label className="toggle-label">
            <input type="checkbox" checked={autoRedistribute} onChange={(e) => setAutoRedistribute(e.target.checked)} />
            <span>Smart redistribute</span>
          </label>
          <span className="toggle-hint">{autoRedistribute ? 'Adjusting one rebalances others' : 'Manual'}</span>
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
                  <span className="percent-hint">= {formatCurrency(getDollarAmount(key))} / paycheck</span>
                )}
              </div>
              <button className={`btn-icon lock-btn ${isLocked ? 'locked' : ''}`} onClick={() => toggleLock(key)} aria-label={isLocked ? 'Unlock' : 'Lock'}>
                {isLocked ? '🔒' : '🔓'}
              </button>
              <button className="btn-icon remove-btn" onClick={() => removeCategory(key)} aria-label="Remove">✕</button>
            </div>
          );
        })}

        {availableToAdd.length > 0 && (
          <div className="add-category-section">
            <button className="btn btn-small" onClick={() => setShowAddMenu(!showAddMenu)}>+ Add Category</button>
            {showAddMenu && (
              <div className="add-menu">
                {availableToAdd.map((key) => (
                  <button key={key} className="add-menu-item" onClick={() => addCategory(key)}>
                    {allCategories[key].label}{allCategories[key].mode === 'percent' ? ' (%)' : ''}
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
          <span className={`stat-value-sm ${remaining < 0 ? 'danger' : remaining === 0 ? 'accent' : ''}`}>{formatCurrency(remaining)}</span>
        </div>
        <button className="btn btn-primary full-width" onClick={savePlan} disabled={paycheckAmount <= 0} style={{ marginTop: 12 }}>
          {saved ? '✓ Plan Saved!' : '💾 Save as My Plan'}
        </button>
        {saved && <p className="card-text" style={{ marginTop: 8, textAlign: 'center' }}>Your budget page now uses this plan!</p>}
      </Card>

      {history && history.length > 0 && (
        <Card title="History">
          {history.map((h) => (
            <div key={h.id} className="history-item">
              <span>{formatDate(h.date)}</span>
              <span>{formatCurrency(h.paycheckAmount)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
