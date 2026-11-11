// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayInTaipei } from "@/lib/dates";
import { getDictionary, interpolate } from "@/lib/dictionary";
import { localePath, locales, type Locale } from "@/lib/i18n";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/Turnstile", () => ({
  default: ({ onToken }: { onToken: (t: string | null) => void }) => (
    <button type="button" onClick={() => onToken("test-token")}>
      Complete verification (mock)
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
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- fixed test strings, not user input
  const slotName = (time: string) => new RegExp(`^${time}`);

  async function pickDate() {
    fireEvent.change(screen.getByLabelText(label.date), { target: { value: date } });
    await screen.findByRole("radio", { name: slotName("08:00") });
  }

  async function fillValid(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(label.name), "Alex Chen");
    await user.type(screen.getByLabelText(label.email), "demo@example.com");
    await pickDate();
    await user.click(screen.getByRole("radio", { name: slotName("08:00") }));
    await user.click(screen.getByRole("button", { name: "Complete verification (mock)" }));
  }

  const submit = () => screen.getByRole("button", { name: f.submit });
  return { d, f, label, slotName, pickDate, fillValid, submit };
}

const reserveCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/reserve");

describe.each(locales)("ReservationForm(%s)", (locale) => {
  const { f, label, slotName, pickDate, fillValid, submit } = setup(locale);

  it("every field has a localized label and the date is limited to the bookable range", () => {
    render(<ReservationForm locale={locale} />);
    for (const text of Object.values(label).filter((l) => l !== label.slots)) {
      expect(screen.getByLabelText(text)).toBeInTheDocument();
    }
    const dateInput = screen.getByLabelText(label.date);
    expect(dateInput).toHaveAttribute("min", todayInTaipei());
    expect(dateInput).toHaveAttribute("max", addDays(todayInTaipei(), 30));
  });

  it("hides time slots until a date is picked and asks for a date first", () => {
    render(<ReservationForm locale={locale} />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByText(f.pickDateFirst)).toBeInTheDocument();
  });

  it("empty submit shows localized field errors, sets aria-invalid and sends no request", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await user.click(submit());
    expect(await screen.findByText(f.errors.name_required)).toBeInTheDocument();
    expect(screen.getByLabelText(label.name)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(label.name)).toHaveAccessibleDescription(f.errors.name_required);
    expect(screen.getByText(f.errors.turnstile_required)).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(0);
  });

  it("loads slots after picking a date; full slots are disabled", async () => {
    render(<ReservationForm locale={locale} />);
    await pickDate();
    expect(fetchMock).toHaveBeenCalledWith(`/api/slots?date=${date}`, expect.anything());
    expect(screen.getByRole("radio", { name: interpolate(f.slotRemaining, { time: "08:00", n: 12 }) })).toBeEnabled();
    expect(screen.getByRole("radio", { name: interpolate(f.slotFull, { time: "12:00" }) })).toBeDisabled();
  });

  it("slots with fewer seats than the party size are disabled", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await pickDate();
    expect(screen.getByRole("radio", { name: slotName("10:00") })).toBeEnabled();
    await user.selectOptions(screen.getByLabelText(label.partySize), "3");
    expect(screen.getByRole("radio", { name: interpolate(f.slotNotEnough, { time: "10:00", n: 2 }) })).toBeDisabled();
  });

  it("on success sends the right payload and goes to the localized confirmation page", async () => {
    const user = userEvent.setup();
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.type(screen.getByLabelText(label.note), "Window seat");
    await user.click(submit());
    await waitFor(() => expect(push).toHaveBeenCalledWith(localePath(locale, "/reserve/done/")));
    const [, init] = reserveCalls()[0];
    expect(new Headers(init!.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init!.body as string)).toEqual({
      name: "Alex Chen",
      email: "demo@example.com",
      phone: "",
      partySize: 2,
      date,
      slotId: 11,
      note: "Window seat",
      turnstileToken: "test-token",
    });
  });

  it("when the slot just filled up (409) shows a message and reloads slots", async () => {
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

  it("when Turnstile fails (403) asks to verify again", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 403, body: { error: "TURNSTILE_FAILED" } };
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(f.server.TURNSTILE_FAILED);
    await user.click(submit());
    expect(await screen.findByText(f.errors.turnstile_required)).toBeInTheDocument();
    expect(reserveCalls()).toHaveLength(1);
  });

  it("server field error codes (400) are shown, localized, on the matching fields", async () => {
    const user = userEvent.setup();
    reserveReply = { status: 400, body: { error: "VALIDATION", fields: { email: "email_invalid" } } };
    render(<ReservationForm locale={locale} />);
    await fillValid(user);
    await user.click(submit());
    await waitFor(() => expect(screen.getByLabelText(label.email)).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText(f.errors.email_invalid)).toBeInTheDocument();
  });

  it("other errors show a generic message without technical details", async () => {
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
