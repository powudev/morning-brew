"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DASHBOARD_PATH, useAdminApi } from "@/components/admin/useAdminApi";

const inputClass = "mt-1 block min-h-11 w-full rounded-lg border border-espresso/30 bg-foam px-3 py-2";

export default function LoginForm() {
  const router = useRouter();
  const api = useAdminApi();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 已經以 staff 登入就直接進後台
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api().getSession();
        if (active && session && (await api().isStaff())) router.replace(DASHBOARD_PATH);
      } catch {
        // 未設定或連不上:留在登入頁,送出時再顯示錯誤
      }
    })();
    return () => {
      active = false;
    };
  }, [api, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending(true);
    try {
      const result = await api().signIn(email.trim(), password);
      if (!result.ok) {
        setError(
          result.error === "invalid_credentials"
            ? "Incorrect email or password."
            : "Couldn't reach the server. Please try again.",
        );
        return;
      }
      if (!(await api().isStaff())) {
        await api().signOut();
        setError("This account doesn't have staff access.");
        return;
      }
      router.replace(DASHBOARD_PATH);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mx-auto max-w-sm space-y-5">
      <h1 className="font-display text-3xl font-bold text-espresso">Staff sign in</h1>
      {error && (
        <div role="alert" className="rounded-lg border-2 border-red-800 bg-foam p-3 font-semibold text-red-800">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="font-semibold">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-espresso px-6 font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
