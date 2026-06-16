import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, WorkHoursEntry } from '../db/database';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';

const TARGET_HOURS = 40;

const SOURCES: { key: WorkHoursEntry['source']; label: string; icon: string }[] = [
  { key: 'wfh', label: 'WFH Early', icon: '🏠' },
  { key: 'drive-alone', label: 'Drive Alone', icon: '🚗' },
  { key: 'lunch', label: 'Worked Lunch', icon: '🥪' },
  { key: 'july4th', label: 'July 4th', icon: '🇺🇸' },
  { key: 'plane', label: 'Plane', icon: '✈️' },
  { key: 'japan', label: 'Japan', icon: '🇯🇵' },
  { key: 'other', label: 'Other', icon: '⏰' },
];

export function WorkHours() {
  const [hours, setHours] = useState('');
  const [source, setSource] = useState<WorkHoursEntry['source']>('wfh');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const entries = useLiveQuery(() =>
    db.workHoursEntries.orderBy('date').reverse().toArray()
  );

  const totalLogged = entries?.reduce((sum, e) => sum + e.hours, 0) ?? 0;
  const remaining = Math.max(0, TARGET_HOURS - totalLogged);

  async function logEntry() {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;

    await db.workHoursEntries.add({
      date: new Date().toISOString(),
      hours: h,
      source,
      note: note.trim() || undefined,
    });

    setHours('');
    setNote('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function deleteEntry(id: number) {
    await db.workHoursEntries.delete(id);
  }

  return (
    <div className="page">
      <h1 className="page-title">Work Hours</h1>
      <p className="page-subtitle">40 hours to make up for Japan (Jun 22-26)</p>

      {/* Big progress display */}
      <Card className="highlight-card">
        <div className="stat-big">
          <span className="stat-value">{totalLogged.toFixed(1)}h</span>
          <span className="stat-label">of {TARGET_HOURS}h completed</span>
        </div>
        <ProgressBar
          current={totalLogged}
          target={TARGET_HOURS}
          color="#a5b4fc"
        />
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.9rem', opacity: 0.9 }}>
          {remaining > 0
            ? `${remaining.toFixed(1)} hours to go`
            : '✓ You did it!'}
        </p>
      </Card>

      {/* Simple log form */}
      <Card title="Add Hours">
        <div className="work-hours-form">
          <div className="input-field">
            <label className="input-label">Hours</label>
            <div className="input-wrapper">
              <input
                type="number"
                className="input-control"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1"
                step="0.25"
                min="0"
              />
            </div>
          </div>

          <div className="input-field">
            <label className="input-label">How</label>
            <select
              className="select-control"
              value={source}
              onChange={(e) => setSource(e.target.value as WorkHoursEntry['source'])}
            >
              {SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-field">
            <label className="input-label">Note (optional)</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="input-control"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Got in at 7:00"
              />
            </div>
          </div>

          <button className="btn btn-primary full-width" onClick={logEntry} disabled={!hours || parseFloat(hours) <= 0}>
            {saved ? '✓ Added!' : '+ Add'}
          </button>
        </div>
      </Card>

      {/* Entry log */}
      {entries && entries.length > 0 && (
        <Card title={`Log (${entries.length} entries)`}>
          {entries.map((entry) => {
            const srcInfo = SOURCES.find((s) => s.key === entry.source);
            const d = new Date(entry.date);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={entry.id} className="hours-entry">
                <div className="hours-entry-main">
                  <span className="hours-entry-icon">{srcInfo?.icon || '⏰'}</span>
                  <div className="hours-entry-details">
                    <span className="hours-entry-label">{dateStr}</span>
                    {entry.note && <span className="hours-entry-note">{entry.note}</span>}
                  </div>
                  <div className="hours-entry-right">
                    <span className="hours-entry-hours">+{entry.hours}h</span>
                    <span className="hours-entry-date">{srcInfo?.label}</span>
                  </div>
                </div>
                <button
                  className="btn-icon remove-btn"
                  onClick={() => entry.id && deleteEntry(entry.id)}
                  aria-label="Delete entry"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
