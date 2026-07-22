import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon } from './Icons';
import { formatTime } from '../utils/format';

export default function NotificationBell() {
  const { items, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) void markAllRead();
  }

  return (
    <div className="bell-wrap">
      <button
        className="icon-btn bell-btn"
        onClick={toggle}
        title="Notifications"
        aria-label="Notifications"
      >
        <BellIcon size={18} />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="bell-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-panel" role="dialog" aria-label="Notifications">
            <div className="bell-head">Notifications</div>
            {items.length === 0 ? (
              <p className="muted small bell-empty">No notifications yet.</p>
            ) : (
              <ul className="bell-list">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`bell-item ${n.read ? '' : 'unread'}`}
                    onClick={() => {
                      if (n.group) navigate(`/groups/${n.group}`);
                      setOpen(false);
                    }}
                  >
                    <div className="bell-item-title">
                      <span className="imp-dot" />
                      <strong>{n.fromName}</strong>
                      {n.groupName ? ` · ${n.groupName}` : ''}
                    </div>
                    {n.preview && <div className="bell-item-text">{n.preview}</div>}
                    <div className="bell-item-time">{formatTime(n.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
