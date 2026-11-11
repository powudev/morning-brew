// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeApi } from "@/components/admin/test-fake-api";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const replace = router.replace;
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const holder = vi.hoisted(() => ({ api: null as unknown }));
vi.mock("@/lib/admin-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/admin-api")>()),
  getAdminApi: () => holder.api,
}));

import LoginForm from "@/components/admin/LoginForm";

let api: ReturnType<typeof fakeApi>;
beforeEach(() => {
  api = fakeApi();
  holder.api = api;
  replace.mockClear();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "staff@example.com");
  await user.type(screen.getByLabelText("Password"), "secret-pass");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  it("has Email and Password fields; the password field is type=password", async () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("empty submit does not sign in and asks for the fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your email and password.");
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it("wrong credentials show a message and stay on the page", async () => {
    api.signIn.mockResolvedValue({ ok: false, error: "invalid_credentials" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a message when the server is unreachable", async () => {
    api.signIn.mockResolvedValue({ ok: false, error: "network" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server");
  });

  it("signed in but not staff: signs out immediately and refuses", async () => {
    api.isStaff.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("This account doesn't have staff access.");
    expect(api.signOut).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("staff sign-in goes to /admin/", async () => {
    api.isStaff.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/"));
    expect(api.signIn).toHaveBeenCalledWith("staff@example.com", "secret-pass");
  });

  it("already signed in as staff goes straight to /admin/", async () => {
    api.getSession.mockResolvedValue({ userId: "u", email: "staff@example.com" });
    api.isStaff.mockResolvedValue(true);
    render(<LoginForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/"));
  });
});
