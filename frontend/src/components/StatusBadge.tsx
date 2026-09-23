import type { TicketStatus } from "../types";
import { STATUS_LABELS } from "../types";

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  OPEN: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
  IN_PROGRESS: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-600" },
  WAITING_FOR_CUSTOMER: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-600" },
  WAITING_FOR_PROVIDER: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-600" },
  RESOLVED: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-600" },
  CLOSED: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
