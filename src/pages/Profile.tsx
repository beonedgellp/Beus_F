import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, extractError } from '../api/client';
import Avatar from '../components/Avatar';
import { AVATAR_EMOJIS, AVATAR_COLORS } from '../data/avatars';
import type { User } from '../api/types';

export default function Profile() {
  const { user, updateUser, changePassword } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio ?? '');
      setAvatar(user.avatar ?? '');
      setAvatarColor(user.avatarColor ?? AVATAR_COLORS[0]);
    }
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setSavingProfile(true);
    try {
      const res = await api.patch<User>('/profile', {
        name: name.trim(),
        bio,
        avatar,
        avatarColor,
      });
      updateUser(res.data);
      setProfileMsg('Profile saved.');
      setTimeout(() => setProfileMsg((m) => (m === 'Profile saved.' ? '' : m)), 2500);
    } catch (err) {
      setProfileErr(extractError(err, 'Could not save profile'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (newPassword !== confirmPw) {
      setPwErr('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwErr('New password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPw('');
    } catch (err) {
      setPwErr(extractError(err, 'Could not change password'));
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="space-header">
        <h2>Profile</h2>
        <p className="muted">Personalise how you appear to the team.</p>
      </div>

      <form className="card profile-card" onSubmit={saveProfile}>
        <div className="profile-head">
          <Avatar name={name} avatar={avatar} color={avatarColor} size={72} />
          <div>
            <div className="profile-name-preview">{name || 'Your name'}</div>
            <div className="muted small">{user?.email}</div>
          </div>
        </div>

        {profileErr && <div className="alert-error">{profileErr}</div>}
        {profileMsg && <div className="alert-success">{profileMsg}</div>}

        <label className="field">
          <span>Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>

        <label className="field">
          <span>Bio</span>
          <textarea
            className="textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="A short line about you…"
          />
          <span className="muted small">{bio.length}/280</span>
        </label>

        <div className="field">
          <span>Pick an avatar</span>
          <div className="avatar-grid">
            {AVATAR_EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                className={`avatar-option ${avatar === e ? 'selected' : ''}`}
                onClick={() => setAvatar(e)}
                aria-label={`avatar ${e}`}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              className={`avatar-option ${avatar === '' ? 'selected' : ''}`}
              onClick={() => setAvatar('')}
              title="Use initials"
            >
              Aa
            </button>
          </div>
        </div>

        <div className="field">
          <span>Avatar colour</span>
          <div className="colour-picker">
            {AVATAR_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${avatarColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setAvatarColor(c)}
                aria-label={`colour ${c}`}
              />
            ))}
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={savingProfile}>
          {savingProfile ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <form className="card profile-card" onSubmit={savePassword}>
        <h3 className="profile-section-title">Change password</h3>

        {pwErr && <div className="alert-error">{pwErr}</div>}
        {pwMsg && <div className="alert-success">{pwMsg}</div>}

        <label className="field">
          <span>Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button className="btn-primary" type="submit" disabled={savingPw}>
          {savingPw ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
