import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity";
import { getTicket, addMessage, updateTicket } from "../api/tickets";
import { getMockOrder } from "../api/orders";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ConnectionIndicator } from "../components/ConnectionIndicator";
import { ToastContainer, addToast } from "../components/Toast";
import { RelativeTime } from "../utils/RelativeTime";
import { VALID_TRANSITIONS } from "../constants";
import { useTicketSocket } from "../hooks/useTicketSocket";
import { listUsers } from "../api/users";
import type { User, TicketStatus, TicketPriority, MessageResponse, TicketDetailResponse, TicketUpdate } from "../types";

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
    return () => {
      cancelled = true;
    };
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

  const { connectionState } = useTicketSocket({
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
      addToast(setToasts, "Message sent.", "success");
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
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? (e as { message: string }).message
            : "Update failed.";
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
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? (e as { message: string }).message
            : "Update failed.";
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
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? (e as { message: string }).message
            : "Update failed.";
        addToast(setToasts, msg, "error");
      } finally {
        setAssigneeUpdating(false);
      }
    },
    [ticket, isAgent, ticketId]
  );

  // Order summary
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
    return () => {
      cancelled = true;
    };
  }, [ticket?.order_id]);

  if (notFound) {
    return (
      <div className="state error">
        <h2>Ticket not found.</h2>
        <Link to="/tickets">Back to tickets</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="state loading">Loading ticket...</div>;
  }

  if (error) {
    return (
      <div className="state error">
        <p>{error}</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  const allowedNext = isAgent ? (VALID_TRANSITIONS[ticket.status] ?? []) : [];

  return (
    <div>
      <Link to="/tickets">Back to tickets</Link>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1>{ticket.subject}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 14 }}>{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span>{ticket.category}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>
            <div>Created: <RelativeTime iso={ticket.created_at} /></div>
            <div>Updated: <RelativeTime iso={ticket.updated_at} /></div>
          </div>
        </div>
        {isAgent && (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <span>Customer: </span>
            <span>{ticket.customer_email}</span>
          </div>
        )}
      </div>

      {isAgent && (
        <div className="card">
          <h3>Agent controls</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="form-group" style={{ minWidth: 200 }}>
              <label htmlFor="status-select">Status</label>
              <select
                id="status-select"
                value={ticket.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              >
                <option value={ticket.status}>{ticket.status}</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {statusUpdating && <span style={{ fontSize: 13 }}>Updating...</span>}
            </div>

            <div className="form-group" style={{ minWidth: 200 }}>
              <label htmlFor="priority-select">Priority</label>
              <select
                id="priority-select"
                value={ticket.priority}
                disabled={priorityUpdating}
                onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
              >
                <option value={ticket.priority}>{ticket.priority}</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              {priorityUpdating && <span style={{ fontSize: 13 }}>Updating...</span>}
            </div>

            <div className="form-group" style={{ minWidth: 200 }}>
              <label htmlFor="assignee-select">Assignee</label>
              <select
                id="assignee-select"
                value={ticket.assigned_agent_id ?? ""}
                disabled={assigneeUpdating}
                onChange={(e) => handleAssigneeChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 4, fontSize: 12 }}
                onClick={() => {
                  if (user) handleAssigneeChange(String(user.id));
                }}
              >
                Assign to me
              </button>
              {assigneeUpdating && <span style={{ fontSize: 13 }}>Updating...</span>}
            </div>
          </div>
        </div>
      )}

      {ticket.order_id && (
        <div className="card">
          <div className="card-header">Order {ticket.order_id}</div>
          {orderLoading && <p>Loading order...</p>}
          {orderError && <p style={{ color: "var(--text-muted)" }}>Order details unavailable</p>}
          {orderData && !orderLoading && !orderError && (
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px" }}>
              <dt>Destination:</dt><dd>{orderData.destination}</dd>
              <dt>Package:</dt><dd>{orderData.package}</dd>
              <dt>Status:</dt><dd>{orderData.status}</dd>
              <dt>eSIM status:</dt><dd>{orderData.esim_status}</dd>
            </dl>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">Conversation</div>
        {messages.length === 0 && <p>No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.message_type === "INTERNAL_NOTE" ? "internal" : m.sender_id === ticket.customer_id ? "" : "agent"}`}>
            <div className="meta">
              <span>
                <strong>{m.sender_name}</strong> — {m.message_type === "INTERNAL_NOTE" ? "Internal note (agents only)" : m.message_type}
              </span>
              <time dateTime={m.created_at} title={m.created_at}>
                <RelativeTime iso={m.created_at} />
              </time>
            </div>
            <div className="body">{m.body}</div>
          </div>
        ))}
      </div>

      <div className="composer">
        {isAgent && (
          <div className="composer-segment" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className={composerType === "REPLY" ? "active" : ""}
              onClick={() => setComposerType("REPLY")}
            >
              Reply
            </button>
            <button
              type="button"
              className={composerType === "INTERNAL_NOTE" ? "active" : ""}
              onClick={() => setComposerType("INTERNAL_NOTE")}
            >
              Internal note
            </button>
          </div>
        )}
        <textarea
          value={composerBody}
          onChange={(e) => setComposerBody(e.target.value)}
          placeholder={isAgent ? composerType === "REPLY" ? "Type a reply..." : "Type an internal note..." : "Type a reply..."}
          aria-label={composerType === "REPLY" ? "Reply" : "Internal note"}
        />
        <div className="composer-toolbar">
          <button
            type="button"
            className="btn btn-primary"
            disabled={sending || !composerBody.trim()}
            onClick={handleSend}
          >
            {sending ? "Sending..." : composerType === "REPLY" ? "Send" : "Add note"}
          </button>
        </div>
      </div>

      {isAgent && (
        <div className="card">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
          >
            History {showHistory ? "▼" : "▶"}
          </button>
          {showHistory && ticket.events && (
            <div style={{ marginTop: 12 }}>
              {ticket.events.map((e) => (
                <div key={e.id} className="timeline-item">
                  <strong>{e.actor_name}</strong>{" "}
                  {eventText(e)}
                  <span className="time">
                    <RelativeTime iso={e.created_at} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <ConnectionIndicator state={connectionState} />
      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}

function eventText(e: { event_type: string; old_value: string | null; new_value: string | null }): string {
  if (e.event_type === "STATUS_CHANGED") return `Status changed: ${e.old_value} -> ${e.new_value}`;
  if (e.event_type === "ASSIGNED") return `Assigned to: ${e.new_value ?? "unassigned"}`;
  if (e.event_type === "PRIORITY_CHANGED") return `Priority changed: ${e.old_value} -> ${e.new_value}`;
  return e.event_type;
}
