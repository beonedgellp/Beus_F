import { ChangeEvent, ClipboardEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, extractError } from '../api/client';
import AuthImage from '../components/AuthImage';
import { PaperclipIcon, ClipboardIcon, SendIcon, TrashIcon } from '../components/Icons';
import { formatTime } from '../utils/format';
import type { ChatMessage } from '../api/types';

export default function Chat() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { messages, connected, error, sendText, deleteMessage, appendLocal } = useChatSocket();
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSendError('');
    setText('');
    try {
      await sendText(value);
    } catch (err) {
      setSendError(extractError(err, 'Failed to send'));
      setText(value);
    }
  }

  /** Shared image sender used by the picker, paste event and paste button. */
  async function uploadImageFile(file: File) {
    setUploading(true);
    setSendError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<ChatMessage>('/chat/image', form);
      appendLocal(res.data);
    } catch (err) {
      setSendError(extractError(err, 'Failed to send image'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadImageFile(file);
  }

  /** Paste an image straight into the message box (Ctrl/Cmd+V). */
  async function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadImageFile(file);
          return;
        }
      }
    }
  }

  /** Explicit "paste from clipboard" button (uses the async Clipboard API). */
  async function onPasteButton() {
    setSendError('');
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clip of clipboardItems) {
        const imageType = clip.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await clip.getType(imageType);
          const ext = imageType.split('/')[1] || 'png';
          await uploadImageFile(new File([blob], `pasted-${Date.now()}.${ext}`, { type: imageType }));
          return;
        }
      }
      setSendError('No image found on the clipboard.');
    } catch {
      setSendError('Clipboard access was blocked. Try Ctrl+V inside the message box instead.');
    }
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

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>Team chat</h2>
        <span className={`status-pill ${connected ? 'online' : 'offline'}`}>
          <span className="dot" />
          {connected ? 'Connected' : 'Connecting…'}
        </span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="muted center empty-hint">No messages yet — start the conversation.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender.id === user?.id;
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <div className={`msg-bubble ${m.deleted ? 'deleted' : ''}`}>
                {!mine && !m.deleted && <div className="msg-sender">{m.sender.name}</div>}
                {m.deleted ? (
                  <em className="msg-deleted">This message was deleted</em>
                ) : m.kind === 'image' && m.fileId ? (
                  <div className="msg-image">
                    <AuthImage path={`/chat/file/${m.fileId}`} alt={m.fileName} />
                    {m.text && <div className="msg-caption">{m.text}</div>}
                  </div>
                ) : (
                  <div className="msg-text">{m.text}</div>
                )}
                <div className="msg-meta">
                  <span className="msg-time">{formatTime(m.createdAt)}</span>
                  {mine && !m.deleted && (
                    <button
                      className="msg-delete"
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

      <form className="chat-input" onSubmit={onSend}>
        <input
          type="text"
          placeholder="Type a message, or paste an image…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Attach a picture"
          aria-label="Attach a picture"
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
        <button type="submit" className="btn-primary btn-icon" disabled={!connected || uploading}>
          <SendIcon size={16} />
          <span className="btn-icon-label">{uploading ? 'Sending…' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
}
