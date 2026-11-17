import { vi } from "vitest";
import type { AdminApi } from "@/lib/admin-api";

export function fakeApi(overrides: Partial<Record<keyof AdminApi, unknown>> = {}) {
  const api = {
    getSession: vi.fn(async () => null),
    signIn: vi.fn(async () => ({ ok: true })),
    signOut: vi.fn(async () => {}),
    isStaff: vi.fn(async () => false),
    listReservations: vi.fn(async () => []),
    updateStatus: vi.fn(async () => {}),
    listSlots: vi.fn(async () => []),
    createSlot: vi.fn(async () => ({ id: 1, weekday: null, date: null, startTime: "00:00", capacity: 1, active: true })),
    updateSlot: vi.fn(async () => {}),
    ...overrides,
  };
  return api as unknown as { [K in keyof AdminApi]: ReturnType<typeof vi.fn> & AdminApi[K] };
}
