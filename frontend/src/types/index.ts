export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting",
  WAITING_FOR_PROVIDER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "WAITING_FOR_PROVIDER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory =
  | "INSTALLATION"
  | "ACTIVATION"
  | "CONNECTIVITY"
  | "ORDER"
  | "TOPUP"
  | "REFUND"
  | "OTHER";
export type MessageType = "REPLY" | "INTERNAL_NOTE";
export type UserRole = "AGENT" | "CUSTOMER";
export type EventType = "STATUS_CHANGED" | "ASSIGNED" | "PRIORITY_CHANGED";

export interface TicketResponse {
  id: number;
  ticket_number: string;
  customer_id: number;
  customer_email: string;
  customer_name: string;
  order_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketDetailResponse extends TicketResponse {
  messages: TicketMessageResponse[];
  events: TicketEventResponse[];
}

export interface TicketListResponse {
  tickets: TicketResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MockOrderResponse {
  order_id: string;
  destination: string;
  package: string;
  status: string;
  esim_status: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface TicketMessageResponse {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name: string;
  message_type: MessageType;
  body: string;
  created_at: string;
}

export interface TicketEventResponse {
  id: number;
  ticket_id: number;
  actor_id: number;
  actor_name: string;
  event_type: EventType;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface MessageCreate {
  body: string;
  message_type?: MessageType;
}

export interface TicketCreate {
  customer_email: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  order_id?: string | null;
}

export interface MessageResponse {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name: string;
  message_type: MessageType;
  body: string;
  created_at: string;
}

export interface TicketUpdate {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_agent_id?: number | null;
}

export interface WebSocketMessage {
  event: "message.created";
  ticket_id: number;
  message: TicketMessageResponse;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

/* ---- Mock layer types ---- */

export type Ticket = TicketResponse;

export interface TicketDetail {
  id: number;
  ticket_number: string;
  customer_id: number;
  customer_email: string;
  customer_name: string;
  order_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  messages: TicketMessage[];
  events: TicketEvent[];
}

export interface TicketList {
  tickets: Ticket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: UserRole;
  message_type: MessageType;
  body: string;
  created_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  actor_id: number;
  actor_name: string;
  event_type: EventType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface MockOrder {
  order_id: string;
  destination: string;
  package: string;
  status: string;
  esim_status: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "WAITING_FOR_PROVIDER", "RESOLVED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS"],
  WAITING_FOR_PROVIDER: ["IN_PROGRESS"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export type CreateTicketInput = TicketCreate;
export type SendMessageInput = MessageCreate;
export type UpdateTicketInput = TicketUpdate;

export interface TicketFilterParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assigned_agent_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface TicketListResult {
  tickets: Ticket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
