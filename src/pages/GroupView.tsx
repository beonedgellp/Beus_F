import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, downloadFile, extractError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import { useGroupSocket } from '../hooks/useGroupSocket';
import Avatar from '../components/Avatar';
import AuthImage from '../components/AuthImage';
import AuthMedia from '../components/AuthMedia';
import EmojiPicker from '../components/EmojiPicker';
import {
  SendIcon,
  PaperclipIcon,
  SmileIcon,
  TrashIcon,
  ReplyIcon,
  StarIcon,
  ClockIcon,
  UsersIcon,
  FileIcon,
  DownloadIcon,
  PlusIcon,
} from '../components/Icons';
import { formatBytes, formatTime } from '../utils/format';
import { renderWithLinks } from '../utils/linkify';
import type { Group, GroupMessage, Member } from '../api/types';

export default function GroupView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const prompt = usePrompt();
  const { incoming, deletedId, removed, clearIncoming, clearDeleted } = useGroupSocket(id);

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [important, setImportant] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);

  const [showMembers, setShowMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<Member[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? '' : n)), 3000);
  }

  async function loadAll() {
    try {
      const g = await api.get<Group>(`/groups/${id}`);
      setGroup(g.data);
      if (g.data.isMember) {
        const m = await api.get<GroupMessage[]>(`/groups/${id}/messages`);
        setMessages(m.data);
      }
    } catch (err) {
      setError(extractError(err, 'Failed to load group'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    didInitialScroll.current = false;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Jump straight to the newest message on first load; smooth-scroll after.
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({
      behavior: didInitialScroll.current ? 'smooth' : 'auto',
    });
    didInitialScroll.current = true;
  }, [messages]);

  // Auto-grow the composer to fit its text (up to the CSS max-height).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  /** Ctrl/Cmd+Enter sends; plain Enter adds a new line (the box grows). */
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  // apply live socket updates
  useEffect(() => {
    if (!incoming) return;
    setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    clearIncoming();
  }, [incoming, clearIncoming]);

  useEffect(() => {
    if (!deletedId) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === deletedId ? { ...m, deleted: true, text: undefined, fileId: undefined } : m,
      ),
    );
    clearDeleted();
  }, [deletedId, clearDeleted]);

  // The group was deleted by someone — leave the view.
  useEffect(() => {
    if (removed) navigate('/groups');
  }, [removed, navigate]);

  function buildExtras(form?: FormData) {
    const scheduledFor = scheduleValue ? new Date(scheduleValue).toISOString() : undefined;
    if (form) {
      if (important) form.append('important', 'true');
      if (scheduledFor) form.append('scheduledFor', scheduledFor);
      if (replyingTo) form.append('replyTo', replyingTo.id);
      return null;
    }
    return { important: important || undefined, scheduledFor, replyTo: replyingTo?.id };
  }

  function resetComposerFlags() {
    setImportant(false);
    setScheduleValue('');
    setReplyingTo(null);
    setShowSchedule(false);
    setPendingFile(null);
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (pendingFile) {
      await uploadPending();
      return;
    }
    const value = text.trim();
    if (!value) return;
    setSendError('');
    setText('');
    const extras = buildExtras() as { important?: boolean; scheduledFor?: string; replyTo?: string };
    resetComposerFlags();
    try {
      const res = await api.post<{ scheduled?: boolean }>(`/groups/${id}/messages`, {
        text: value,
        ...extras,
      });
      if (res.data?.scheduled) flash('Scheduled — it will be sent later and marked important.');
    } catch (err) {
      setSendError(extractError(err, 'Failed to send'));
      setText(value);
    }
  }

  /** Upload the staged file when the user presses Send. */
  async function uploadPending() {
    if (!pendingFile) return;
    setUploading(true);
    setSendError('');
    try {
      const form = new FormData();
      form.append('file', pendingFile);
      const caption = text.trim();
      if (caption) form.append('caption', caption);
      buildExtras(form);
      const res = await api.post<{ scheduled?: boolean }>(`/groups/${id}/attachment`, form);
      if (res.data?.scheduled) flash('File scheduled — it will be sent later and marked important.');
      setText('');
      resetComposerFlags();
    } catch (err) {
      setSendError(extractError(err, 'Failed to send file'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  /** Selecting a file only stages it; it's sent when the user presses Send. */
  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const f = items[i].getAsFile();
        if (f) {
          e.preventDefault();
          setPendingFile(f);
          return;
        }
      }
    }
  }

  async function onDelete(mid: string) {
    try {
      await api.delete(`/groups/${id}/messages/${mid}`);
    } catch (err) {
      setSendError(extractError(err, 'Failed to delete'));
    }
  }

  async function toggleMembers() {
    const next = !showMembers;
    setShowMembers(next);
    if (next && allUsers.length === 0) {
      try {
        const res = await api.get<Member[]>('/users');
        setAllUsers(res.data);
      } catch {
        /* ignore */
      }
    }
  }

  async function addMember(userId: string) {
    try {
      const res = await api.post<Group>(`/groups/${id}/members`, { userId });
      setGroup(res.data);
    } catch (err) {
      setError(extractError(err, 'Could not add member'));
    }
  }

  async function onDeleteGroup() {
    if (!group) return;
    const typed = await prompt({
      title: 'Delete this group',
      label: `This permanently deletes all messages and files. Type "${group.name}" to confirm.`,
      placeholder: group.name,
      confirmText: 'Delete group',
    });
    if (typed == null) return;
    if (typed.trim() !== group.name) {
      setError('The name did not match — the group was not deleted.');
      return;
    }
    try {
      await api.delete(`/groups/${group.id}`, { data: { name: group.name } });
      navigate('/groups');
    } catch (err) {
      setError(extractError(err, 'Could not delete the group'));
    }
  }

  if (loading) return <div className="space-page"><p className="muted">Loading…</p></div>;
  if (!group)
    return (
      <div className="space-page">
        <div className="alert-error">{error || 'Group not found.'}</div>
      </div>
    );

  const memberIds = new Set(group.members.map((m) => m.id));
  const addable = allUsers.filter((u) => !memberIds.has(u.id));

  return (
    <div className={`group-view ${group.isMember ? '' : 'not-member'}`}>
      <div className="group-topline" style={{ borderColor: group.colour }}>
        <button className="btn-ghost btn-sm" onClick={() => navigate('/groups')}>
          ← Groups
        </button>
        <span className="group-title" style={{ color: group.colour }}>
          {group.name}
        </span>
        <button className="btn-ghost btn-sm btn-icon" onClick={toggleMembers}>
          <UsersIcon size={15} />
          <span className="btn-icon-label">{group.memberCount}</span>
        </button>
      </div>

      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}

      {showMembers && (
        <div className="card members-panel">
          <div className="members-title">Members</div>
          <div className="members-list">
            {group.members.map((m) => (
              <div className="member-row" key={m.id}>
                <Avatar name={m.name} avatar={m.avatar} color={m.avatarColor} size={28} />
                <span>{m.name}</span>
              </div>
            ))}
          </div>
          {group.isMember && addable.length > 0 && (
            <>
              <div className="members-title">Add someone</div>
              <div className="members-list">
                {addable.map((u) => (
                  <div className="member-row" key={u.id}>
                    <Avatar name={u.name} avatar={u.avatar} color={u.avatarColor} size={28} />
                    <span>{u.name}</span>
                    <button
                      className="btn-ghost btn-sm btn-icon add-btn"
                      onClick={() => addMember(u.id)}
                    >
                      <PlusIcon size={14} />
                      <span className="btn-icon-label">Add</span>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {group.isMember && (
            <div className="members-danger">
              <button className="btn-danger btn-sm" onClick={onDeleteGroup}>
                Delete group
              </button>
              <span className="muted small">
                Permanently removes all messages &amp; files for everyone.
              </span>
            </div>
          )}
        </div>
      )}

      {!group.isMember ? (
        <div className="card group-locked-panel">
          <p>You&apos;re not a member of this group yet.</p>
          <p className="muted small">
            Ask someone already in <strong>{group.name}</strong> to add you. You can see the group
            exists, but messages and files are private to members.
          </p>
        </div>
      ) : (
        <>
          <div className="chat-messages group-messages">
            {messages.length === 0 && (
              <p className="muted center empty-hint">No messages yet in this group.</p>
            )}
            {messages.map((m) => {
              const mine = m.sender.id === user?.id;
              const hasFile = !m.deleted && !!m.fileId;
              const hasMedia = !m.deleted && (m.kind === 'image' || m.kind === 'video');
              const canDelete =
                mine &&
                !m.deleted &&
                Date.now() - new Date(m.createdAt).getTime() <= 3 * 60 * 60 * 1000;
              return (
                <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
                  {!mine && (
                    <Avatar
                      name={m.sender.name}
                      avatar={m.sender.avatar}
                      color={m.sender.avatarColor}
                      size={30}
                      className="msg-avatar"
                    />
                  )}
                  <div
                    className={`msg-bubble ${m.deleted ? 'deleted' : ''} ${hasMedia ? 'has-media' : ''} ${
                      m.important && !m.deleted ? 'important' : ''
                    }`}
                  >
                    {m.important && !m.deleted && (
                      <div className="imp-tag">
                        <StarIcon size={12} /> Important
                      </div>
                    )}
                    {!mine && !m.deleted && <div className="msg-sender">{m.sender.name}</div>}
                    {!m.deleted && m.reply && (
                      <div className="msg-quote">
                        <span className="msg-quote-author">{m.reply.senderName}</span>
                        <span className="msg-quote-text">
                          {m.reply.deleted
                            ? 'deleted message'
                            : m.reply.text || m.reply.fileName || m.reply.kind}
                        </span>
                      </div>
                    )}
                    {m.deleted ? (
                      <em className="msg-deleted">This message was deleted</em>
                    ) : m.kind === 'image' && m.fileId ? (
                      <div className="msg-image">
                        <AuthImage path={`/groups/${id}/file/${m.fileId}`} alt={m.fileName} />
                        {m.text && <div className="msg-caption">{renderWithLinks(m.text)}</div>}
                      </div>
                    ) : m.kind === 'video' && m.fileId ? (
                      <div className="msg-media">
                        <div className="video-resize">
                          <AuthMedia
                            path={`/groups/${id}/file/${m.fileId}`}
                            kind="video"
                            className="msg-video"
                          />
                        </div>
                        {m.text && <div className="msg-caption">{renderWithLinks(m.text)}</div>}
                      </div>
                    ) : m.kind === 'audio' && m.fileId ? (
                      <div className="msg-media">
                        <AuthMedia
                          path={`/groups/${id}/file/${m.fileId}`}
                          kind="audio"
                          className="msg-audio"
                        />
                        {m.text && <div className="msg-caption">{renderWithLinks(m.text)}</div>}
                      </div>
                    ) : m.kind === 'file' && m.fileId ? (
                      <div className="file-chip">
                        <span className="file-chip-icon">
                          <FileIcon size={20} />
                        </span>
                        <div className="file-chip-info">
                          <div className="file-chip-name" title={m.fileName}>
                            {m.fileName}
                          </div>
                          <div className="file-chip-size">{formatBytes(m.size)}</div>
                        </div>
                        <button
                          className="icon-btn btn-sm"
                          onClick={() =>
                            downloadFile(`/groups/${id}/file/${m.fileId}/download`, m.fileName || 'file')
                          }
                          title="Download"
                          aria-label="Download"
                        >
                          <DownloadIcon size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="msg-text">{renderWithLinks(m.text || '')}</div>
                    )}

                    <div className="msg-meta">
                      <span className="msg-time">{formatTime(m.createdAt)}</span>
                      {!m.deleted && (
                        <button
                          className="msg-action"
                          onClick={() => {
                            setReplyingTo(m);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          title="Reply"
                          aria-label="Reply"
                        >
                          <ReplyIcon size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="msg-action msg-action-danger"
                          onClick={() => onDelete(m.id)}
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {sendError && <div className="alert-error">{sendError}</div>}

          {replyingTo && (
            <div className="reply-bar">
              <span className="reply-bar-accent" />
              <div className="reply-bar-info">
                <span className="reply-bar-label">Replying to {replyingTo.sender.name}</span>
                <span className="reply-bar-text">
                  {replyingTo.text || replyingTo.fileName || 'attachment'}
                </span>
              </div>
              <button
                type="button"
                className="icon-btn btn-sm"
                onClick={() => setReplyingTo(null)}
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}

          {(important || scheduleValue) && (
            <div className="composer-flags">
              {important && (
                <span className="flag-chip">
                  <StarIcon size={12} /> Important
                  <button onClick={() => setImportant(false)} aria-label="Remove important">
                    ✕
                  </button>
                </span>
              )}
              {scheduleValue && (
                <span className="flag-chip">
                  <ClockIcon size={12} /> Sends {formatTime(new Date(scheduleValue).toISOString())}
                  <button onClick={() => setScheduleValue('')} aria-label="Cancel schedule">
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}

          {pendingFile && (
            <div className="pending-file">
              <span className="file-chip-icon">
                <FileIcon size={18} />
              </span>
              <div className="file-chip-info">
                <div className="file-chip-name" title={pendingFile.name}>
                  {pendingFile.name}
                </div>
                <div className="file-chip-size">
                  {formatBytes(pendingFile.size)} · press Send to share
                </div>
              </div>
              <button
                type="button"
                className="icon-btn btn-sm"
                onClick={() => setPendingFile(null)}
                title="Remove file"
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          )}

          <form className="chat-input" onSubmit={sendMessage}>
            <div className="chat-input-field">
              <textarea
                ref={inputRef}
                className="chat-textarea"
                rows={1}
                placeholder="Message the group…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
              />
              {showEmoji && (
                <EmojiPicker onSelect={(e) => setText((t) => t + e)} onClose={() => setShowEmoji(false)} />
              )}
            </div>
            <input ref={fileRef} type="file" hidden onChange={onPickFile} />
            <button type="button" className="icon-btn" onClick={() => setShowEmoji((s) => !s)} title="Emoji">
              <SmileIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Attach a file"
            >
              <PaperclipIcon />
            </button>
            <button
              type="button"
              className={`icon-btn ${important ? 'active-imp' : ''}`}
              onClick={() => setImportant((v) => !v)}
              title="Mark important (notifies everyone)"
              aria-label="Mark important"
            >
              <StarIcon />
            </button>
            <span className="composer-tool">
              <button
                type="button"
                className={`icon-btn ${scheduleValue ? 'active-imp' : ''}`}
                onClick={() => setShowSchedule((s) => !s)}
                title="Schedule / timer message"
                aria-label="Schedule message"
              >
                <ClockIcon />
              </button>
              {showSchedule && (
                <div className="schedule-popover">
                  <div className="schedule-title">Send later (auto-marked important)</div>
                  <input
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(e) => setScheduleValue(e.target.value)}
                  />
                  <div className="schedule-actions">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setScheduleValue('');
                        setShowSchedule(false);
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => setShowSchedule(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </span>
            <span className="composer-break" aria-hidden="true" />
            <button
              type="submit"
              className="btn-primary btn-icon"
              disabled={uploading || (!pendingFile && !text.trim())}
            >
              <SendIcon size={16} />
              <span className="btn-icon-label">{uploading ? 'Sending…' : 'Send'}</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
