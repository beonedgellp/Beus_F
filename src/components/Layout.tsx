import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './Icons';
import Avatar from './Avatar';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

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
        </nav>
        <div className="user-area">
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
