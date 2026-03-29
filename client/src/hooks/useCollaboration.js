import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export default function useCollaboration({ docId, user, token, onRemoteUpdate, onUsersChange }) {
  const socketRef = useRef(null);
  const emitTimerRef = useRef(null);

  useEffect(() => {
    if (!docId || !token) return;

    const socket = io('/', {
      auth:              { token },
      transports:        ['websocket', 'polling'],
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-doc', docId);
    });

    socket.on('room-users', (users) => {
      onUsersChange?.(users.filter(u => u.userId !== String(user?.id)));
    });

    socket.on('user-joined', (userInfo) => {
      onUsersChange?.((prev) => {
        if (!Array.isArray(prev)) return [userInfo];
        if (prev.find(u => u.socketId === userInfo.socketId)) return prev;
        return [...prev, userInfo];
      });
    });

    socket.on('user-left', ({ socketId }) => {
      onUsersChange?.((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(u => u.socketId !== socketId);
      });
    });

    socket.on('doc-updated', ({ content, userId }) => {
      if (userId !== String(user?.id)) {
        onRemoteUpdate?.(content);
      }
    });

    return () => {
      socket.emit('leave-doc', docId);
      socket.disconnect();
      socketRef.current = null;
      clearTimeout(emitTimerRef.current);
    };
  }, [docId, token]); // eslint-disable-line

  const emitContent = useCallback((html) => {
    clearTimeout(emitTimerRef.current);
    emitTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('doc-update', { docId, content: html });
    }, 500);
  }, [docId]);

  return { emitContent };
}
