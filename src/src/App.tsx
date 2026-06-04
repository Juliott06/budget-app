import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { Dashboard } from './pages/Dashboard';
import { PaycheckAllocation } from './pages/PaycheckAllocation';
import { WeeklyBudget } from './pages/WeeklyBudget';
import { Goals } from './pages/Goals';
import { NetWorth } from './pages/NetWorth';
import { Settings } from './pages/Settings';
import { seedDefaults } from './db/database';

export default function App() {
  useEffect(() => {
    seedDefaults();
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <Link to="/settings" className="settings-link" aria-label="Settings">
            ⚙️
          </Link>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/paycheck" element={<PaycheckAllocation />} />
            <Route path="/budget" element={<WeeklyBudget />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}
