import { useState, useEffect, useCallback, useRef } from "react";
import { listTickets, type TicketListResponse } from "../api/tickets";

interface UseTicketsOptions {
  status?: string;
  priority?: string;
  category?: string;
  assigned_agent_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export function useTickets(opts: UseTicketsOptions) {
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        status: opts.status,
        priority: opts.priority,
        category: opts.category,
        assigned_agent_id: opts.assigned_agent_id,
        search: opts.search,
        page: opts.page,
        page_size: opts.page_size,
      };
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
  }, [
    opts.status,
    opts.priority,
    opts.category,
    opts.assigned_agent_id,
    opts.search,
    opts.page,
    opts.page_size,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
