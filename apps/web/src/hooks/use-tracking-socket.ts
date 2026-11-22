'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:4000';

type StatusEvent = {
  packageId: string;
  trackingNumber: string;
  status: string;
  riderName?: string;
};

type UseTrackingSocketOptions = {
  onUpdate?: (deliveries: any[]) => void;
  onStatus?: (event: StatusEvent) => void;
  enabled?: boolean;
};

export function useTrackingSocket({ onUpdate, onStatus, enabled = true }: UseTrackingSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onStatusRef = useRef(onStatus);

  onUpdateRef.current = onUpdate;
  onStatusRef.current = onStatus;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${API_BASE}/tracking`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      socket.emit('subscribe');
    });

    socket.on('tracking:update', (deliveries: any[]) => {
      onUpdateRef.current?.(deliveries);
    });

    socket.on('tracking:status', (event: StatusEvent) => {
      onStatusRef.current?.(event);
    });

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [enabled, connect]);

  const isConnected = () => socketRef.current?.connected ?? false;

  return { isConnected };
}
