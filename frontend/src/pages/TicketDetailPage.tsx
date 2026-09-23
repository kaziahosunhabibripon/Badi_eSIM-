import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronDown, Lock, Send } from "lucide-react";
import { useIdentity } from "../hooks/useIdentity";
import { getTicket, addMessage, updateTicket } from "../api/tickets";
import { getMockOrder } from "../api/orders";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { RelativeTime } from "../utils/RelativeTime";
import { VALID_TRANSITIONS } from "../constants";
import { useTicketSocket } from "../hooks/useTicketSocket";
import { listUsers } from "../api/users";
import { ToastContainer, addToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import type { User, TicketStatus, TicketPriority, MessageResponse, TicketDetailResponse, TicketUpdate } from "../types";

const SELECT_CLASS = "text-[13px] py-1.5";

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useIdentity();
  const ticketId = id ? Number(id) : 0;

  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<TicketDetailResponse["messages"]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: "success" | "error" }>>([]);
  const [sending, setSending] = useState(false);
  const [composerBody, setComposerBody] = useState("");
  const [composerType, setComposerType] = useState<"REPLY" | "INTERNAL_NOTE">("REPLY");

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [priorityUpdating, setPriorityUpdating] = useState(false);
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);

  const isAgent = user?.role === "AGENT";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTicket(ticketId)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        setMessages(data.messages);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 404) {
          setNotFound(true);
        } else {
          setError("Unable to load ticket.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticketId]);

  useEffect(() => {
    if (isAgent) {
      listUsers("AGENT")
        .then(setAgents)
        .catch(() => setAgents([]));
    }
  }, [isAgent]);

  const handleNewMessage = useCallback((msg: MessageResponse) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const { connectionLabel, connectionColor } = useTicketSocket({
    ticketId,
    userId: user?.id ?? 0,
    onMessage: handleNewMessage,
  });

  const handleSend = useCallback(async () => {
    if (!composerBody.trim() || sending) return;
    setSending(true);
    try {
      const data = await addMessage(ticketId, {
        body: composerBody.trim(),
        message_type: composerType,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setComposerBody("");
      addToast(setToasts, composerType === "REPLY" ? "Reply sent." : "Internal note added.", "success");
    } catch {
      addToast(setToasts, "Unable to send message. Please try again.", "error");
    } finally {
      setSending(false);
    }
  }, [composerBody, composerType, ticketId, sending]);

  const handleStatusChange = useCallback(
    async (newStatus: TicketStatus) => {
      if (!ticket || !isAgent) return;
      setStatusUpdating(true);
      try {
        const update: TicketUpdate = { status: newStatus };
        await updateTicket(ticketId, update);
        setShowHistory(true);
        const refreshed = await getTicket(ticketId);
        setTicket(refreshed);
        setMessages(refreshed.messages);
        addToast(setToasts, "Status updated.", "success");
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? (e as { message: string }).message : "Update failed.";
        addToast(setToasts, msg, "error");
      } finally {
        setStatusUpdating(false);
      }
    },
    [ticket, isAgent, ticketId]
  );

  const handlePriorityChange = useCallback(
    async (newPriority: TicketPriority) => {
      if (!ticket || !isAgent) return;
      setPriorityUpdating(true);
      try {
        const update: TicketUpdate = { priority: newPriority };
        await updateTicket(ticketId, update);
        setShowHistory(true);
        const refreshed = await getTicket(ticketId);
        setTicket(refreshed);
        setMessages(refreshed.messages);
        addToast(setToasts, "Priority updated.", "success");
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? (e as { message: string }).message : "Update failed.";
        addToast(setToasts, msg, "error");
      } finally {
        setPriorityUpdating(false);
      }
    },
    [ticket, isAgent, ticketId]
  );

  const handleAssigneeChange = useCallback(
    async (agentIdStr: string) => {
      if (!ticket || !isAgent) return;
      setAssigneeUpdating(true);
      const newId = agentIdStr ? Number(agentIdStr) : null;
      try {
        const update: TicketUpdate = { assigned_agent_id: newId };
        await updateTicket(ticketId, update);
        setShowHistory(true);
        const refreshed = await getTicket(ticketId);
        setTicket(refreshed);
        setMessages(refreshed.messages);
        addToast(setToasts, "Assignment updated.", "success");
      } catch (e: unknown) {
        const msg = e && typeof e === "object" && "message" in e ? (e as { message: string }).message : "Update failed.";
        addToast(setToasts, msg, "error");
      } finally {
        setAssigneeUpdating(false);
      }
    },
    [ticket, isAgent, ticketId]
  );

  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [orderData, setOrderData] = useState<{
    order_id: string;
    destination: string;
    package: string;
    status: string;
    esim_status: string;
  } | null>(null);

  useEffect(() => {
    if (!ticket?.order_id) return;
    let cancelled = false;
    setOrderLoading(true);
    setOrderError(false);
    getMockOrder(ticket.order_id)
      .then((data) => {
        if (cancelled) return;
        setOrderData(data);
      })
      .catch(() => {
        if (!cancelled) setOrderError(true);
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticket?.order_id]);

  if (notFound) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">?</div>
        <h2 className="text-xl font-semibold text-slate-900">Ticket not found</h2>
        <p className="text-slate-500 mt-1">The ticket you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
        <Link to="/tickets" className="inline-flex mt-4">
          <Button variant="primary">Back to tickets</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-40 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!ticket) return null;

  const allowedNext = isAgent ? (VALID_TRANSITIONS[ticket.status] ?? []) : [];
  const connectionDot = connectionColor === "text-green-600" ? "bg-green-600" : connectionColor === "text-amber-600" ? "bg-amber-600 animate-pulse" : "bg-slate-400";

  return (
    <div>
      <Link to="/tickets" className="text-[13px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-4">
        <ChevronLeft size={14} /> Tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[13px] font-semibold text-slate-500">{ticket.ticket_number}</span>
            <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.category}</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-0.5">
          <div>Created <RelativeTime iso={ticket.created_at} /></div>
          <div>Updated <RelativeTime iso={ticket.updated_at} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-4">Conversation</h2>

            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No messages yet.</p>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((m, idx) => {
                if (!isAgent && m.message_type === "INTERNAL_NOTE") return null;
                const isCustomerMsg = m.sender_id === ticket.customer_id;
                const isInternal = m.message_type === "INTERNAL_NOTE";
                const showDaySeparator = idx > 0 && messages[idx - 1].created_at.slice(0, 10) !== m.created_at.slice(0, 10);

                if (isInternal) {
                  return (
                    <div key={m.id}>
                      {showDaySeparator && <DaySeparator iso={m.created_at} />}
                      <div className="rounded-md bg-amber-50 border border-amber-200 border-l-[3px] border-l-amber-600 px-3.5 py-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-800 tracking-wide uppercase mb-1.5">
                          <Lock size={11} />
                          Internal note — hidden from customer
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[12.5px] font-semibold text-amber-800">{m.sender_name}</span>
                          <span className="text-[11px] text-amber-600"><RelativeTime iso={m.created_at} /></span>
                        </div>
                        <div className="text-[13.5px] text-amber-800 leading-relaxed whitespace-pre-wrap">{m.body}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id}>
                    {showDaySeparator && <DaySeparator iso={m.created_at} />}
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${
                          isCustomerMsg ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {initialsOf(m.sender_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-[13.5px] font-semibold text-slate-900">{m.sender_name}</span>
                          <span className="text-[12px] text-slate-400">{isCustomerMsg ? "Customer" : "Agent"}</span>
                          <span className="text-[11.5px] text-slate-400"><RelativeTime iso={m.created_at} /></span>
                        </div>
                        <div
                          className={`inline-block max-w-full rounded-tr-xl rounded-b-xl rounded-tl-sm px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${
                            isCustomerMsg ? "bg-slate-100 text-slate-700" : "bg-indigo-50 text-slate-700"
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {isAgent && (
              <div className="flex gap-1 p-2.5">
                <button
                  type="button"
                  onClick={() => setComposerType("REPLY")}
                  className={`px-3 h-7 rounded-md text-[12.5px] font-semibold transition-colors ${
                    composerType === "REPLY" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerType("INTERNAL_NOTE")}
                  className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-md text-[12.5px] font-semibold transition-colors ${
                    composerType === "INTERNAL_NOTE" ? "bg-amber-100 text-amber-800" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Lock size={11} /> Internal note
                </button>
              </div>
            )}
            <div className="px-4 pt-1">
              <textarea
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                placeholder={isAgent ? (composerType === "REPLY" ? "Write a reply…" : "Write an internal note…") : "Write a reply…"}
                aria-label={composerType === "REPLY" ? "Reply" : "Internal note"}
                rows={3}
                className="w-full resize-y px-2 py-2 text-[13.5px] focus:outline-none placeholder:text-slate-400 border border-slate-200 rounded-md focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
              <span className="text-[11.5px] text-slate-400">
                {isAgent && composerType === "INTERNAL_NOTE" ? "Only visible to agents" : "Customer will be notified"}
              </span>
              <Button
                type="button"
                variant={composerType === "INTERNAL_NOTE" ? "amber" : "primary"}
                size="sm"
                disabled={sending || !composerBody.trim()}
                onClick={handleSend}
              >
                {!sending && <Send size={13} />}
                {sending ? "Sending…" : composerType === "REPLY" ? "Send reply" : "Add note"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {isAgent && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
              <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Ticket Controls</h2>

              <div>
                <label htmlFor="status-select" className="block text-[12px] font-medium text-slate-500 mb-1">Status</label>
                <Select
                  id="status-select"
                  value={ticket.status}
                  disabled={statusUpdating}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  selectClassName={SELECT_CLASS}
                >
                  <option value={ticket.status}>{ticket.status.replace(/_/g, " ")}</option>
                  {allowedNext.map((s) => (<option key={s} value={s}>{s.replace(/_/g, " ")}</option>))}
                </Select>
                {statusUpdating && <span className="text-[11px] text-slate-400">Updating…</span>}
              </div>

              <div>
                <label htmlFor="priority-select" className="block text-[12px] font-medium text-slate-500 mb-1">Priority</label>
                <Select
                  id="priority-select"
                  value={ticket.priority}
                  disabled={priorityUpdating}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  selectClassName={SELECT_CLASS}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </Select>
                {priorityUpdating && <span className="text-[11px] text-slate-400">Updating…</span>}
              </div>

              <div>
                <label htmlFor="assignee-select" className="block text-[12px] font-medium text-slate-500 mb-1">Assignee</label>
                <Select
                  id="assignee-select"
                  value={ticket.assigned_agent_id ?? ""}
                  disabled={assigneeUpdating}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  selectClassName={SELECT_CLASS}
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </Select>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => { if (user) handleAssigneeChange(String(user.id)); }}
                    className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Assign to me
                  </button>
                  {assigneeUpdating && <span className="text-[11px] text-slate-400">Updating…</span>}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer</h2>
            <InfoRow label="Email" value={ticket.customer_email} />
            <InfoRow label="Category" value={ticket.category} />
            {ticket.assigned_agent_name && <InfoRow label="Assignee" value={ticket.assigned_agent_name} />}
          </div>

          {ticket.order_id && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Order {ticket.order_id}</h2>
              {orderLoading && <p className="text-[13px] text-slate-400">Loading order…</p>}
              {orderError && <p className="text-[13px] text-slate-400">Order details unavailable.</p>}
              {orderData && !orderLoading && !orderError && (
                <div className="space-y-2">
                  <InfoRow label="Destination" value={orderData.destination} />
                  <InfoRow label="Package" value={orderData.package} />
                  <InfoRow label="Order status" value={orderData.status} />
                  <InfoRow label="eSIM status" value={orderData.esim_status} />
                </div>
              )}
            </div>
          )}

          {isAgent && ticket.events && ticket.events.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                aria-expanded={showHistory}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wide"
              >
                <span>History · {ticket.events.length} events</span>
                <ChevronDown size={13} className={`transition-transform ${showHistory ? "rotate-180" : ""}`} />
              </button>
              {showHistory && (
                <div className="mt-3 space-y-3">
                  {ticket.events.map((e, idx) => (
                    <div key={e.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center pt-1">
                        <span className="w-[6px] h-[6px] rounded-full bg-slate-300 flex-shrink-0" />
                        {idx < ticket.events.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="pb-2 min-w-0">
                        <div className="text-[11.5px] text-slate-400"><RelativeTime iso={e.created_at} /></div>
                        <div className="text-[12.5px] text-slate-600">
                          <strong className="text-slate-800 font-medium">{e.actor_name}</strong>{" "}
                          {e.event_type === "STATUS_CHANGED"
                            ? <>changed status <span className="text-slate-400">{e.old_value}</span> → <span className="font-medium">{e.new_value}</span></>
                            : e.event_type === "ASSIGNED"
                            ? <>assigned to <span className="font-medium">{e.new_value ?? "unassigned"}</span></>
                            : e.event_type === "PRIORITY_CHANGED"
                            ? <>changed priority <span className="text-slate-400">{e.old_value}</span> → <span className="font-medium">{e.new_value}</span></>
                            : e.event_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-[12.5px] px-1">
            <span className={`w-[6px] h-[6px] rounded-full ${connectionDot}`} aria-hidden />
            <span className={connectionColor}>{connectionLabel}</span>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-slate-400">{label}</span>
      <span className="text-[12.5px] font-medium text-slate-700 text-right truncate">{value}</span>
    </div>
  );
}

function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[11px] text-slate-400"><RelativeTime iso={iso} /></span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}
