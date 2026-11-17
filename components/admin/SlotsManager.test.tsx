// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeApi } from "@/components/admin/test-fake-api";
import { AdminApiError } from "@/lib/admin-api";
import type { AdminSlot } from "@/lib/admin-slots";
import { addDays, todayInTaipei } from "@/lib/dates";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const replace = router.replace;
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/admin/slots/" }));
const holder = vi.hoisted(() => ({ api: null as unknown }));
vi.mock("@/lib/admin-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/admin-api")>()),
  getAdminApi: () => holder.api,
}));

import SlotsManager from "@/components/admin/SlotsManager";

const future = addDays(todayInTaipei(), 3);
const sample: AdminSlot[] = [
  { id: 1, weekday: 1, date: null, startTime: "08:00", capacity: 10, active: true },
  { id: 2, weekday: 1, date: null, startTime: "07:00", capacity: 8, active: false },
  { id: 3, weekday: null, date: future, startTime: "18:00", capacity: 4, active: true },
  { id: 4, weekday: null, date: "2000-01-01", startTime: "18:00", capacity: 4, active: true },
];

let api: ReturnType<typeof fakeApi>;
function signedInStaff(list = sample) {
  api.getSession.mockResolvedValue({ userId: "u", email: "staff@example.com" });
  api.isStaff.mockResolvedValue(true);
  api.listSlots.mockResolvedValue(list);
}
const slotRow = (name: string) => screen.getByRole("listitem", { name });

beforeEach(() => {
  api = fakeApi();
  holder.api = api;
  replace.mockClear();
});

describe("SlotsManager: access", () => {
  it("redirects to sign-in when signed out and loads no slots", async () => {
    render(<SlotsManager />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.listSlots).not.toHaveBeenCalled();
  });

  it("non-staff is signed out and redirected", async () => {
    api.getSession.mockResolvedValue({ userId: "u", email: "x@example.com" });
    render(<SlotsManager />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
    expect(api.signOut).toHaveBeenCalled();
    expect(api.listSlots).not.toHaveBeenCalled();
  });
});

describe("SlotsManager: list", () => {
  it("groups weekly slots by weekday, lists upcoming dates, hides past dates", async () => {
    signedInStaff();
    render(<SlotsManager />);
    await screen.findByRole("heading", { name: "Monday" });
    const monday = screen.getByRole("list", { name: "Monday" });
    expect(within(monday).getAllByRole("listitem").map((li) => li.getAttribute("aria-label"))).toEqual([
      "Monday 07:00",
      "Monday 08:00",
    ]);
    expect(slotRow("Monday 07:00")).toHaveTextContent("Inactive");
    expect(slotRow(`${future} 18:00`)).toBeInTheDocument();
    expect(screen.queryByRole("listitem", { name: "2000-01-01 18:00" })).toBeNull();
    expect(screen.getByRole("link", { name: "Time slots" })).toHaveAttribute("aria-current", "page");
  });

  it("shows an error when slots can't be loaded", async () => {
    signedInStaff();
    api.listSlots.mockRejectedValue(new AdminApiError("network"));
    render(<SlotsManager />);
    expect(await screen.findByText("Couldn't load time slots. Please try again.")).toBeInTheDocument();
  });

  it("forbidden while loading redirects to sign-in", async () => {
    signedInStaff();
    api.listSlots.mockRejectedValue(new AdminApiError("forbidden"));
    render(<SlotsManager />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("SlotsManager: edit", () => {
  it("saves a new capacity", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<SlotsManager />);
    const row = await screen.findByRole("listitem", { name: "Monday 08:00" });
    const input = within(row).getByLabelText("Capacity for Monday 08:00");
    await user.clear(input);
    await user.type(input, "12");
    await user.click(within(row).getByRole("button", { name: "Save capacity for Monday 08:00" }));
    expect(api.updateSlot).toHaveBeenCalledWith(1, { capacity: 12 });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved Monday 08:00.");
  });

  it("refuses an invalid capacity without calling the API", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<SlotsManager />);
    const row = await screen.findByRole("listitem", { name: "Monday 08:00" });
    const input = within(row).getByLabelText("Capacity for Monday 08:00");
    await user.clear(input);
    await user.type(input, "0");
    await user.click(within(row).getByRole("button", { name: "Save capacity for Monday 08:00" }));
    expect(api.updateSlot).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Capacity must be a whole number from 1 to 200.");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("deactivates and reactivates a slot", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<SlotsManager />);
    const row = await screen.findByRole("listitem", { name: "Monday 08:00" });
    await user.click(within(row).getByRole("button", { name: "Deactivate Monday 08:00" }));
    expect(api.updateSlot).toHaveBeenCalledWith(1, { active: false });
    expect(row).toHaveTextContent("Inactive");
    await user.click(within(row).getByRole("button", { name: "Activate Monday 08:00" }));
    expect(api.updateSlot).toHaveBeenLastCalledWith(1, { active: true });
  });

  it("a save error shows a message; forbidden redirects", async () => {
    signedInStaff();
    const user = userEvent.setup();
    api.updateSlot.mockRejectedValueOnce(new AdminApiError("network"));
    render(<SlotsManager />);
    const row = await screen.findByRole("listitem", { name: "Monday 08:00" });
    await user.click(within(row).getByRole("button", { name: "Deactivate Monday 08:00" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the change. Please try again.");
    expect(row).not.toHaveTextContent("Inactive");

    api.updateSlot.mockRejectedValueOnce(new AdminApiError("forbidden"));
    await user.click(within(row).getByRole("button", { name: "Deactivate Monday 08:00" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/login/"));
  });
});

describe("SlotsManager: add", () => {
  it("adds a weekly slot and shows it in the list", async () => {
    signedInStaff();
    api.createSlot.mockResolvedValue({ id: 9, weekday: 3, date: null, startTime: "09:30", capacity: 6, active: true });
    const user = userEvent.setup();
    render(<SlotsManager />);
    await screen.findByRole("heading", { name: "Monday" });
    const form = screen.getByRole("form", { name: "Add a time slot" });
    await user.selectOptions(within(form).getByLabelText("Weekday"), "3");
    await user.type(within(form).getByLabelText("Start time"), "09:30");
    await user.clear(within(form).getByLabelText("Capacity"));
    await user.type(within(form).getByLabelText("Capacity"), "6");
    await user.click(within(form).getByRole("button", { name: "Add slot" }));
    expect(api.createSlot).toHaveBeenCalledWith({ weekday: 3, date: null, startTime: "09:30", capacity: 6 });
    expect(await screen.findByRole("listitem", { name: "Wednesday 09:30" })).toBeInTheDocument();
  });

  it("adds a date slot", async () => {
    signedInStaff();
    api.createSlot.mockResolvedValue({ id: 10, weekday: null, date: future, startTime: "20:00", capacity: 2, active: true });
    const user = userEvent.setup();
    render(<SlotsManager />);
    await screen.findByRole("heading", { name: "Monday" });
    const form = screen.getByRole("form", { name: "Add a time slot" });
    await user.click(within(form).getByLabelText("Specific date"));
    await user.type(within(form).getByLabelText("Date"), future);
    await user.type(within(form).getByLabelText("Start time"), "20:00");
    await user.clear(within(form).getByLabelText("Capacity"));
    await user.type(within(form).getByLabelText("Capacity"), "2");
    await user.click(within(form).getByRole("button", { name: "Add slot" }));
    expect(api.createSlot).toHaveBeenCalledWith({ weekday: null, date: future, startTime: "20:00", capacity: 2 });
    expect(await screen.findByRole("listitem", { name: `${future} 20:00` })).toBeInTheDocument();
  });

  it("invalid input is flagged and not sent", async () => {
    signedInStaff();
    const user = userEvent.setup();
    render(<SlotsManager />);
    await screen.findByRole("heading", { name: "Monday" });
    const form = screen.getByRole("form", { name: "Add a time slot" });
    await user.click(within(form).getByRole("button", { name: "Add slot" }));
    expect(api.createSlot).not.toHaveBeenCalled();
    expect(within(form).getByLabelText("Start time")).toHaveAttribute("aria-invalid", "true");
    expect(within(form).getByRole("alert")).toHaveTextContent("Enter a start time.");
  });

  it("a duplicate slot shows a clear message", async () => {
    signedInStaff();
    api.createSlot.mockRejectedValue(new AdminApiError("duplicate"));
    const user = userEvent.setup();
    render(<SlotsManager />);
    await screen.findByRole("heading", { name: "Monday" });
    const form = screen.getByRole("form", { name: "Add a time slot" });
    await user.type(within(form).getByLabelText("Start time"), "08:00");
    await user.click(within(form).getByRole("button", { name: "Add slot" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("A slot already exists at that time.");
  });
});
