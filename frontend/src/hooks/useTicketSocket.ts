import { useEffect, useRef, useCallback, useState } from "react";
import type { TicketMessageResponse, WebSocketMessage } from "../types";

interface UseTicketSocketOptions {
  ticketId: number;
  userId: number;
  onMessage: (message: TicketMessageResponse) => void;
}

export function useTicketSocket({ ticketId, userId, onMessage }: UseTicketSocketOptions) {
  const [connectionState, setConnectionState] = useState<"live" | "reconnecting" | "offline">("offline");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1);
  const onMessageRef = useCallback(onMessage, [onMessage]);
  const ticketIdRef = useRef(ticketId);
  const userIdRef = useRef(userId);
  const cancelledRef = useRef(false);

  useEffect(() => {
    ticketIdRef.current = ticketId;
    userIdRef.current = userId;
  }, [ticketId, userId]);

  const closeSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    closeSocket();

    const url = `${(import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/^http:/, "ws:").replace(/^https:/, "wss:")}/tickets/${ticketId}/ws?user_id=${userId}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      setConnectionState("offline");
      return;
    }
    wsRef.current = ws;
    backoffRef.current = 1;

    ws.onopen = () => {
      if (cancelledRef.current) return;
      setConnectionState("live");
      backoffRef.current = 1;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        if (data.ticket_id !== ticketIdRef.current) return;
        if (data.event !== "message.created") return;
        if (data.message.message_type === "INTERNAL_NOTE") return;
        onMessageRef(data.message);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (cancelledRef.current) return;
      wsRef.current = null;

      const code = (ws as unknown as { closeCode?: number }).closeCode ?? 0;
      if (code === 1008) {
        setConnectionState("offline");
        return;
      }

      setConnectionState("reconnecting");
      const timer = setTimeout(() => {
        if (cancelledRef.current) return;
        backoffRef.current = Math.min(backoffRef.current * 2, 15);
        reconnectTimerRef.current = null;
      }, backoffRef.current * 1000);
      reconnectTimerRef.current = timer;
    };

    ws.onerror = () => {
      if (cancelledRef.current) return;
      setConnectionState("offline");
    };

    return () => {
      cancelledRef.current = true;
      closeSocket();
    };
  }, [ticketId, userId, closeSocket]);

  return { connectionState };
}
