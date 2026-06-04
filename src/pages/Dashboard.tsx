import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { formatCurrency, formatPercent } from '../utils/format';
import { DataNotice } from '../components/DataNotice';

export function Dashboard() {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());

  if (!accounts || !settings) return <div className="loading">Loading...</div>;

  const s = settings[0] || { monthlyIncome: 0, monthlySaved: 0 };
  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsRate = s.monthlyIncome > 0 ? (s.monthlySaved / s.monthlyIncome) * 100 : 0;

  const getBalance = (type: string) => accounts.find((a) => a.type === type)?.balance || 0;

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <DataNotice />

      <Card className="highlight-card">
        <div className="stat-big">
          <span className="stat-label">Net Worth</span>
          <span className="stat-value">{formatCurrency(netWorth)}</span>
        </div>
      </Card>

      <div className="grid-2">
        <Card>
          <div className="stat">
            <span className="stat-label">Checking</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('checking'))}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Savings</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('savings'))}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Emergency</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('emergency'))}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Roth IRA</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('roth_ira'))}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">401k</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('401k'))}</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="stat-label">Brokerage</span>
            <span className="stat-value-sm">{formatCurrency(getBalance('brokerage'))}</span>
          </div>
        </Card>
      </div>

      <Card title="Monthly Overview">
        <div className="monthly-stats">
          <div className="stat-row">
            <span>Monthly Income</span>
            <span className="stat-value-sm">{formatCurrency(s.monthlyIncome)}</span>
          </div>
          <div className="stat-row">
            <span>Monthly Saved/Invested</span>
            <span className="stat-value-sm">{formatCurrency(s.monthlySaved)}</span>
          </div>
          <div className="stat-row">
            <span>Savings Rate</span>
            <span className="stat-value-sm accent">{formatPercent(savingsRate)}</span>
          </div>
        </div>
      </Card>

      <Card title="Update Monthly Info">
        <div className="form-inline">
          <div className="input-field">
            <label className="input-label">Monthly Income</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={s.monthlyIncome || ''}
                onChange={async (e) => {
                  const val = Number(e.target.value) || 0;
                  if (settings[0]?.id) {
                    await db.settings.update(settings[0].id, { monthlyIncome: val });
                  }
                }}
                className="input-control"
              />
            </div>
          </div>
          <div className="input-field">
            <label className="input-label">Monthly Saved</label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={s.monthlySaved || ''}
                onChange={async (e) => {
                  const val = Number(e.target.value) || 0;
                  if (settings[0]?.id) {
                    await db.settings.update(settings[0].id, { monthlySaved: val });
                  }
                }}
                className="input-control"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
