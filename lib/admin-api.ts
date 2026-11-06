import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  mapReservationRow,
  sortReservations,
  type AdminReservation,
  type ReservationRow,
  type ReservationStatus,
} from "@/lib/admin-reservations";

// 後台在瀏覽器以「店家本人的登入 session + anon key」存取 Supabase。
// 權限完全由資料庫 RLS 決定(只有 staff 能讀/改訂位),這裡只負責呼叫與錯誤轉換。

export type AdminErrorCode = "forbidden" | "not_found" | "network" | "unknown";

export class AdminApiError extends Error {
  constructor(
    public readonly code: AdminErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AdminApiError";
  }
}

export type AdminSession = { userId: string; email: string };
export type SignInResult = { ok: true } | { ok: false; error: "invalid_credentials" | "network" };

export interface AdminApi {
  getSession(): Promise<AdminSession | null>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  isStaff(): Promise<boolean>;
  listReservations(date: string): Promise<AdminReservation[]>;
  updateStatus(id: string, status: ReservationStatus): Promise<void>;
}

type DbError = { code?: string; message?: string } | null;

function toAdminError(error: NonNullable<DbError>): AdminApiError {
  // 42501:沒有資料表權限(anon);PGRST301/PGRST302:JWT 無效或過期
  if (error.code === "42501" || error.code?.startsWith("PGRST30")) return new AdminApiError("forbidden", error.message);
  if (/fetch|network/i.test(error.message ?? "")) return new AdminApiError("network", error.message);
  return new AdminApiError("unknown", error.message);
}

const RESERVATION_COLUMNS =
  "id, reservation_date, name, email, phone, party_size, note, status, created_at, time_slots(start_time)";

export function createAdminApi(client: SupabaseClient): AdminApi {
  const api: AdminApi = {
    async getSession() {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      return user ? { userId: user.id, email: user.email ?? "" } : null;
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (!error) return { ok: true };
      // 帳號不存在與密碼錯誤回同一種錯誤,不洩漏帳號是否存在
      return { ok: false, error: error.status && error.status < 500 ? "invalid_credentials" : "network" };
    },

    async signOut() {
      await client.auth.signOut();
    },

    async isStaff() {
      const session = await api.getSession();
      if (!session) return false;
      const { data, error } = await client.from("staff").select("user_id").eq("user_id", session.userId).maybeSingle();
      return !error && data !== null;
    },

    async listReservations(date) {
      const { data, error } = await client.from("reservations").select(RESERVATION_COLUMNS).eq("reservation_date", date);
      if (error) throw toAdminError(error);
      return sortReservations((data as unknown as ReservationRow[]).map(mapReservationRow));
    },

    async updateStatus(id, status) {
      const { data, error } = await client.from("reservations").update({ status }).eq("id", id).select("id");
      if (error) throw toAdminError(error);
      // RLS 會「靜默過濾」:沒權限時不報錯、只是改到 0 列,所以要自己判斷
      if (!data || data.length === 0) {
        throw new AdminApiError((await api.isStaff()) ? "not_found" : "forbidden");
      }
    },
  };
  return api;
}

let browserApi: AdminApi | null = null;

/** 瀏覽器端單例(session 存在 localStorage,由 supabase-js 管理) */
export function getAdminApi(): AdminApi {
  if (browserApi) return browserApi;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定");
  browserApi = createAdminApi(createClient(url, anonKey));
  return browserApi;
}
