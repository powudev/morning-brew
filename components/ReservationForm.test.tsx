// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayInTaipei } from "@/lib/dates";
import { getDictionary, interpolate } from "@/lib/dictionary";
import { localePath, locales, type Locale } from "@/lib/i18n";

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

function setup(locale: Locale) {
  const d = getDictionary(locale);
  const f = d.form;
  const label = f.labels;
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- 測試內固定字串,非使用者輸入
  const slotName = (time: string) => new RegExp(`^${time}`);

  async function pickDate() {
    fireEvent.change(screen.getByLabelText(label.date), { target: { value: date } });
    await screen.findByRole("radio", { name: slotName("08:00") });
  }

  async function fillValid(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(label.name), "王小明");
    await user.type(screen.getByLabelText(label.email), "demo@example.com");
    await pickDate();
    await user.click(screen.getByRole("radio", { name: slotName("08:00") }));
    await user.click(screen.getByRole("button", { name: "完成驗證(mock)" }));
  }

  const submit = () => screen.getByRole("button", { name: f.submit });
  return { d, f, label, slotName, pickDate, fillValid, submit };
}

const reserveCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/reserve");

describe.each(locales)("ReservationForm(%s)", (locale) => {
  const { f, label, slotName, pickDate, fillValid, submit } = setup(locale);

  it("每個欄位都有該語系的標籤,日期限制在可訂範圍內", () => {
    render(<ReservationForm locale={locale} />);
    for (const text of Object.values(label).filter((l) => l !== label.slots)) {
      expect(screen.getByLabelText(text)).toBeInTheDocument();
    }
    const dateInput = screen.getByLabelText(label.date);
    expect(dateInput).toHaveAttribute("min", todayInTaipei());
    expect(dateInput).toHaveAttribute("max", addDays(todayInTaipei(), 30));
  });

  it("未選日期前不顯示時段,並提示先選日期", () => {
    render(<ReservationForm locale={locale} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText(f.pickDateFirst)).toBeInTheDocument();
  });

  it("空白送出顯示該語系的欄位錯誤、標示 aria-invalid,且不送出請求", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await user.click(submit());
    expect(await screen.findByText(f.errors.name_required)).toBeInTheDocument();
    expect(screen.getByLabelText(label.name)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(label.name)).toHaveAccessibleDescription(f.errors.name_required);
    expect(screen.getByText(f.errors.turnstile_required)).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(0);
  });

  it("選日期後載入時段,額滿的時段不可選", async () => {
    render(<ReservationForm locale={locale} />);
    await pickDate();
    expect(fetchMock).toHaveBeenCalledWith(`/api/slots?date=${date}`, expect.anything());
    expect(screen.getByRole("radio", { name: interpolate(f.slotRemaining, { time: "08:00", n: 12 }) })).toBeEnabled();
    expect(screen.getByRole("radio", { name: interpolate(f.slotFull, { time: "12:00" }) })).toBeDisabled();
  });

  it("人數超過剩餘名額的時段不可選", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await pickDate();
    expect(screen.getByRole("radio", { name: slotName("10:00") })).toBeEnabled();
    await user.selectOptions(screen.getByLabelText(label.partySize), "3");
    expect(screen.getByRole("radio", { name: interpolate(f.slotNotEnough, { time: "10:00", n: 2 }) })).toBeDisabled();
  });

  it("送出成功後送出正確資料並前往該語系的完成頁", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.type(screen.getByLabelText(label.note), "靠窗");
    await user.click(submit());
    await waitFor(() => expect(push).toHaveBeenCalledWith(localePath(locale, "/reserve/done/")));
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
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    const slotCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/slots")).length;
    const before = slotCalls();
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(f.server.SLOT_FULL);
    await waitFor(() => expect(slotCalls()).toBe(before + 1));
    expect(push).not.toHaveBeenCalled();
  });

  it("Turnstile 驗證失敗(403)時要求重新驗證", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 403, body: { error: "TURNSTILE_FAILED" } };
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(f.server.TURNSTILE_FAILED);
    // token 已失效:再送一次會被前端擋下,要求重新完成驗證
    await user.click(submit());
    expect(await screen.findByText(f.errors.turnstile_required)).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(1);
  });

  it("伺服器回傳欄位錯誤代碼(400)時以該語系顯示在對應欄位", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 400, body: { error: "VALIDATION", fields: { email: "email_invalid" } } };
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.click(submit());
    await waitFor(() => expect(screen.getByLabelText(label.email)).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText(f.errors.email_invalid)).toBeInTheDocument();
  });

  it("其他錯誤顯示通用訊息,不顯示技術細節", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 500, body: { error: "INTERNAL" } };
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.click(submit());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(f.server.generic);
    expect(within(alert).queryByText(/INTERNAL/)).toBeNull();
  });
});
