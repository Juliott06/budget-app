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
  allocations: Record<string, number>;
}

export interface WeeklyBudget {
  id?: number;
  weekStart: string;
  categories: Record<string, { budgeted: number; used: number }>;
  rollover: number; // unspent from previous week
}

export interface MonthlyBudget {
  id?: number;
  month: string; // "2026-06"
  categories: Record<string, { budgeted: number; used: number }>;
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

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface AppSettings {
  id?: number;
  monthlyIncome: number;
  monthlySaved: number;
  payFrequency: PayFrequency;
  paycheckAmount: number;
  payDays: string; // e.g. "15,30" for semimonthly
  weeklyFunBudget: number;
  funRolloverBalance: number; // accumulated unspent fun money
}

class BudgetDB extends Dexie {
  accounts!: Table<Account>;
  paycheckAllocations!: Table<PaycheckAllocation>;
  weeklyBudgets!: Table<WeeklyBudget>;
  monthlyBudgets!: Table<MonthlyBudget>;
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
    this.version(2).stores({
      accounts: '++id, name, type',
      paycheckAllocations: '++id, date',
      weeklyBudgets: '++id, weekStart',
      monthlyBudgets: '++id, month',
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
    await db.settings.add({
      monthlyIncome: 0,
      monthlySaved: 0,
      payFrequency: 'semimonthly',
      paycheckAmount: 0,
      payDays: '15,30',
      weeklyFunBudget: 50,
      funRolloverBalance: 0,
    });
  }
}
