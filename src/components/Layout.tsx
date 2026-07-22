import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useKeyboardViewport } from '../hooks/useKeyboardViewport';
import { LogoutIcon } from './Icons';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname === '/chat';
  useKeyboardViewport();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
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
          <NavLink to="/groups" className={({ isActive }) => (isActive ? 'active' : '')}>
            Groups
          </NavLink>
        </nav>
        <div className="user-area">
          <NotificationBell />
          <button
            className="profile-btn"
            onClick={() => navigate('/profile')}
            title="Your profile"
          >
            <Avatar
              name={user?.name}
              avatar={user?.avatar}
              color={user?.avatarColor}
              size={30}
            />
            <span className="user-name">{user?.name}</span>
          </button>
          <button className="btn-ghost btn-icon" onClick={logout} title="Log out">
            <LogoutIcon size={16} />
            <span className="btn-icon-label">Log out</span>
          </button>
        </div>
      </header>
      <main className={`content ${isChat ? 'content-chat' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
