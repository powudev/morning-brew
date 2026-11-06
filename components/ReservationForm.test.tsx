// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayInTaipei } from "@/lib/dates";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// Turnstile 以假元件取代:按下按鈕就給 token,不載入 Cloudflare script
vi.mock("@/components/Turnstile", () => ({
  default: ({ onToken }: { onToken: (t: string | null) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      完成驗證(mock)
    </button>
  ),
}));

import ReservationForm from "@/components/ReservationForm";

const date = addDays(todayInTaipei(), 3);
const slots = [
  { slotId: 11, startTime: "08:00", remaining: 12 },
  { slotId: 12, startTime: "10:00", remaining: 2 },
  { slotId: 13, startTime: "12:00", remaining: 0 },
];

type Reply = { status: number; body: unknown };
let reserveReply: Reply;
const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith("/api/slots")) {
    return new Response(JSON.stringify({ date, slots }), { status: 200 });
  }
  if (url === "/api/reserve" && init?.method === "POST") {
    return new Response(JSON.stringify(reserveReply.body), { status: reserveReply.status });
  }
  throw new Error(`unexpected fetch ${url}`);
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  reserveReply = { status: 201, body: { ok: true } };
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  push.mockClear();
});

async function pickDate() {
  fireEvent.change(screen.getByLabelText("日期"), { target: { value: date } });
  await screen.findByRole("radio", { name: /08:00/ });
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("姓名"), "王小明");
  await user.type(screen.getByLabelText("Email"), "demo@example.com");
  await pickDate();
  await user.click(screen.getByRole("radio", { name: /08:00/ }));
  await user.click(screen.getByRole("button", { name: "完成驗證(mock)" }));
}

const reserveCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/reserve");

describe("ReservationForm", () => {
  it("每個欄位都有標籤,日期限制在可訂範圍內", () => {
    render(<ReservationForm />);
    for (const label of ["姓名", "Email", "電話(選填)", "人數", "日期", "備註(選填)"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    const dateInput = screen.getByLabelText("日期");
    expect(dateInput).toHaveAttribute("min", todayInTaipei());
    expect(dateInput).toHaveAttribute("max", addDays(todayInTaipei(), 30));
  });

  it("未選日期前不顯示時段,並提示先選日期", () => {
    render(<ReservationForm />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText("請先選擇日期")).toBeInTheDocument();
  });

  it("空白送出顯示欄位錯誤、標示 aria-invalid,且不送出請求", async () => {
    const user = userEvent.setup();
    render(<ReservationForm />);
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    expect(await screen.findByText("請輸入姓名")).toBeInTheDocument();
    expect(screen.getByLabelText("姓名")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("姓名")).toHaveAccessibleDescription("請輸入姓名");
    expect(screen.getByText("請完成驗證")).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(0);
  });

  it("選日期後載入時段,額滿的時段不可選", async () => {
    render(<ReservationForm />);
    await pickDate();
    expect(fetchMock).toHaveBeenCalledWith(`/api/slots?date=${date}`, expect.anything());
    expect(screen.getByRole("radio", { name: /08:00.*剩 12 位/ })).toBeEnabled();
    expect(screen.getByRole("radio", { name: /12:00.*已額滿/ })).toBeDisabled();
  });

  it("人數超過剩餘名額的時段不可選", async () => {
    const user = userEvent.setup();
    render(<ReservationForm />);
    await pickDate();
    expect(screen.getByRole("radio", { name: /10:00/ })).toBeEnabled();
    await user.selectOptions(screen.getByLabelText("人數"), "3");
    expect(screen.getByRole("radio", { name: /10:00.*名額不足/ })).toBeDisabled();
  });

  it("送出成功後送出正確資料並前往完成頁", async () => {
    const user = userEvent.setup();
    render(<ReservationForm />);
    await fillValid(user);
    await user.type(screen.getByLabelText("備註(選填)"), "靠窗");
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reserve/done/"));
    const [, init] = reserveCalls()[0];
    expect(new Headers(init!.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init!.body as string)).toEqual({
      name: "王小明",
      email: "demo@example.com",
      phone: "",
      partySize: 2,
      date,
      slotId: 11,
      note: "靠窗",
      turnstileToken: "test-token",
    });
  });

  it("時段剛額滿(409)時顯示訊息並重新載入時段", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 409, body: { error: "SLOT_FULL" } };
    render(<ReservationForm />);
    await fillValid(user);
    const slotCallsBefore = fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/slots")).length;
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("這個時段剛剛額滿了");
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/slots")).length).toBe(slotCallsBefore + 1),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("Turnstile 驗證失敗(403)時要求重新驗證", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 403, body: { error: "TURNSTILE_FAILED" } };
    render(<ReservationForm />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("驗證失敗");
    // token 已失效:再送一次會被前端擋下,要求重新完成驗證
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    expect(await screen.findByText("請完成驗證")).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(1);
  });

  it("伺服器回傳欄位錯誤(400)時顯示在對應欄位", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 400, body: { error: "VALIDATION", fields: { email: "Email 格式不正確" } } };
    render(<ReservationForm />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true"));
  });

  it("其他錯誤顯示通用訊息,不顯示技術細節", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 500, body: { error: "INTERNAL" } };
    render(<ReservationForm />);
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "送出訂位" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("系統忙碌中");
    expect(within(alert).queryByText(/INTERNAL/)).toBeNull();
  });
});
