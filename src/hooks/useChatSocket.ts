import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, getToken } from '../api/client';
import type { ChatMessage } from '../api/types';

export interface PresenceEvent {
  type: 'join' | 'leave';
  name: string;
}

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));

    socket.on('chat:history', (history: ChatMessage[]) => setMessages(history));

    socket.on('chat:new', (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    socket.on('chat:deleted', ({ id }: { id: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, deleted: true, text: undefined, fileId: undefined }
            : m,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendText = useCallback((text: string, replyTo?: string, scheduledFor?: string) => {
    return new Promise<{ scheduled?: boolean }>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error('Not connected'));
      socket.emit(
        'chat:send',
        { text, replyTo, scheduledFor },
        (res: { ok?: boolean; error?: string; scheduled?: boolean }) => {
          if (res?.error) reject(new Error(res.error));
          else resolve({ scheduled: res?.scheduled });
        },
      );
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    return new Promise<void>((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error('Not connected'));
      socket.emit('chat:delete', { messageId }, (res: { ok?: boolean; error?: string }) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      });
    });
  }, []);

  /** Called after an image is uploaded via REST so it appears immediately. */
  const appendLocal = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  return { messages, connected, error, sendText, deleteMessage, appendLocal };
}
