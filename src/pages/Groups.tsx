import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractError } from '../api/client';
import Avatar from '../components/Avatar';
import { LABEL_COLOURS } from '../components/UploadForm';
import { UsersIcon, LockIcon, PlusIcon } from '../components/Icons';
import type { Group } from '../api/types';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [colour, setColour] = useState(LABEL_COLOURS[0]);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const res = await api.get<Group[]>('/groups');
      setGroups(res.data);
    } catch (err) {
      setError(extractError(err, 'Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setCreating(true);
    setError('');
    try {
      const res = await api.post<Group>('/groups', { name: n, colour });
      setName('');
      navigate(`/groups/${res.data.id}`);
    } catch (err) {
      setError(extractError(err, 'Could not create group'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-page">
      <div className="space-header">
        <h2>Groups</h2>
        <p className="muted">
          Create a group, add teammates, and share messages &amp; files. Everyone can see groups,
          but you can only join if a member adds you.
        </p>
      </div>

      <form className="card group-create" onSubmit={onCreate}>
        <input
          className="group-name-input"
          placeholder="New group name…"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="colour-picker">
          {LABEL_COLOURS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${colour === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColour(c)}
              aria-label={`colour ${c}`}
            />
          ))}
        </div>
        <button className="btn-primary btn-icon" type="submit" disabled={creating || !name.trim()}>
          <PlusIcon size={16} />
          <span className="btn-icon-label">{creating ? 'Creating…' : 'Create group'}</span>
        </button>
      </form>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="muted">No groups yet. Create the first one above.</p>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <div className="group-card" key={g.id} style={{ borderLeftColor: g.colour }}>
              <div className="group-card-head">
                <span className="group-dot" style={{ background: g.colour }} />
                <span className="group-name">{g.name}</span>
              </div>
              <div className="group-members">
                {g.members.slice(0, 5).map((m) => (
                  <span key={m.id} className="group-member-avatar">
                    <Avatar name={m.name} avatar={m.avatar} color={m.avatarColor} size={26} />
                  </span>
                ))}
                <span className="group-count">
                  <UsersIcon size={14} /> {g.memberCount}
                </span>
              </div>
              <div className="group-actions">
                {g.isMember ? (
                  <button className="btn-primary btn-sm" onClick={() => navigate(`/groups/${g.id}`)}>
                    Open
                  </button>
                ) : (
                  <span className="group-locked">
                    <LockIcon size={14} /> Ask a member to add you
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
