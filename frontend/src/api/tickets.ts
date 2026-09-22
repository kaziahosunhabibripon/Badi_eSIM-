import type {
  TicketCreate,
  TicketListResponse,
  TicketDetailResponse,
  TicketResponse,
  MessageCreate,
  MessageResponse,
  TicketUpdate,
} from "../types";
import { apiFetch } from "./http";

export { apiFetch };

export async function listTickets(params: Record<string, string | number | undefined> = {}): Promise<TicketListResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return apiFetch<TicketListResponse>(`/tickets${qs ? `?${qs}` : ""}`);
}

export async function getTicket(id: number): Promise<TicketDetailResponse> {
  return apiFetch<TicketDetailResponse>(`/tickets/${id}`);
}

export async function createTicket(data: TicketCreate): Promise<TicketResponse> {
  return apiFetch<TicketResponse>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTicket(
  id: number,
  data: TicketUpdate
): Promise<TicketResponse> {
  const body: Record<string, unknown> = {};
  if (data.status !== undefined) body.status = data.status;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.assigned_agent_id !== undefined) body.assigned_agent_id = data.assigned_agent_id;

  return apiFetch<TicketResponse>(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function addMessage(
  ticketId: number,
  data: MessageCreate
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type {
  TicketCreate,
  TicketUpdate,
  MessageCreate,
  TicketResponse,
  TicketDetailResponse,
  MessageResponse,
  TicketListResponse,
};
