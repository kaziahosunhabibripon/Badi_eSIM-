import type { MockOrderResponse } from "../types";
import { apiFetch } from "./http";

export async function getMockOrder(orderId: string): Promise<MockOrderResponse> {
  return apiFetch<MockOrderResponse>(`/mock/orders/${orderId}`);
}

export async function getHealth(): Promise<{ status: string; database: string }> {
  return apiFetch<{ status: string; database: string }>("/health");
}
