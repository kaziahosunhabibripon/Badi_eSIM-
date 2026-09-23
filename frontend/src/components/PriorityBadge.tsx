import type { TicketPriority } from "../types";
import { PRIORITY_LABELS } from "../types";

const PRIORITY_COLORS: Record<TicketPriority, { bg: string; text: string; dot?: string }> = {
  LOW: { bg: "bg-slate-100", text: "text-slate-600" },
  MEDIUM: { bg: "bg-indigo-100", text: "text-indigo-700" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800" },
  URGENT: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} ${priority === "URGENT" ? "font-semibold" : ""}`}>
      {priority === "URGENT" && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
