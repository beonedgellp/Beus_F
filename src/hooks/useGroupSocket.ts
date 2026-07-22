import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../api/socket';
import type { GroupMessage } from '../api/types';

/**
 * Live feed for one group. History is loaded via REST by the page; this hook
 * subscribes to the group's socket room and applies real-time updates.
 */
export function useGroupSocket(groupId: string | undefined) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const [incoming, setIncoming] = useState<GroupMessage | null>(null);
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('group:subscribe', groupId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('group:message', (msg: GroupMessage) => {
      if (msg.group === groupId) setIncoming(msg);
    });
    socket.on('group:deleted', ({ id }: { id: string }) => setDeletedId(id));
    socket.on('group:removed', () => setRemoved(true));

    return () => {
      socket.emit('group:unsubscribe', groupId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [groupId]);

  const clearIncoming = useCallback(() => setIncoming(null), []);
  const clearDeleted = useCallback(() => setDeletedId(null), []);

  return { connected, incoming, deletedId, removed, clearIncoming, clearDeleted };
}
