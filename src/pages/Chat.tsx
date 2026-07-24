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
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, downloadFile, extractError } from '../api/client';
import { CSSProperties } from 'react';
import AuthImage from '../components/AuthImage';
import AuthMedia from '../components/AuthMedia';
import Avatar from '../components/Avatar';
import EmojiPicker from '../components/EmojiPicker';
import ChatThemePicker from '../components/ChatThemePicker';
import {
  PaperclipIcon,
  ClipboardIcon,
  SendIcon,
  TrashIcon,
  SmileIcon,
  FileIcon,
  DownloadIcon,
  MoveToCollectiveIcon,
  PaletteIcon,
  ReplyIcon,
  ClockIcon,
} from '../components/Icons';
import { formatBytes, formatTime } from '../utils/format';
import { renderWithLinks } from '../utils/linkify';
import { contrastText } from '../utils/color';
import type { ChatMessage } from '../api/types';

export default function Chat() {
  const { user, updateUser } = useAuth();
  const confirm = useConfirm();
  const { messages, connected, error, sendText, deleteMessage, appendLocal } = useChatSocket();
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [saveMenu, setSaveMenu] = useState<string | null>(null);
  const [chatBg, setChatBg] = useState('');
  const [myBubble, setMyBubble] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [scheduleValue, setScheduleValue] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);

  function replyPreview(m: ChatMessage): string {
    if (m.deleted) return 'deleted message';
    return m.text || m.fileName || (m.kind === 'text' ? '' : m.kind);
  }
  function startReply(m: ChatMessage) {
    setReplyingTo(m);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Land on the newest message: jump instantly on first load (no visible
  // scroll), then smooth-scroll for messages that arrive afterwards.
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({
      behavior: didInitialScroll.current ? 'smooth' : 'auto',
    });
    didInitialScroll.current = true;
  }, [messages]);

  // Auto-grow the composer to fit its text (up to the CSS max-height, then it
  // scrolls). Runs whenever the text changes (typing, emoji insert, clearing).
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

  // Chat colour preferences live on the user's profile, so they follow the
  // user across devices.
  useEffect(() => {
    setChatBg(user?.chatBg || '');
    setMyBubble(user?.chatBubble || '');
  }, [user?.id, user?.chatBg, user?.chatBubble]);

  function saveColors(bg: string, bubble: string) {
    updateUser({ chatBg: bg, chatBubble: bubble });
    api.patch('/profile', { chatBg: bg, chatBubble: bubble }).catch(() => undefined);
  }
  function changeBg(c: string) {
    setChatBg(c);
    saveColors(c, myBubble);
  }
  function changeBubble(c: string) {
    setMyBubble(c);
    saveColors(chatBg, c);
  }
  function resetTheme() {
    setChatBg('');
    setMyBubble('');
    saveColors('', '');
  }

  const chatStyle: CSSProperties = {};
  if (chatBg) (chatStyle as Record<string, string>)['--chat-bg'] = chatBg;
  if (myBubble) {
    (chatStyle as Record<string, string>)['--my-bubble'] = myBubble;
    (chatStyle as Record<string, string>)['--my-bubble-text'] = contrastText(myBubble);
  }

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice((n) => (n === message ? '' : n)), 2500);
  }

  function scheduledIso(): string | undefined {
    return scheduleValue ? new Date(scheduleValue).toISOString() : undefined;
  }

  /** Upload the staged file (only when the user presses Send). */
  async function uploadPending() {
    if (!pendingFile) return;
    setUploading(true);
    setSendError('');
    try {
      const form = new FormData();
      form.append('file', pendingFile);
      const caption = text.trim();
      if (caption) form.append('caption', caption);
      if (replyingTo) form.append('replyTo', replyingTo.id);
      const iso = scheduledIso();
      if (iso) form.append('scheduledFor', iso);
      const res = await api.post<ChatMessage & { scheduled?: boolean }>('/chat/attachment', form);
      if ((res.data as { scheduled?: boolean }).scheduled) {
        flash('Scheduled — it will be sent at the set time.');
      } else {
        appendLocal(res.data);
      }
      setPendingFile(null);
      setText('');
      setReplyingTo(null);
      setScheduleValue('');
      setShowSchedule(false);
    } catch (err) {
      setSendError(extractError(err, 'Failed to send attachment'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (pendingFile) {
      await uploadPending();
      return;
    }
    const value = text.trim();
    if (!value) return;
    setSendError('');
    setText('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    const iso = scheduledIso();
    setScheduleValue('');
    setShowSchedule(false);
    try {
      const res = await sendText(value, replyId, iso);
      if (res?.scheduled) flash('Scheduled — it will be sent at the set time.');
    } catch (err) {
      setSendError(extractError(err, 'Failed to send'));
      setText(value);
    }
  }

  /** Selecting a file only stages it; it's sent when the user presses Send. */
  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    if (fileRef.current) fileRef.current.value = '';
  }

  /** Paste an image into the box (Ctrl/Cmd+V) - staged, not auto-sent. */
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setPendingFile(file);
          return;
        }
      }
    }
  }

  /** Explicit "paste from clipboard" button - stages the image. */
  async function onPasteButton() {
    setSendError('');
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clip of clipboardItems) {
        const imageType = clip.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await clip.getType(imageType);
          const ext = imageType.split('/')[1] || 'png';
          setPendingFile(new File([blob], `pasted-${Date.now()}.${ext}`, { type: imageType }));
          return;
        }
      }
      setSendError('No image found on the clipboard.');
    } catch {
      setSendError('Clipboard access was blocked. Try Ctrl+V inside the message box instead.');
    }
  }

  function addEmoji(emoji: string) {
    setText((t) => t + emoji);
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: 'Delete message',
      message: 'Delete this message for everyone? This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMessage(id);
    } catch (err) {
      setSendError(extractError(err, 'Failed to delete'));
    }
  }

  async function saveToSpace(m: ChatMessage, target: 'personal' | 'collective') {
    setSaveMenu(null);
    try {
      await api.post(`/chat/${m.id}/save`, { target });
      flash(
        target === 'collective'
          ? `Saved "${m.fileName}" to the Collective space.`
          : `Saved "${m.fileName}" to your Personal space.`,
      );
    } catch (err) {
      setSendError(extractError(err, 'Could not save file'));
    }
  }

  async function downloadAttachment(m: ChatMessage) {
    try {
      await downloadFile(`/chat/file/${m.fileId}/download`, m.fileName || 'file');
    } catch (err) {
      setSendError(extractError(err, 'Download failed'));
    }
  }

  return (
    <div className="chat-page" style={chatStyle}>
      <div className="chat-header">
        <h2>Team chat</h2>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {notice && <div className="alert-success">{notice}</div>}

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted center empty-hint">No messages yet — start the conversation.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === user?.id;
          const hasFile = !m.deleted && !!m.fileId;
          const hasMedia = !m.deleted && (m.kind === 'image' || m.kind === 'video');
          // Messages can only be deleted within 3 hours of sending.
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
                className={`msg-bubble ${m.deleted ? 'deleted' : ''} ${hasMedia ? 'has-media' : ''}`}
              >
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
                    <AuthImage path={`/chat/file/${m.fileId}`} alt={m.fileName} />
                    {m.text && <div className="msg-caption">{renderWithLinks(m.text)}</div>}
                  </div>
                ) : m.kind === 'video' && m.fileId ? (
                  <div className="msg-media">
                    <div className="video-resize" title="Drag the bottom-right corner to resize">
                      <AuthMedia
                        path={`/chat/file/${m.fileId}`}
                        kind="video"
                        className="msg-video"
                      />
                    </div>
                    {m.text && <div className="msg-caption">{renderWithLinks(m.text)}</div>}
                  </div>
                ) : m.kind === 'audio' && m.fileId ? (
                  <div className="msg-media">
                    <AuthMedia path={`/chat/file/${m.fileId}`} kind="audio" className="msg-audio" />
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
                      onClick={() => downloadAttachment(m)}
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
                      onClick={() => startReply(m)}
                      title="Reply"
                      aria-label="Reply"
                    >
                      <ReplyIcon size={14} />
                    </button>
                  )}
                  {hasFile && (
                    <span className="save-wrap">
                      <button
                        className="msg-action"
                        onClick={() => setSaveMenu((s) => (s === m.id ? null : m.id))}
                        title="Save to a space"
                        aria-label="Save to a space"
                      >
                        <MoveToCollectiveIcon size={14} />
                      </button>
                      {saveMenu === m.id && (
                        <span className="save-menu">
                          <button onClick={() => saveToSpace(m, 'personal')}>
                            Save to Personal
                          </button>
                          <button onClick={() => saveToSpace(m, 'collective')}>
                            Save to Collective
                          </button>
                        </span>
                      )}
                    </span>
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
            <span className="reply-bar-text">{replyPreview(replyingTo)}</span>
          </div>
          <button
            type="button"
            className="icon-btn btn-sm"
            onClick={() => setReplyingTo(null)}
            title="Cancel reply"
            aria-label="Cancel reply"
          >
            ✕
          </button>
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

      {scheduleValue && (
        <div className="composer-flags">
          <span className="flag-chip">
            <ClockIcon size={12} /> Sends {formatTime(new Date(scheduleValue).toISOString())}
            <button onClick={() => setScheduleValue('')} aria-label="Cancel schedule">
              ✕
            </button>
          </span>
        </div>
      )}

      <form className="chat-input" onSubmit={onSend}>
        <div className="chat-input-field">
          <textarea
            ref={inputRef}
            className="chat-textarea"
            rows={1}
            placeholder="Type a message, or paste an image…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() =>
              setTimeout(() => bottomRef.current?.scrollIntoView({ block: 'end' }), 300)
            }
          />
          {showEmoji && (
            <EmojiPicker
              onSelect={(e) => {
                addEmoji(e);
              }}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />
        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowEmoji((s) => !s)}
          title="Emoji"
          aria-label="Emoji"
        >
          <SmileIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Attach a file"
          aria-label="Attach a file"
        >
          <PaperclipIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onPasteButton}
          disabled={uploading}
          title="Paste image from clipboard"
          aria-label="Paste image from clipboard"
        >
          <ClipboardIcon />
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
              <div className="schedule-title">Send later</div>
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
        <span className="composer-tool">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowTheme((s) => !s)}
            title="Chat colours"
            aria-label="Chat colours"
          >
            <PaletteIcon />
          </button>
          {showTheme && (
            <ChatThemePicker
              bg={chatBg}
              bubble={myBubble}
              onChangeBg={changeBg}
              onChangeBubble={changeBubble}
              onReset={resetTheme}
              onClose={() => setShowTheme(false)}
            />
          )}
        </span>
        <button
          type="submit"
          className="btn-primary btn-icon"
          disabled={!connected || uploading || (!pendingFile && !text.trim())}
        >
          <SendIcon size={16} />
          <span className="btn-icon-label">{uploading ? 'Sending…' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
}
