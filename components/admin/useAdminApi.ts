"use client";

import { useCallback, useRef } from "react";
import { getAdminApi, type AdminApi } from "@/lib/admin-api";

export function useAdminApi(): () => AdminApi {
  const ref = useRef<AdminApi | null>(null);
  return useCallback(() => (ref.current ??= getAdminApi()), []);
}

export const LOGIN_PATH = "/admin/login/";
export const DASHBOARD_PATH = "/admin/";
