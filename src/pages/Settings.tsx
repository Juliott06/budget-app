import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PayFrequency } from '../db/database';
import { Card } from '../components/Card';
import { exportData, downloadBackup, importData } from '../utils/backup';

export function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const settings = useLiveQuery(() => db.settings.toArray());
  const s = settings?.[0];

  async function updateSetting(key: string, value: any) {
    if (s?.id) {
      await db.settings.update(s.id, { [key]: value });
    }
  }

  async function handleExport() {
    try {
      const json = await exportData();
      downloadBackup(json);
      setStatus('✓ Backup downloaded!');
    } catch (_e) {
      setStatus('✗ Export failed');
    }
    setTimeout(() => setStatus(''), 3000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      setStatus('✓ Data restored successfully!');
    } catch (_e) {
      setStatus('✗ Import failed. Check file format.');
    }
    setTimeout(() => setStatus(''), 3000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <Card title="Pay Schedule">
        <div className="input-field">
          <label className="input-label">How often do you get paid?</label>
          <select
            className="select-control"
            value={s?.payFrequency || 'semimonthly'}
            onChange={(e) => updateSetting('payFrequency', e.target.value as PayFrequency)}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly (every 2 weeks)</option>
            <option value="semimonthly">Semi-monthly (15th & 30th)</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="input-field">
          <label className="input-label">Paycheck amount (after tax)</label>
          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={s?.paycheckAmount || ''}
              onChange={(e) => updateSetting('paycheckAmount', Number(e.target.value) || 0)}
              className="input-control"
            />
          </div>
        </div>
        {s?.payFrequency === 'semimonthly' && (
          <div className="input-field">
            <label className="input-label">Pay days (e.g. 15,30)</label>
            <input
              type="text"
              value={s?.payDays || '15,30'}
              onChange={(e) => updateSetting('payDays', e.target.value)}
              className="input-control bordered"
              placeholder="15,30"
            />
          </div>
        )}
      </Card>

      <Card title="Weekly Fun Budget">
        <p className="card-text">
          Set your weekly allowance for fun stuff. Unspent money rolls over into your "Fun Savings Pot."
        </p>
        <div className="input-field">
          <label className="input-label">Weekly fun money</label>
          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={s?.weeklyFunBudget || ''}
              onChange={(e) => updateSetting('weeklyFunBudget', Number(e.target.value) || 0)}
              className="input-control"
            />
          </div>
        </div>
        <div className="stat-row">
          <span>Current fun savings pot</span>
          <span className="stat-value-sm accent">${s?.funRolloverBalance || 0}</span>
        </div>
        <button
          className="btn btn-small"
          onClick={() => updateSetting('funRolloverBalance', 0)}
          style={{ marginTop: 8 }}
        >
          Reset pot to $0
        </button>
      </Card>

      <Card title="Data Backup">
        <p className="card-text">
          Your data lives only on this device. Export regularly to avoid losing it.
        </p>
        <button className="btn btn-primary full-width" onClick={handleExport}>
          📥 Export Backup (JSON)
        </button>
      </Card>

      <Card title="Restore Data">
        <p className="card-text">
          Import a previously exported JSON backup. This will <strong>replace</strong> all current data.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="file-input"
        />
        <button className="btn full-width" onClick={() => fileInputRef.current?.click()}>
          📤 Import Backup
        </button>
      </Card>

      {status && (
        <div className="status-message" role="status">
          {status}
        </div>
      )}

      <Card title="About">
        <p className="card-text">
          Budget Dashboard v1.0<br />
          Built for personal use. No data leaves your device.<br />
          <strong>⚠️ Clearing Safari/browser data will delete your budget data.</strong>
        </p>
      </Card>
    </div>
  );
}
