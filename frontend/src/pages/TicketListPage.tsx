import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Select } from "../components/ui/Select";
import { useIdentity } from "../hooks/useIdentity";
import { useTickets } from "../hooks/useTickets";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { LoadingState, ErrorState, EmptyState } from "../components/States";
import { RelativeTime } from "../utils/RelativeTime";
import { listUsers } from "../api/users";
import { Button } from "../components/ui/Button";
import { CreateTicketModal } from "../components/CreateTicketModal";
import type { TicketResponse, User } from "../types";

export function TicketListPage() {
  const navigate = useNavigate();
  const { user } = useIdentity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<User[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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

  const activeFilters = [
    status ? { key: "status", label: "Status", value: status } : null,
    priority ? { key: "priority", label: "Priority", value: priority } : null,
    category ? { key: "category", label: "Category", value: category } : null,
    assignedAgentId ? { key: "assignee", label: "Assignee", value: agents.find((a) => String(a.id) === assignedAgentId)?.name ?? assignedAgentId } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  const clearAllFilters = () => {
    setSearchParams({ page: "1" });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isCustomer ? "My Support Tickets" : "Support Tickets"}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isCustomer ? "Track the progress of your support requests." : "Manage customer conversations, assignments and support workflows."}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} className="mr-1" /> New Ticket
        </Button>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full"
            >
              {f.label}: {f.value}
              <button
                type="button"
                onClick={() => updateParams({ [f.key]: "" })}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 text-primary-500"
                aria-label={`Remove ${f.label} filter`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700 font-medium ml-1"
            onClick={clearAllFilters}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-shadow"
          />
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
        <Select value={status} onChange={(e) => updateParams({ status: e.target.value })} aria-label="Filter by status" className="w-auto">
          <option value="">Any status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
          <option value="WAITING_FOR_PROVIDER">Waiting for Provider</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </Select>
        {isAgent && (
          <>
            <Select value={priority} onChange={(e) => updateParams({ priority: e.target.value })} aria-label="Filter by priority" className="w-auto">
              <option value="">Any priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
            <Select value={category} onChange={(e) => updateParams({ category: e.target.value })} aria-label="Filter by category" className="w-auto">
              <option value="">Any category</option>
              <option value="INSTALLATION">Installation</option>
              <option value="ACTIVATION">Activation</option>
              <option value="CONNECTIVITY">Connectivity</option>
              <option value="ORDER">Order</option>
              <option value="TOPUP">Top-up</option>
              <option value="REFUND">Refund</option>
              <option value="OTHER">Other</option>
            </Select>
            <Select
              value={assignedAgentId}
              onChange={(e) => updateParams({ assigned_agent_id: e.target.value })}
              aria-label="Filter by assignee"
              disabled={agentsLoading}
              className="w-auto"
            >
              <option value="">Any agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </>
        )}
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={() => { setSearchParams({ page: "1" }); }}>
            Clear filters
          </Button>
        )}
      </div>

      {data && data.tickets.length > 0 && (
        <div className="md:hidden space-y-3">
          {data.tickets.map((t: TicketResponse) => (
            <div
              key={t.id}
              onClick={() => navigate(`/tickets/${t.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-all"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") navigate(`/tickets/${t.id}`); }}
              aria-label={`Ticket ${t.ticket_number}: ${t.subject}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-mono text-xs text-slate-500">{t.ticket_number}</span>
                  <h3 className="text-sm font-medium text-slate-900 mt-0.5">{t.subject}</h3>
                </div>
                <StatusBadge status={t.status} />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>{t.category}</span>
                <PriorityBadge priority={t.priority} />
                {isAgent && <span>{t.assigned_agent_name ?? "Unassigned"}</span>}
                <span><RelativeTime iso={t.updated_at} /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hidden md:block">
        {loading && <LoadingState text="Loading tickets..." />}
        {error && !loading && <ErrorState message="Unable to load tickets." onRetry={refetch} />}
        {!loading && !error && data && (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table aria-label="Ticket list" className="w-full text-sm">
                <caption className="text-left px-4 py-3 text-sm font-semibold text-slate-900">
                  {data.total} ticket{data.total !== 1 ? "s" : ""} found
                </caption>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Ticket</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Subject</th>
                    {isAgent && <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Customer</th>}
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Category</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Priority</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                    {isAgent && <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Assignee</th>}
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
                      className="cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link to={`/tickets/${t.id}`} className="font-mono text-xs text-indigo-600 font-medium hover:underline">{t.ticket_number}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{t.subject}</td>
                      {isAgent && <td className="px-4 py-3 text-slate-600">{t.customer_name}</td>}
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-600 bg-slate-100">{t.category}</span></td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      {isAgent && <td className="px-4 py-3 text-slate-600">{t.assigned_agent_name ?? "-"}</td>}
                      <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap"><RelativeTime iso={t.updated_at} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.tickets.length === 0 && (
              <EmptyState message={emptyMessage} action={<Button type="button" variant="secondary" onClick={() => setSearchParams({ page: "1" })}>Clear filters</Button>} />
            )}

            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-700">Page {data.page} of {data.total_pages}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= data.total_pages}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ticket) => {
          setCreateOpen(false);
          navigate(`/tickets/${ticket.id}`);
        }}
      />
    </div>
  );
}
