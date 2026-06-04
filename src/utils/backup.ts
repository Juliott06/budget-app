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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(jsonString);

  await db.transaction('rw', [db.accounts, db.paycheckAllocations, db.weeklyBudgets, db.goals, db.netWorthSnapshots, db.settings], async () => {
    await db.accounts.clear();
    await db.paycheckAllocations.clear();
    await db.weeklyBudgets.clear();
    await db.goals.clear();
    await db.netWorthSnapshots.clear();
    await db.settings.clear();

    const stripId = (arr: any[]) => arr.map(({ id: _id, ...rest }) => rest);

    if (data.accounts) await db.accounts.bulkAdd(stripId(data.accounts));
    if (data.paycheckAllocations) await db.paycheckAllocations.bulkAdd(stripId(data.paycheckAllocations));
    if (data.weeklyBudgets) await db.weeklyBudgets.bulkAdd(stripId(data.weeklyBudgets));
    if (data.goals) await db.goals.bulkAdd(stripId(data.goals));
    if (data.netWorthSnapshots) await db.netWorthSnapshots.bulkAdd(stripId(data.netWorthSnapshots));
    if (data.settings) await db.settings.bulkAdd(stripId(data.settings));
  });
}
