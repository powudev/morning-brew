// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeApi } from "@/components/admin/test-fake-api";

// 與 Next.js 相同:useRouter() 每次回傳同一個物件(否則依賴 router 的 effect 會每次 render 重跑)
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
  it("有 Email 與 Password 欄位,密碼欄為 password 類型", async () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("空白送出不呼叫登入,並提示填寫", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your email and password.");
    expect(api.signIn).not.toHaveBeenCalled();
  });

  it("帳密錯誤顯示訊息,不導頁", async () => {
    api.signIn.mockResolvedValue({ ok: false, error: "invalid_credentials" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("伺服器連不上時顯示訊息", async () => {
    api.signIn.mockResolvedValue({ ok: false, error: "network" });
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server");
  });

  it("登入成功但不是 staff:立即登出並拒絕", async () => {
    api.isStaff.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("This account doesn't have staff access.");
    expect(api.signOut).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("staff 登入成功後前往 /admin/", async () => {
    api.isStaff.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<LoginForm />);
    await fillAndSubmit(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/"));
    expect(api.signIn).toHaveBeenCalledWith("staff@example.com", "secret-pass");
  });

  it("已經以 staff 登入時直接前往 /admin/", async () => {
    api.getSession.mockResolvedValue({ userId: "u", email: "staff@example.com" });
    api.isStaff.mockResolvedValue(true);
    render(<LoginForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/"));
  });
});
