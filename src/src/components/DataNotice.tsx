import { useState } from 'react';

export function DataNotice() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('data-notice-dismissed') === 'true';
  });

  if (dismissed) return null;

  return (
    <div className="data-notice" role="alert">
      <p>
        <strong>⚠️ Local Storage Only</strong><br />
        Your data is stored on this device/browser. Clearing Safari data or browser cache <strong>will delete your budget data</strong>.
        Use the backup feature in Settings to export your data regularly.
      </p>
      <button
        className="btn-small"
        onClick={() => {
          localStorage.setItem('data-notice-dismissed', 'true');
          setDismissed(true);
        }}
      >
        Got it
      </button>
    </div>
  );
}
