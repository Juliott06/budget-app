import Dexie, { Table } from 'dexie';

export interface Account {
  id?: number;
  name: string;
  type: 'checking' | 'savings' | 'emergency' | 'roth_ira' | '401k' | 'brokerage';
  balance: number;
  updatedAt: string;
}

export interface PaycheckAllocation {
  id?: number;
  date: string;
  paycheckAmount: number;
  allocations: {
    savings: number;
    emergency: number;
    '401k': number;
    roth_ira: number;
    brokerage: number;
    food: number;
    spending: number;
    gas: number;
    bills: number;
    misc: number;
  };
}

export interface WeeklyBudget {
  id?: number;
  weekStart: string;
  food: { budgeted: number; used: number };
  spending: { budgeted: number; used: number };
  gas: { budgeted: number; used: number };
  misc: { budgeted: number; used: number };
}

export interface Goal {
  id?: number;
  name: string;
  type: 'emergency' | 'roth_ira' | 'savings' | 'custom';
  target: number;
  current: number;
  icon?: string;
}

export interface NetWorthSnapshot {
  id?: number;
  date: string;
  total: number;
  breakdown: Record<string, number>;
}

export interface AppSettings {
  id?: number;
  monthlyIncome: number;
  monthlySaved: number;
}

class BudgetDB extends Dexie {
  accounts!: Table<Account>;
  paycheckAllocations!: Table<PaycheckAllocation>;
  weeklyBudgets!: Table<WeeklyBudget>;
  goals!: Table<Goal>;
  netWorthSnapshots!: Table<NetWorthSnapshot>;
  settings!: Table<AppSettings>;

  constructor() {
    super('BudgetDashboard');
    this.version(1).stores({
      accounts: '++id, name, type',
      paycheckAllocations: '++id, date',
      weeklyBudgets: '++id, weekStart',
      goals: '++id, name, type',
      netWorthSnapshots: '++id, date',
      settings: '++id',
    });
  }
}

export const db = new BudgetDB();

// Seed default data if empty
export async function seedDefaults() {
  const count = await db.accounts.count();
  if (count === 0) {
    await db.accounts.bulkAdd([
      { name: 'Checking', type: 'checking', balance: 0, updatedAt: new Date().toISOString() },
      { name: 'Savings', type: 'savings', balance: 0, updatedAt: new Date().toISOString() },
      { name: 'Emergency Fund', type: 'emergency', balance: 0, updatedAt: new Date().toISOString() },
      { name: 'Roth IRA', type: 'roth_ira', balance: 0, updatedAt: new Date().toISOString() },
      { name: '401k', type: '401k', balance: 0, updatedAt: new Date().toISOString() },
      { name: 'Fidelity Brokerage', type: 'brokerage', balance: 0, updatedAt: new Date().toISOString() },
    ]);
  }

  const goalCount = await db.goals.count();
  if (goalCount === 0) {
    await db.goals.bulkAdd([
      { name: 'Emergency Fund', type: 'emergency', target: 5000, current: 0 },
      { name: 'Roth IRA (Yearly)', type: 'roth_ira', target: 7000, current: 0 },
      { name: 'Savings Goal', type: 'savings', target: 10000, current: 0 },
      { name: 'Travel Fund', type: 'custom', target: 2000, current: 0 },
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({ monthlyIncome: 0, monthlySaved: 0 });
  }
}
