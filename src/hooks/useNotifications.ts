import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { createSocket } from '../api/socket';
import type { NotificationItem } from '../api/types';

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ items: NotificationItem[]; unread: number }>('/notifications');
      setItems(res.data.items);
      setUnread(res.data.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live notifications over the socket (server pushes to the user's room).
  useEffect(() => {
    const socket = createSocket();
    socket.on('notification:new', (n: NotificationItem) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const markAllRead = useCallback(async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.post('/notifications/read-all');
    } catch {
      /* ignore */
    }
  }, []);

  return { items, unread, refresh, markAllRead };
}
