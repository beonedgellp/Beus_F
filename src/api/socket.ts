import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, getToken } from './client';

/** Create a new authenticated socket connection. Caller disconnects on unmount. */
export function createSocket(): Socket {
  return io(SOCKET_URL, {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
  });
}
