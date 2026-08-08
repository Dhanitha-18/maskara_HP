import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export type AdminPresence = {
  socketId: string;
  adminName: string;
  role: string;
  currentModule: string;
  lastActive: Date;
  status: 'online' | 'idle';
};

export type EditingLock = {
  resourceId: string;
  resourceType: string;
  adminName: string;
  socketId: string;
  lockedAt: Date;
};

export const initSocket = () => {
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    // We will emit admin_join from the PresenceProvider instead of here to include actual user info.
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });
};
