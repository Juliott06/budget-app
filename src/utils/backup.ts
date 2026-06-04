import { db } from '../db/database';

export async function exportData(): Promise<string> {
  const data = {
    accounts: await db.accounts.toArray(),
    paycheckAllocations: await db.paycheckAllocations.toArray(),
    weeklyBudgets: await db.weeklyBudgets.toArray(),
    goals: await db.goals.toArray(),
    netWorthSnapshots: await db.netWorthSnapshots.toArray(),
    settings: await db.settings.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadBackup(jsonString: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  await db.transaction('rw', db.accounts, db.paycheckAllocations, db.weeklyBudgets, db.goals, db.netWorthSnapshots, db.settings, async () => {
    await db.accounts.clear();
    await db.paycheckAllocations.clear();
    await db.weeklyBudgets.clear();
    await db.goals.clear();
    await db.netWorthSnapshots.clear();
    await db.settings.clear();

    if (data.accounts) await db.accounts.bulkAdd(data.accounts.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
    if (data.paycheckAllocations) await db.paycheckAllocations.bulkAdd(data.paycheckAllocations.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
    if (data.weeklyBudgets) await db.weeklyBudgets.bulkAdd(data.weeklyBudgets.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
    if (data.goals) await db.goals.bulkAdd(data.goals.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
    if (data.netWorthSnapshots) await db.netWorthSnapshots.bulkAdd(data.netWorthSnapshots.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
    if (data.settings) await db.settings.bulkAdd(data.settings.map((a: Record<string, unknown>) => { const { id, ...rest } = a; return rest; }));
  });
}
