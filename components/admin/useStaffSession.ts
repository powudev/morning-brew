"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LOGIN_PATH, useAdminApi } from "@/components/admin/useAdminApi";
import { AdminApiError, type AdminApi } from "@/lib/admin-api";

/** Gate for staff pages: redirects to sign-in unless the session belongs to a staff member. */
export function useStaffSession() {
  const router = useRouter();
  const api = useAdminApi();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api().getSession();
        if (!session) return router.replace(LOGIN_PATH);
        if (!(await api().isStaff())) {
          await api().signOut();
          return router.replace(LOGIN_PATH);
        }
        if (active) {
          setEmail(session.email);
          setReady(true);
        }
      } catch {
        router.replace(LOGIN_PATH);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, router]);

  const signOut = useCallback(async () => {
    await api().signOut();
    router.replace(LOGIN_PATH);
  }, [api, router]);

  /** Returns true (and redirects) when the error means the session no longer has staff access. */
  const handleForbidden = useCallback(
    (err: unknown) => {
      if (err instanceof AdminApiError && err.code === "forbidden") {
        router.replace(LOGIN_PATH);
        return true;
      }
      return false;
    },
    [router],
  );

  return { ready, email, signOut, handleForbidden, api: api as () => AdminApi };
}
