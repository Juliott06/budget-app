import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { formatCurrency } from '../utils/format';

const defaultAllocations = {
  savings: 0,
  emergency: 0,
  '401k': 0,
  roth_ira: 0,
  brokerage: 0,
  food: 0,
  spending: 0,
  gas: 0,
  bills: 0,
  misc: 0,
};

const labels: Record<string, string> = {
  savings: 'Savings',
  emergency: 'Emergency Fund',
  '401k': '401k',
  roth_ira: 'Roth IRA',
  brokerage: 'Fidelity Investments',
  food: 'Food',
  spending: 'Spending / Fun',
  gas: 'Gas / Transportation',
  bills: 'Bills',
  misc: 'Buffer / Misc',
};

export function PaycheckAllocation() {
  const [paycheckAmount, setPaycheckAmount] = useState(0);
  const [allocations, setAllocations] = useState(defaultAllocations);
  const [saved, setSaved] = useState(false);

  const history = useLiveQuery(() =>
    db.paycheckAllocations.orderBy('date').reverse().limit(5).toArray()
  );

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = paycheckAmount - totalAllocated;

  function suggestAllocations() {
    if (paycheckAmount <= 0) return;
    const p = paycheckAmount;
    setAllocations({
      savings: Math.round(p * 0.2),
      emergency: Math.round(p * 0.1),
      '401k': Math.round(p * 0.1),
      roth_ira: Math.round(p * 0.1),
      brokerage: Math.round(p * 0.05),
      food: Math.round(p * 0.15),
      spending: Math.round(p * 0.1),
      gas: Math.round(p * 0.08),
      bills: Math.round(p * 0.07),
      misc: Math.round(p * 0.05),
    });
  }

  async function saveAllocation() {
    await db.paycheckAllocations.add({
      date: new Date().toISOString(),
      paycheckAmount,
      allocations,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
        {Object.keys(allocations).map((key) => (
          <InputField
            key={key}
            label={labels[key]}
            value={allocations[key as keyof typeof allocations]}
            onChange={(val) => setAllocations((prev) => ({ ...prev, [key]: val }))}
          />
        ))}
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
