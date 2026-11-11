// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeApi } from "@/components/admin/test-fake-api";
import { AdminApiError } from "@/lib/admin-api";
import type { AdminReservation } from "@/lib/admin-reservations";
import { todayInTaipei } from "@/lib/dates";

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
// nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- fixed test strings, not user input
const row = (name: string) => screen.getByRole("listitem", { name: new RegExp(name) });

beforeEach(() => {
  api = fakeApi();
  holder.api = api;
  replace.mockClear();
});

describe("Dashboard: access", () => {
  it("redirects to sign-in when signed out and loads no reservations", async () => {
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.listReservations).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Reservations" })).toBeNull();
  });

  it("signed in but not staff: signs out and redirects to sign-in", async () => {
    api.getSession.mockResolvedValue({ userId: "u", email: "x@example.com" });
    api.isStaff.mockResolvedValue(false);
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.signOut).toHaveBeenCalled();
    expect(api.listReservations).not.toHaveBeenCalled();
  });

  it("session expired while loading (forbidden) redirects to sign-in", async () => {
    signedInStaff();
    api.listReservations.mockRejectedValue(new AdminApiError("forbidden"));
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("Dashboard: list", () => {
  it("shows today's reservations by default with time, name, party size, contact, note and status", async () => {
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

  it("shows totals: bookings and guests (excluding cancelled)", async () => {
    signedInStaff();
    render(<Dashboard />);
    expect(await screen.findByText("3 reservations · 5 guests")).toBeInTheDocument();
  });

  it("reloads when the date changes", async () => {
    signedInStaff();
    render(<Dashboard />);
    await screen.findByRole("listitem", { name: /Early A/ });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-12-24" } });
    await waitFor(() => expect(api.listReservations).toHaveBeenLastCalledWith("2026-12-24"));
  });

  it("status filter shows only that status", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<Dashboard />);
    await screen.findByRole("listitem", { name: /Early A/ });
    await user.selectOptions(screen.getByLabelText("Status"), "pending");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(row("Late B")).toBeInTheDocument();
  });

  it("shows a message when there are no reservations", async () => {
    signedInStaff([]);
    render(<Dashboard />);
    expect(await screen.findByText("No reservations for this date.")).toBeInTheDocument();
  });
});

describe("Dashboard: status changes", () => {
  it("Confirm calls updateStatus and updates the row; the current status has no button", async () => {
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

  it("save failure (network) shows a message and keeps the status", async () => {
    signedInStaff();
    api.updateStatus.mockRejectedValue(new AdminApiError("network"));
    const user = userEvent.setup();
    render(<Dashboard />);
    const b = await screen.findByRole("listitem", { name: /Late B/ });
    await user.click(within(b).getByRole("button", { name: /^Cancel reservation for Late B/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the change. Please try again.");
    expect(row("Late B")).toHaveTextContent("Pending");
  });

  it("access lost while saving (forbidden) redirects to sign-in", async () => {
    signedInStaff();
    api.updateStatus.mockRejectedValue(new AdminApiError("forbidden"));
    const user = userEvent.setup();
    render(<Dashboard />);
    const b = await screen.findByRole("listitem", { name: /Late B/ });
    await user.click(within(b).getByRole("button", { name: /^Confirm reservation for Late B/ }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("Dashboard: sign out", () => {
  it("Sign out signs out and returns to sign-in", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(api.signOut).toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});
