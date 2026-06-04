import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Card } from '../components/Card';
import { formatCurrency } from '../utils/format';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function NetWorth() {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const snapshots = useLiveQuery(() => db.netWorthSnapshots.orderBy('date').toArray());

  if (!accounts || !snapshots) return <div className="loading">Loading...</div>;

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  async function updateBalance(id: number, balance: number) {
    await db.accounts.update(id, { balance, updatedAt: new Date().toISOString() });
  }

  async function takeSnapshot() {
    if (!accounts) return;
    const breakdown: Record<string, number> = {};
    accounts.forEach((a) => {
      breakdown[a.name] = a.balance;
    });
    await db.netWorthSnapshots.add({
      date: new Date().toISOString().slice(0, 10),
      total,
      breakdown,
    });
  }

  const chartData = snapshots.map((s) => ({
    date: s.date.slice(5),
    total: s.total,
  }));

  return (
    <div className="page">
      <h1 className="page-title">Net Worth</h1>

      <Card className="highlight-card">
        <div className="stat-big">
          <span className="stat-label">Total Net Worth</span>
          <span className="stat-value">{formatCurrency(total)}</span>
        </div>
        <button className="btn btn-small" onClick={takeSnapshot}>
          📸 Save Snapshot
        </button>
      </Card>

      <Card title="Account Balances">
        {accounts.map((account) => (
          <div key={account.id} className="account-row">
            <span className="account-name">{account.name}</span>
            <div className="input-wrapper compact-input">
              <span className="input-prefix">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={account.balance || ''}
                onChange={(e) => account.id && updateBalance(account.id, Number(e.target.value) || 0)}
                className="input-control"
              />
            </div>
          </div>
        ))}
      </Card>

      {chartData.length > 1 && (
        <Card title="Net Worth Over Time">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {snapshots.length > 0 && (
        <Card title="Snapshot History">
          {snapshots.slice().reverse().slice(0, 10).map((s) => (
            <div key={s.id} className="history-item">
              <span>{s.date}</span>
              <span>{formatCurrency(s.total)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
