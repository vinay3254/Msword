import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export default function useCollaboration({ docId, user, token, onRemoteUpdate, onUsersChange }) {
  const [collaboratorCursors, setCollaboratorCursors] = useState({});
  const socketRef = useRef(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onUsersChangeRef = useRef(onUsersChange);

  useEffect(() => { onRemoteUpdateRef.current = onRemoteUpdate; }, [onRemoteUpdate]);
  useEffect(() => { onUsersChangeRef.current = onUsersChange; }, [onUsersChange]);

  const emitContent = useCallback((html) => {
    socketRef.current?.emit('doc-update', { docId, content: html });
  }, [docId]);

  useEffect(() => {
    if (!token || !docId) return;

    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    socket.emit('join-doc', { docId });

    socket.on('doc-updated', ({ content }) => {
      onRemoteUpdateRef.current?.(content);
    });
    socket.on('room-users', (users) => {
      onUsersChangeRef.current?.(users);
    });
    socket.on('user-joined', (users) => {
      onUsersChangeRef.current?.(users);
    });
    socket.on('user-left', ({ userId }) => {
      setCollaboratorCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });
    socket.on('cursor-updated', ({ userId, userName, color, position }) => {
      setCollaboratorCursors(prev => ({
        ...prev,
        [userId]: { userName, color, position }
      }));
    });
    socket.on('connect_error', (err) => {
      console.warn('Socket error:', err.message);
    });

    return () => {
      socket.emit('leave-doc', { docId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [docId, token]);

  return { emitContent, collaboratorCursors };
}
