import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  mapReservationRow,
  sortReservations,
  type AdminReservation,
  type ReservationRow,
  type ReservationStatus,
} from "@/lib/admin-reservations";

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
      // Same error for unknown email and wrong password, so accounts can't be enumerated.
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
      // RLS filters rows silently: an update that matches nothing means no access or no such row.
      if (!data || data.length === 0) {
        throw new AdminApiError((await api.isStaff()) ? "not_found" : "forbidden");
      }
    },
  };
  return api;
}

let browserApi: AdminApi | null = null;

export function getAdminApi(): AdminApi {
  if (browserApi) return browserApi;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定");
  browserApi = createAdminApi(createClient(url, anonKey));
  return browserApi;
}
