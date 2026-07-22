import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './Icons';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">Be</span>
          <span className="brand-name">BeUs</span>
        </div>
        <nav className="nav">
          <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
            Chat
          </NavLink>
          <NavLink to="/collective" className={({ isActive }) => (isActive ? 'active' : '')}>
            Collective
          </NavLink>
          <NavLink to="/personal" className={({ isActive }) => (isActive ? 'active' : '')}>
            Personal
          </NavLink>
        </nav>
        <div className="user-area">
          <span className="user-name">{user?.name}</span>
          <button className="btn-ghost btn-icon" onClick={logout} title="Log out">
            <LogoutIcon size={16} />
            <span className="btn-icon-label">Log out</span>
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
