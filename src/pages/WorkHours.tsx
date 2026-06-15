import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, WorkHoursEntry } from '../db/database';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';

const TARGET_HOURS = 40;

const SOURCES: { key: WorkHoursEntry['source']; label: string; icon: string; description: string }[] = [
  { key: 'wfh', label: 'WFH Early', icon: '🏠', description: '6 days, +2-3 hrs each' },
  { key: 'drive-alone', label: 'Drive Alone', icon: '🚗', description: '14 days, +1 hr each (in 30min early, out 30min late)' },
  { key: 'lunch', label: 'Worked Lunch', icon: '🥪', description: 'Skip lunch, +1 hr each day' },
  { key: 'july4th', label: 'July 4th Friday', icon: '🇺🇸', description: 'Full WFH day, up to 8 hrs' },
  { key: 'plane', label: 'Plane Work', icon: '✈️', description: 'Flight out (Fri Jun 19)' },
  { key: 'japan', label: 'Japan Nights', icon: '🇯🇵', description: '1hr/night where possible (Jun 22-26)' },
  { key: 'other', label: 'Other', icon: '⏰', description: 'Any other extra time' },
];

const SOURCE_CAPS: Record<string, number> = {
  wfh: 15,
  'drive-alone': 14,
  lunch: 20,
  july4th: 8,
  plane: 5,
  japan: 5,
  other: 10,
};

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

  const bySource: Record<string, number> = {};
  entries?.forEach((e) => {
    bySource[e.source] = (bySource[e.source] || 0) + e.hours;
  });

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
      <h1 className="page-title">Work Hours Tracker</h1>
      <p className="page-subtitle">Making up 40 hours for Japan trip (Jun 22-26)</p>

      <Card className="highlight-card">
        <div className="stat-big">
          <span className="stat-value">{totalLogged.toFixed(1)}h</span>
          <span className="stat-label">of {TARGET_HOURS}h logged</span>
        </div>
        <ProgressBar
          current={totalLogged}
          target={TARGET_HOURS}
          color="#a5b4fc"
        />
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.85rem', opacity: 0.9 }}>
          {remaining > 0
            ? `${remaining.toFixed(1)} hours remaining`
            : '✓ Goal reached!'}
        </p>
      </Card>

      <Card title="Log Hours">
        <div className="work-hours-form">
          <div className="input-field">
            <label className="input-label">Hours</label>
            <div className="input-wrapper">
              <input
                type="number"
                className="input-control"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0.5"
                step="0.25"
                min="0"
              />
            </div>
          </div>

          <div className="input-field">
            <label className="input-label">Source</label>
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
                placeholder="e.g. Got in at 7:00 today"
              />
            </div>
          </div>

          <button className="btn btn-primary full-width" onClick={logEntry} disabled={!hours || parseFloat(hours) <= 0}>
            {saved ? '✓ Logged!' : '+ Log Hours'}
          </button>
        </div>
      </Card>

      <Card title="Breakdown by Source">
        {SOURCES.map((s) => {
          const logged = bySource[s.key] || 0;
          const cap = SOURCE_CAPS[s.key];
          return (
            <div key={s.key} className="source-row">
              <div className="source-info">
                <span className="source-label">{s.icon} {s.label}</span>
                <span className="source-hours">{logged.toFixed(1)}h / {cap}h</span>
              </div>
              <div className="progress-track" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((logged / cap) * 100, 100)}%`,
                    backgroundColor: logged >= cap ? 'var(--accent)' : 'var(--primary)',
                  }}
                />
              </div>
              <p className="source-desc">{s.description}</p>
            </div>
          );
        })}
      </Card>

      <Card title="Quick Reference">
        <div className="schedule-ref">
          <div className="ref-item">
            <span className="ref-label">Normal schedule</span>
            <span className="ref-value">7:30 AM – 3:30 PM</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">Drive-alone days</span>
            <span className="ref-value">7:00 AM – 4:00 PM (+1hr)</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">WFH days</span>
            <span className="ref-value">Start 2-3 hrs early</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">Japan week</span>
            <span className="ref-value">Jun 22-26 (Mon-Fri)</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">July 4th</span>
            <span className="ref-value">Full WFH day (office closed)</span>
          </div>
          <div className="ref-item">
            <span className="ref-label">36 work days</span>
            <span className="ref-value">To spread hours across</span>
          </div>
        </div>
      </Card>

      {entries && entries.length > 0 && (
        <Card title="Recent Entries">
          {entries.slice(0, 20).map((entry) => {
            const srcInfo = SOURCES.find((s) => s.key === entry.source);
            const d = new Date(entry.date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={entry.id} className="hours-entry">
                <div className="hours-entry-main">
                  <span className="hours-entry-icon">{srcInfo?.icon || '⏰'}</span>
                  <div className="hours-entry-details">
                    <span className="hours-entry-label">{srcInfo?.label || entry.source}</span>
                    {entry.note && <span className="hours-entry-note">{entry.note}</span>}
                  </div>
                  <div className="hours-entry-right">
                    <span className="hours-entry-hours">+{entry.hours}h</span>
                    <span className="hours-entry-date">{dateStr}</span>
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
