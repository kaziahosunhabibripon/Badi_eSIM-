import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity";
import { useTickets } from "../hooks/useTickets";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/States";
import { RelativeTime } from "../utils/RelativeTime";
import { listUsers } from "../api/users";
import type { TicketResponse, User } from "../types";

export function TicketListPage() {
  const navigate = useNavigate();
  const { user } = useIdentity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<User[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const category = searchParams.get("category") ?? "";
  const assignedAgentId = searchParams.get("assigned_agent_id") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === "any") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      next.set("page", "1");
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const { data, loading, error, refetch } = useTickets({
    status: status || undefined,
    priority: priority || undefined,
    category: category || undefined,
    assigned_agent_id: assignedAgentId || undefined,
    search: search || undefined,
    page,
    page_size: 20,
  });

  useEffect(() => {
    if (user?.role === "AGENT") {
      setAgentsLoading(true);
      listUsers("AGENT")
        .then(setAgents)
        .catch(() => setAgents([]))
        .finally(() => setAgentsLoading(false));
    }
  }, [user]);

  const isAgent = user?.role === "AGENT";
  const isCustomer = user?.role === "CUSTOMER";

  const hasFilters = status || priority || category || assignedAgentId || search;

  const emptyMessage =
    data && data.tickets.length === 0 && hasFilters
      ? "No tickets match your filters."
      : "No tickets found.";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Tickets</h1>
        {isCustomer && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/tickets/new")}
          >
            Create Ticket
          </button>
        )}
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search tickets..."
          value={search}
          onChange={(e) => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              updateParams({ search: e.target.value });
            }, 300);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              updateParams({ search: (e.target as HTMLInputElement).value });
            }
          }}
          aria-label="Search tickets"
        />
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
          <option value="WAITING_FOR_PROVIDER">Waiting for Provider</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        {isAgent && (
          <>
            <select
              value={priority}
              onChange={(e) => updateParams({ priority: e.target.value })}
              aria-label="Filter by priority"
            >
              <option value="">Any priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              aria-label="Filter by category"
            >
              <option value="">Any category</option>
              <option value="INSTALLATION">Installation</option>
              <option value="ACTIVATION">Activation</option>
              <option value="CONNECTIVITY">Connectivity</option>
              <option value="ORDER">Order</option>
              <option value="TOPUP">Top-up</option>
              <option value="REFUND">Refund</option>
              <option value="OTHER">Other</option>
            </select>
            <select
              value={assignedAgentId}
              onChange={(e) => updateParams({ assigned_agent_id: e.target.value })}
              aria-label="Filter by assignee"
              disabled={agentsLoading}
            >
              <option value="">Any agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </>
        )}
        {hasFilters && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSearchParams({ page: "1" });
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && <LoadingState text="Loading tickets..." />}

      {error && !loading && (
        <ErrorState message="Unable to load tickets." onRetry={refetch} />
      )}

      {!loading && !error && data && (
        <>
          <table aria-label="Ticket list">
            <caption style={{ textAlign: "left", fontWeight: 600, marginBottom: 8, color: "var(--text-h)" }}>
              {data.total} ticket{data.total !== 1 ? "s" : ""} found
            </caption>
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Subject</th>
                {isAgent && <th scope="col">Customer</th>}
                <th scope="col">Category</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                {isAgent && <th scope="col">Assignee</th>}
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map((t: TicketResponse) => (
                <tr
                  key={t.id}
                  tabIndex={0}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/tickets/${t.id}`);
                    }
                  }}
                  aria-label={`Ticket ${t.ticket_number}: ${t.subject}`}
                >
                  <td>
                    <Link to={`/tickets/${t.id}`}>{t.ticket_number}</Link>
                  </td>
                  <td>{t.subject}</td>
                  {isAgent && <td>{t.customer_name}</td>}
                  <td>{t.category}</td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  {isAgent && <td>{t.assigned_agent_name ?? "-"}</td>}
                  <td title={t.updated_at}><RelativeTime iso={t.updated_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.tickets.length === 0 && (
            <EmptyState message={emptyMessage} action={<button type="button" className="btn" onClick={() => setSearchParams({ page: "1" })}>Clear filters</button>} />
          )}

          {data.total_pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span>
                Page {data.page} of {data.total_pages}
              </span>
              <button
                type="button"
                className="btn"
                disabled={page >= data.total_pages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
