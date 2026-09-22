import type { TicketPriority } from "../types";
import { PRIORITY_LABELS } from "../types";

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: "badge-low",
  MEDIUM: "badge-medium",
  HIGH: "badge-high",
  URGENT: "badge-urgent",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`badge ${PRIORITY_COLORS[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
