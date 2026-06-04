import { useRef, useState } from 'react';
import { Card } from '../components/Card';
import { exportData, downloadBackup, importData } from '../utils/backup';

export function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

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
