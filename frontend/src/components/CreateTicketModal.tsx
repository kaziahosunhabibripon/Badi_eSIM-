import { useState, useCallback, useEffect } from "react";
import { Info, CheckCircle2 } from "lucide-react";
import { useIdentity } from "../hooks/useIdentity";
import { createTicket } from "../api/tickets";
import { ToastContainer, addToast } from "./Toast";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Modal } from "./ui/Modal";
import type { Ticket, TicketCreate } from "../types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX = 255;

const FIELD_CLASS =
  "w-full px-3 py-2.5 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-shadow";

const EMPTY_FORM = { customer_email: "", order_id: "", category: "" as TicketCreate["category"] | "", subject: "", description: "", priority: "" as TicketCreate["priority"] | "" };

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

export function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const { user } = useIdentity();
  const isAgent = user?.role === "AGENT";

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type?: "success" | "error" }>>([]);

  // Fresh form every time the modal opens.
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, customer_email: isAgent ? "" : user?.email ?? "" });
      setErrors({});
      setCreatedTicket(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        onCreated(ticket);
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
  }, [form, validate, onCreated]);

  return (
    <Modal open={open} onClose={onClose} title="Create Ticket" subtitle="Describe the issue so a support agent can help.">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs mb-5">
        <Info size={12} />
        A ticket number (e.g. BD-1009) is generated automatically
      </div>

      {createdTicket && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5 text-sm text-green-800">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          Ticket created: <strong>{createdTicket}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Customer e-mail" required error={errors.customer_email} htmlFor="customer_email">
          <input
            id="customer_email"
            type="email"
            value={form.customer_email}
            readOnly={!isAgent}
            placeholder={isAgent ? "customer@example.com" : undefined}
            onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
            aria-invalid={!!errors.customer_email}
            className={`${FIELD_CLASS} ${errors.customer_email ? "border-red-400" : "border-slate-300"} ${!isAgent ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
          />
          {!isAgent && <p className="text-xs text-slate-400 mt-1">Your e-mail is used automatically.</p>}
        </Field>

        <Field label="Order ID (optional)" htmlFor="order_id">
          <input
            id="order_id"
            type="text"
            value={form.order_id}
            onChange={(e) => setForm((f) => ({ ...f, order_id: e.target.value }))}
            placeholder="ORD-12345"
            className={`${FIELD_CLASS} border-slate-300`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" required error={errors.category} htmlFor="category">
            <Select
              id="category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCreate["category"] }))}
              aria-invalid={!!errors.category}
              className="w-full"
              selectClassName={`py-2.5 ${errors.category ? "border-red-400" : "border-slate-300"}`}
            >
              <option value="">Select category</option>
              <option value="INSTALLATION">Installation</option>
              <option value="ACTIVATION">Activation</option>
              <option value="CONNECTIVITY">Connectivity</option>
              <option value="ORDER">Order</option>
              <option value="TOPUP">Top-up</option>
              <option value="REFUND">Refund</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>

          <Field label="Priority" required error={errors.priority} htmlFor="priority">
            <Select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketCreate["priority"] }))}
              aria-invalid={!!errors.priority}
              className="w-full"
              selectClassName={`py-2.5 ${errors.priority ? "border-red-400" : "border-slate-300"}`}
            >
              <option value="">Select priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
        </div>

        <Field label="Subject" required error={errors.subject} htmlFor="subject">
          <input
            id="subject"
            type="text"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            maxLength={SUBJECT_MAX}
            aria-invalid={!!errors.subject}
            className={`${FIELD_CLASS} ${errors.subject ? "border-red-400" : "border-slate-300"}`}
          />
        </Field>

        <Field label="Description" required error={errors.description} htmlFor="description">
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            aria-invalid={!!errors.description}
            rows={4}
            placeholder="Describe what happened, when it started, and anything you've already tried."
            className={`${FIELD_CLASS} resize-y ${errors.description ? "border-red-400" : "border-slate-300"}`}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={creating} disabled={creating}>
            {creating ? "Creating…" : "Create Ticket"}
          </Button>
        </div>
      </form>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </Modal>
  );
}

function Field({
  label,
  required,
  error,
  children,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
