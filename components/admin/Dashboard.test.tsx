// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeApi } from "@/components/admin/test-fake-api";
import { AdminApiError } from "@/lib/admin-api";
import type { AdminReservation } from "@/lib/admin-reservations";
import { todayInTaipei } from "@/lib/dates";

// 與 Next.js 相同:useRouter() 每次回傳同一個物件(否則依賴 router 的 effect 會每次 render 重跑)
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const replace = router.replace;
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const holder = vi.hoisted(() => ({ api: null as unknown }));
vi.mock("@/lib/admin-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/admin-api")>()),
  getAdminApi: () => holder.api,
}));

import Dashboard from "@/components/admin/Dashboard";

const today = todayInTaipei();
const res = (over: Partial<AdminReservation>): AdminReservation => ({
  id: "x",
  date: today,
  startTime: "10:00",
  name: "n",
  email: "n@example.com",
  phone: null,
  partySize: 2,
  note: null,
  status: "pending",
  createdAt: "2026-11-01T00:00:00Z",
  ...over,
});
const sample = [
  res({ id: "a", startTime: "08:00", name: "Early A", partySize: 3, status: "confirmed", phone: "0900-000-000", note: "window" }),
  res({ id: "b", startTime: "10:00", name: "Late B", partySize: 2, status: "pending" }),
  res({ id: "c", startTime: "10:00", name: "Late C", partySize: 1, status: "cancelled" }),
];

let api: ReturnType<typeof fakeApi>;
function signedInStaff(list = sample) {
  api.getSession.mockResolvedValue({ userId: "u", email: "staff@example.com" });
  api.isStaff.mockResolvedValue(true);
  api.listReservations.mockResolvedValue(list);
}
// nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- 測試內固定字串,非使用者輸入
const row = (name: string) => screen.getByRole("listitem", { name: new RegExp(name) });

beforeEach(() => {
  api = fakeApi();
  holder.api = api;
  replace.mockClear();
});

describe("Dashboard:權限", () => {
  it("未登入導回登入頁,不讀取訂位", async () => {
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.listReservations).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Reservations" })).toBeNull();
  });

  it("已登入但不是 staff:登出並導回登入頁", async () => {
    api.getSession.mockResolvedValue({ userId: "u", email: "x@example.com" });
    api.isStaff.mockResolvedValue(false);
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.signOut).toHaveBeenCalled();
    expect(api.listReservations).not.toHaveBeenCalled();
  });

  it("讀取時 session 失效(forbidden)導回登入頁", async () => {
    signedInStaff();
    api.listReservations.mockRejectedValue(new AdminApiError("forbidden"));
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("Dashboard:清單", () => {
  it("預設顯示今天的訂位,含時間、姓名、人數、聯絡方式、備註與狀態", async () => {
    signedInStaff();
    render(<Dashboard />);
    expect(await screen.findByRole("heading", { level: 1, name: "Reservations" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue(today);
    expect(api.listReservations).toHaveBeenCalledWith(today);
    const a = await screen.findByRole("listitem", { name: /Early A/ });
    expect(a).toHaveTextContent("08:00");
    expect(a).toHaveTextContent("3 guests");
    expect(a).toHaveTextContent("0900-000-000");
    expect(a).toHaveTextContent("window");
    expect(a).toHaveTextContent("Confirmed");
  });

  it("顯示統計:筆數與人數(不含已取消)", async () => {
    signedInStaff();
    render(<Dashboard />);
    expect(await screen.findByText("3 reservations · 5 guests")).toBeInTheDocument();
  });

  it("換日期重新讀取", async () => {
    signedInStaff();
    render(<Dashboard />);
    await screen.findByRole("listitem", { name: /Early A/ });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-12-24" } });
    await waitFor(() => expect(api.listReservations).toHaveBeenLastCalledWith("2026-12-24"));
  });

  it("狀態篩選只顯示該狀態", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<Dashboard />);
    await screen.findByRole("listitem", { name: /Early A/ });
    await user.selectOptions(screen.getByLabelText("Status"), "pending");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(row("Late B")).toBeInTheDocument();
  });

  it("沒有訂位時顯示提示", async () => {
    signedInStaff([]);
    render(<Dashboard />);
    expect(await screen.findByText("No reservations for this date.")).toBeInTheDocument();
  });
});

describe("Dashboard:改狀態", () => {
  it("按 Confirm 呼叫 updateStatus 並更新畫面,目前狀態的按鈕不顯示", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<Dashboard />);
    const b = await screen.findByRole("listitem", { name: /Late B/ });
    expect(within(b).queryByRole("button", { name: /^Mark as pending/ })).toBeNull();
    await user.click(within(b).getByRole("button", { name: "Confirm reservation for Late B at 10:00" }));
    expect(api.updateStatus).toHaveBeenCalledWith("b", "confirmed");
    await waitFor(() => expect(row("Late B")).toHaveTextContent("Confirmed"));
    expect(within(row("Late B")).queryByRole("button", { name: /^Confirm/ })).toBeNull();
  });

  it("儲存失敗(網路)顯示訊息,狀態不變", async () => {
    signedInStaff();
    api.updateStatus.mockRejectedValue(new AdminApiError("network"));
    const user = userEvent.setup();
    render(<Dashboard />);
    const b = await screen.findByRole("listitem", { name: /Late B/ });
    await user.click(within(b).getByRole("button", { name: /^Cancel reservation for Late B/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the change. Please try again.");
    expect(row("Late B")).toHaveTextContent("Pending");
  });

  it("儲存時權限失效(forbidden)導回登入頁", async () => {
    signedInStaff();
    api.updateStatus.mockRejectedValue(new AdminApiError("forbidden"));
    const user = userEvent.setup();
    render(<Dashboard />);
    const b = await screen.findByRole("listitem", { name: /Late B/ });
    await user.click(within(b).getByRole("button", { name: /^Confirm reservation for Late B/ }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("Dashboard:登出", () => {
  it("按 Sign out 登出並回到登入頁", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(api.signOut).toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});
