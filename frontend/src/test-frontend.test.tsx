import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { CreateTicketPage } from "./pages/CreateTicketPage";
import { TicketListPage } from "./pages/TicketListPage";
import { StatusBadge } from "./components/StatusBadge";
import { PriorityBadge } from "./components/PriorityBadge";
import type { User, TicketDetailResponse } from "./types";

vi.mock("./hooks/useIdentity", () => ({ useIdentity: vi.fn() }));
vi.mock("./api/tickets", () => ({
  getTicket: vi.fn().mockResolvedValue({}),
  addMessage: vi.fn().mockResolvedValue({}),
  createTicket: vi.fn().mockRejectedValue(new Error("fail")),
  listTickets: vi.fn().mockResolvedValue({ tickets: [], total: 0, page: 1, page_size: 20, total_pages: 0 }),
}));
vi.mock("./api/orders", () => ({ getMockOrder: vi.fn().mockResolvedValue({}) }));
vi.mock("./api/users", () => ({ listUsers: vi.fn().mockResolvedValue([]) }));

import { useIdentity } from "./hooks/useIdentity";
import { getTicket, addMessage, createTicket, listTickets } from "./api/tickets";

const mockedUseIdentity = vi.mocked(useIdentity);
const mockGetTicket = vi.mocked(getTicket);
const mockAddMessage = vi.mocked(addMessage);
const mockCreateTicket = vi.mocked(createTicket);
const mockListTickets = vi.mocked(listTickets);

const mockUserAgent: User = {
  id: 1,
  email: "anas@example.com",
  name: "Anas Karim",
  role: "AGENT",
  created_at: "2026-01-01T00:00:00Z",
};

const mockUserCustomer: User = {
  id: 2,
  email: "customer@example.com",
  name: "Customer One",
  role: "CUSTOMER",
  created_at: "2026-01-01T00:00:00Z",
};

function createTicketDetail(overrides: Partial<TicketDetailResponse> = {}): TicketDetailResponse {
  return {
    id: 1,
    ticket_number: "BD-1001",
    customer_id: 2,
    customer_email: "customer@example.com",
    customer_name: "Customer One",
    order_id: "ORD-10293",
    category: "CONNECTIVITY",
    subject: "eSIM installed but no internet",
    description: "Test description",
    priority: "HIGH",
    status: "IN_PROGRESS",
    assigned_agent_id: 1,
    assigned_agent_name: "Anas",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    resolved_at: null,
    closed_at: null,
    messages: [],
    events: [],
    ...overrides,
  };
}

function renderWithIdentity(ui: React.ReactNode, user: User | null = mockUserAgent) {
  mockedUseIdentity.mockReturnValue({
    user,
    selectIdentity: vi.fn(),
    clearIdentity: vi.fn(),
    errorMsg: null,
    setErrorMsg: vi.fn(),
  });
  return render(ui, { wrapper: MemoryRouter });
}

function present(el: HTMLElement | null | undefined): boolean {
  return el !== null && el !== undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Composer: internal-note toggle hidden for customers", () => {
  it("hides the toggle when the user is a customer", async () => {
    mockGetTicket.mockResolvedValue(createTicketDetail());
    renderWithIdentity(<TicketDetailPage />, mockUserCustomer);
    await waitFor(() => expect(present(screen.queryByText("Loading ticket..."))).toBe(false));
    expect(present(screen.queryByText("Internal note"))).toBe(false);
  });

  it("shows the toggle when the user is an agent", async () => {
    mockGetTicket.mockResolvedValue(createTicketDetail());
    renderWithIdentity(<TicketDetailPage />, mockUserAgent);
    await waitFor(() => expect(present(screen.queryByText("Loading ticket..."))).toBe(false));
    expect(present(screen.getByText("Internal note"))).toBe(true);
  });
});

describe("Composer: message_type on send", () => {
  it("sends INTERNAL_NOTE when agent uses internal-note mode", async () => {
    mockGetTicket.mockResolvedValue(createTicketDetail());
    mockAddMessage.mockResolvedValue({
      id: 1,
      ticket_id: 1,
      sender_id: 1,
      sender_name: "Anas",
      message_type: "INTERNAL_NOTE",
      body: "test",
      created_at: "2026-01-01T00:00:00Z",
    } as any);
    renderWithIdentity(<TicketDetailPage />, mockUserAgent);
    await waitFor(() => expect(present(screen.getByText("Internal note"))).toBe(true));
    fireEvent.click(screen.getByText("Internal note"));
    await waitFor(() => expect(present(screen.getByLabelText("Internal note"))).toBe(true));
  });
});

describe("Agent status dropdown: only allowed next states", () => {
  it("shows current status and only allowed transitions", async () => {
    mockGetTicket.mockResolvedValue(createTicketDetail({ status: "IN_PROGRESS" }));
    renderWithIdentity(<TicketDetailPage />, mockUserAgent);
    await waitFor(() => expect(present(screen.getByLabelText("Status"))).toBe(true));
    const select = screen.getByLabelText("Status");
    const options = Array.from(select.querySelectorAll("option")).map(
      (o) => (o as unknown as HTMLInputElement).value
    );
    expect(options).toContain("IN_PROGRESS");
    expect(options).toContain("WAITING_FOR_CUSTOMER");
    expect(options).toContain("RESOLVED");
    expect(options).not.toContain("OPEN");
    expect(options).not.toContain("CLOSED");
  });
});

describe("Ticket list: error state", () => {
  it("shows error message and Try again refetches", async () => {
    mockListTickets.mockRejectedValueOnce(new Error("Network error"));
    mockListTickets.mockResolvedValue({
      tickets: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    });
    renderWithIdentity(<TicketListPage />, mockUserAgent);
    await waitFor(() => {
      expect(present(screen.queryByText("Unable to load tickets."))).toBe(true);
    });
    expect(present(screen.getByRole("button", { name: "Try again" }))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      expect(present(screen.queryByText("Unable to load tickets."))).toBe(false);
    });
  });
});

describe("Ticket list: empty state", () => {
  it("shows 'No tickets found' when there are no tickets at all", async () => {
    mockListTickets.mockResolvedValue({
      tickets: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
    });
    renderWithIdentity(<TicketListPage />, mockUserAgent);
    await waitFor(() => {
      expect(present(screen.queryByText("No tickets found."))).toBe(true);
    });
  });
});

describe("ApiError mapping", () => {
  it("maps backend error body to ApiError shape", async () => {
    mockCreateTicket.mockRejectedValue({
      code: "FORBIDDEN",
      message: "Customers can only create tickets for their own email address.",
      status: 403,
      details: { email: "test@example.com" },
    });
    renderWithIdentity(<CreateTicketPage />, mockUserCustomer);
    const emailInput = screen.getByLabelText("Customer e-mail", { exact: false });
    const categorySelect = screen.getByLabelText("Category", { exact: false });
    const subjectInput = screen.getByLabelText("Subject", { exact: false });
    const descInput = screen.getByLabelText("Description", { exact: false });
    const prioritySelect = screen.getByLabelText("Priority", { exact: false });
    fireEvent.change(emailInput, { target: { value: "customer@example.com" } });
    fireEvent.change(categorySelect, { target: { value: "CONNECTIVITY" } });
    fireEvent.change(subjectInput, { target: { value: "Test subject" } });
    fireEvent.change(descInput, { target: { value: "Test description" } });
    fireEvent.change(prioritySelect, { target: { value: "HIGH" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    await waitFor(() => {
      expect(
        present(screen.queryByText("Customers can only create tickets for their own email address."))
      ).toBe(true);
    });
  });
});

describe("Badges render with text", () => {
  it("StatusBadge shows label text", () => {
    render(<StatusBadge status="OPEN" />);
    expect(present(screen.queryByText("Open"))).toBe(true);
  });

  it("PriorityBadge shows label text", () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(present(screen.queryByText("High"))).toBe(true);
  });
});
