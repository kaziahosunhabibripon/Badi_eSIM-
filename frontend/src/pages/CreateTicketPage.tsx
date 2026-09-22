import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../hooks/useIdentity";
import { createTicket } from "../api/tickets";
import { ToastContainer, addToast } from "../components/Toast";
import type { TicketCreate } from "../types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX = 255;

export function CreateTicketPage() {
  const navigate = useNavigate();
  const { user } = useIdentity();
  const isAgent = user?.role === "AGENT";

  const [form, setForm] = useState({
    customer_email: user?.email ?? "",
    order_id: "",
    category: "" as TicketCreate["category"] | "",
    subject: "",
    description: "",
    priority: "" as TicketCreate["priority"] | "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: "success" | "error" }>>([]);

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!form.customer_email.trim()) {
      next.customer_email = "Customer e-mail is required.";
    } else if (!EMAIL_REGEX.test(form.customer_email.trim())) {
      next.customer_email = "Enter a valid e-mail address.";
    }
    if (!form.category) {
      next.category = "Category is required.";
    } else if (!["INSTALLATION", "ACTIVATION", "CONNECTIVITY", "ORDER", "TOPUP", "REFUND", "OTHER"].includes(form.category)) {
      next.category = "Invalid category.";
    }
    if (!form.subject.trim()) {
      next.subject = "Subject is required.";
    } else if (form.subject.length > SUBJECT_MAX) {
      next.subject = `Subject must be at most ${SUBJECT_MAX} characters.`;
    }
    if (!form.description.trim()) {
      next.description = "Description is required.";
    }
    if (!form.priority) {
      next.priority = "Priority is required.";
    } else if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(form.priority)) {
      next.priority = "Invalid priority.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setCreating(true);
    try {
      const data: TicketCreate = {
        customer_email: form.customer_email.trim().toLowerCase(),
        order_id: form.order_id.trim() || undefined,
        category: form.category as TicketCreate["category"],
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority as TicketCreate["priority"],
      };
      const ticket = await createTicket(data);
      setCreatedTicket(ticket.ticket_number);
      addToast(setToasts, `Ticket created: ${ticket.ticket_number}`, "success");
      setTimeout(() => {
        navigate(`/tickets/${ticket.id}`);
      }, 500);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to create ticket.";
      addToast(setToasts, msg, "error");
    } finally {
      setCreating(false);
    }
  }, [form, validate, navigate]);

  return (
    <div style={{ maxWidth: 600 }}>
      <h1>Create Ticket</h1>
      {createdTicket && (
        <div className="card" style={{ background: "#d1fae5", borderColor: "#6ee7b7" }}>
          Ticket created: <strong>{createdTicket}</strong>
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="customer_email">
            Customer e-mail <span className="required">*</span>
          </label>
          <input
            id="customer_email"
            type="email"
            value={form.customer_email}
            readOnly={!isAgent}
            onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
            aria-invalid={!!errors.customer_email}
          />
          {errors.customer_email && <div className="form-error">{errors.customer_email}</div>}
          {!isAgent && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Your e-mail is used automatically.</p>}
        </div>

        <div className="form-group">
          <label htmlFor="order_id">Order ID (optional)</label>
          <input
            id="order_id"
            type="text"
            value={form.order_id}
            onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
            placeholder="ORD-12345"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">
            Category <span className="required">*</span>
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCreate["category"] }))}
            aria-invalid={!!errors.category}
          >
            <option value="">Select category</option>
            <option value="INSTALLATION">Installation</option>
            <option value="ACTIVATION">Activation</option>
            <option value="CONNECTIVITY">Connectivity</option>
            <option value="ORDER">Order</option>
            <option value="TOPUP">Top-up</option>
            <option value="REFUND">Refund</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.category && <div className="form-error">{errors.category}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="subject">
            Subject <span className="required">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            maxLength={SUBJECT_MAX}
            aria-invalid={!!errors.subject}
          />
          {errors.subject && <div className="form-error">{errors.subject}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            aria-invalid={!!errors.description}
          />
          {errors.description && <div className="form-error">{errors.description}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="priority">
            Priority <span className="required">*</span>
          </label>
          <select
            id="priority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketCreate["priority"] }))}
            aria-invalid={!!errors.priority}
          >
            <option value="">Select priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          {errors.priority && <div className="form-error">{errors.priority}</div>}
        </div>

        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "Creating..." : "Create Ticket"}
        </button>
      </form>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
