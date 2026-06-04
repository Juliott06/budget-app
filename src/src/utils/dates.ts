export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7)); // go back to Monday
  return monday.toISOString().slice(0, 10);
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

export function formatMonthYear(monthStr: string): string {
  const d = new Date(monthStr + '-01T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getNextPayDate(payFrequency: string, payDays: string): string {
  const now = new Date();
  const today = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  if (payFrequency === 'semimonthly') {
    const days = payDays.split(',').map((d) => parseInt(d.trim())).sort((a, b) => a - b);
    for (const day of days) {
      if (today < day) {
        return new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    // Next month's first pay day
    return new Date(year, month + 1, days[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (payFrequency === 'monthly') {
    const day = parseInt(payDays) || 1;
    if (today < day) return new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return new Date(year, month + 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (payFrequency === 'biweekly' || payFrequency === 'weekly') {
    const interval = payFrequency === 'weekly' ? 7 : 14;
    // Approximate: next Friday
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || interval;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilFriday);
    return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return 'N/A';
}
