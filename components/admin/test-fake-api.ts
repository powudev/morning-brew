import { vi } from "vitest";
import type { AdminApi } from "@/lib/admin-api";

// 元件測試用的假 API:每個方法都是 vi.fn,測試內可覆寫回傳值
export function fakeApi(overrides: Partial<Record<keyof AdminApi, unknown>> = {}) {
  const api = {
    getSession: vi.fn(async () => null),
    signIn: vi.fn(async () => ({ ok: true })),
    signOut: vi.fn(async () => {}),
    isStaff: vi.fn(async () => false),
    listReservations: vi.fn(async () => []),
    updateStatus: vi.fn(async () => {}),
    ...overrides,
  };
  return api as unknown as { [K in keyof AdminApi]: ReturnType<typeof vi.fn> & AdminApi[K] };
}
