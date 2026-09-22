import type { TicketStatus } from "../types";
import { STATUS_LABELS } from "../types";

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "badge-open",
  IN_PROGRESS: "badge-in-progress",
  WAITING_FOR_CUSTOMER: "badge-waiting",
  WAITING_FOR_PROVIDER: "badge-waiting",
  RESOLVED: "badge-resolved",
  CLOSED: "badge-closed",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`badge ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
