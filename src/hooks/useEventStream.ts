"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SystemEvent {
  cpu: number;
  ram: { used: number; total: number; percent: number };
  uptime: string;
  loadAvg: number[];
  timestamp: number;
}

export interface StatusEvent {
  agents: number;
  discover: { sites: number; errors: number };
  timestamp: number;
}

interface EventStreamState {
  connected: boolean;
  system: SystemEvent | null;
  status: StatusEvent | null;
  systemHistory: SystemEvent[];
}

const MAX_HISTORY = 60; // ~5 min of data at 5s intervals

export function useEventStream() {
  const [state, setState] = useState<EventStreamState>({
    connected: false,
    system: null,
    status: null,
    systemHistory: [],
  });
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource("/api/events");
    esRef.current = es;

    es.addEventListener("connected", () => {
      setState((prev) => ({ ...prev, connected: true }));
    });

    es.addEventListener("system", (e) => {
      try {
        const data: SystemEvent = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          system: data,
          systemHistory: [...prev.systemHistory.slice(-(MAX_HISTORY - 1)), data],
        }));
      } catch {}
    });

    es.addEventListener("status", (e) => {
      try {
        const data: StatusEvent = JSON.parse(e.data);
        setState((prev) => ({ ...prev, status: data }));
      } catch {}
    });

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }));
      es.close();
      esRef.current = null;
      // Reconnect after 3 seconds
      reconnectRef.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return state;
}
