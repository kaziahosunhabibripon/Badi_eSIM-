import { useCallback, useEffect, useRef, useState } from "react";
import { listTickets } from "../api/tickets";
import type { TicketListResponse } from "../types";

export function useTickets(params: Record<string, string | number | undefined>) {
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const key = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await listTickets(params);
      if (reqId !== requestIdRef.current) return;
      setData(result);
    } catch (e) {
      if (reqId !== requestIdRef.current) return;
      const msg = e && typeof e === "object" && "message" in e ? (e as { message: string }).message : "Unable to load tickets.";
      setError(msg);
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
