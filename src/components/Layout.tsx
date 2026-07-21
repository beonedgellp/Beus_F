import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Beus</div>
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
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
