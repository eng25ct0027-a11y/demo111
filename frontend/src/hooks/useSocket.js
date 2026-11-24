
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('cofounder-token');

    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL;

    if (!socketUrl) {
      console.error('VITE_SOCKET_URL is not configured');
      return;
    }

    const instance = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    instance.on('connect', () => {
      console.log('Socket connected:', instance.id);
    });

    instance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    instance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, []);

  return socket;
}
