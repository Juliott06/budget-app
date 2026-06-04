interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ current, target, label, color = '#6366f1' }: ProgressBarProps) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="progress-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="progress-text">{Math.round(percent)}%</div>
    </div>
  );
}
