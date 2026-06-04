import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Home', icon: '📊' },
  { path: '/paycheck', label: 'Pay', icon: '💰' },
  { path: '/budget', label: 'Budget', icon: '📋' },
  { path: '/goals', label: 'Goals', icon: '🎯' },
  { path: '/networth', label: 'Worth', icon: '📈' },
];

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`nav-tab ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
          aria-label={tab.label}
          aria-current={location.pathname === tab.path ? 'page' : undefined}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
