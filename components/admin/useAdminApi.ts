"use client";

import { useCallback, useRef } from "react";
import { getAdminApi, type AdminApi } from "@/lib/admin-api";

// 延遲到 effect / 事件中才建立 Supabase client:
// client 元件在 build 時也會預先渲染,render 階段建立會在缺少環境變數時讓 build 失敗
export function useAdminApi(): () => AdminApi {
  const ref = useRef<AdminApi | null>(null);
  return useCallback(() => (ref.current ??= getAdminApi()), []);
}

export const LOGIN_PATH = "/admin/login/";
export const DASHBOARD_PATH = "/admin/";
