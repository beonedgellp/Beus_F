import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuth } from '../context/AuthContext';
import { api, extractError } from '../api/client';
import AuthImage from '../components/AuthImage';
import { formatTime } from '../utils/format';
import type { ChatMessage } from '../api/types';

export default function Chat() {
  const { user } = useAuth();
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

  async function onPickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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

  async function onDelete(id: string) {
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
        <span className={`status-dot ${connected ? 'online' : 'offline'}`}>
          {connected ? 'connected' : 'connecting…'}
        </span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && <p className="muted center">No messages yet. Say hi 👋</p>}
        {messages.map((m) => {
          const mine = m.sender.id === user?.id;
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <div className="msg-bubble">
                {!mine && <div className="msg-sender">{m.sender.name}</div>}
                {m.deleted ? (
                  <em className="msg-deleted">message deleted</em>
                ) : m.kind === 'image' && m.fileId ? (
                  <div className="msg-image">
                    <AuthImage path={`/chat/file/${m.fileId}`} alt={m.fileName} />
                    {m.text && <div className="msg-caption">{m.text}</div>}
                  </div>
                ) : (
                  <div className="msg-text">{m.text}</div>
                )}
                <div className="msg-meta">
                  <span>{formatTime(m.createdAt)}</span>
                  {mine && !m.deleted && (
                    <button className="link-danger" onClick={() => onDelete(m.id)}>
                      delete
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
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickImage}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Send a picture"
        >
          {uploading ? '…' : '📎'}
        </button>
        <button type="submit" className="btn-primary" disabled={!connected}>
          Send
        </button>
      </form>
    </div>
  );
}
