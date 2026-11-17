import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  mapReservationRow,
  sortReservations,
  type AdminReservation,
  type ReservationRow,
  type ReservationStatus,
} from "@/lib/admin-reservations";
import { mapSlotRow, type AdminSlot, type NewSlot, type SlotRow } from "@/lib/admin-slots";

export type AdminErrorCode = "forbidden" | "not_found" | "duplicate" | "invalid" | "network" | "unknown";

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
  listSlots(): Promise<AdminSlot[]>;
  createSlot(slot: NewSlot): Promise<AdminSlot>;
  updateSlot(id: number, change: SlotChange): Promise<void>;
  /** Asks the server to email the guest that their reservation is confirmed. Never throws. */
  notifyConfirmed(id: string): Promise<NotifyResult>;
}

/** sent = emailed now; skipped = email off, not confirmed or already emailed; failed = try again later. */
export type NotifyResult = "sent" | "skipped" | "failed";
export const NOTIFY_CONFIRMED_PATH = "/api/admin/notify-confirmed";

/** Only these columns are updatable by staff (column grants); weekday/date/time changes = new slot. */
export type SlotChange = { capacity?: number; active?: boolean };

type DbError = { code?: string; message?: string } | null;

function toAdminError(error: NonNullable<DbError>): AdminApiError {
  if (error.code === "42501" || error.code?.startsWith("PGRST30")) return new AdminApiError("forbidden", error.message);
  if (error.code === "23505") return new AdminApiError("duplicate", error.message);
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007") {
    return new AdminApiError("invalid", error.message);
  }
  if (/fetch|network/i.test(error.message ?? "")) return new AdminApiError("network", error.message);
  return new AdminApiError("unknown", error.message);
}

const SLOT_COLUMNS = "id, weekday, slot_date, start_time, capacity, is_active";

const RESERVATION_COLUMNS =
  "id, reservation_date, name, email, phone, party_size, note, status, created_at, time_slots(start_time)";

export function createAdminApi(client: SupabaseClient, fetchImpl: typeof fetch = (...args) => fetch(...args)): AdminApi {
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

    async listSlots() {
      const { data, error } = await client.from("time_slots").select(SLOT_COLUMNS);
      if (error) throw toAdminError(error);
      return (data as SlotRow[]).map(mapSlotRow);
    },

    async createSlot(slot) {
      const { data, error } = await client
        .from("time_slots")
        .insert({ weekday: slot.weekday, slot_date: slot.date, start_time: slot.startTime, capacity: slot.capacity })
        .select(SLOT_COLUMNS)
        .single();
      if (error) throw toAdminError(error);
      return mapSlotRow(data as SlotRow);
    },

    async updateSlot(id, change) {
      const patch: Record<string, unknown> = {};
      if (change.capacity !== undefined) patch.capacity = change.capacity;
      if (change.active !== undefined) patch.is_active = change.active;
      const { data, error } = await client.from("time_slots").update(patch).eq("id", id).select("id");
      if (error) throw toAdminError(error);
      if (!data || data.length === 0) {
        throw new AdminApiError((await api.isStaff()) ? "not_found" : "forbidden");
      }
    },

    async notifyConfirmed(id) {
      try {
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return "failed";
        const res = await fetchImpl(NOTIFY_CONFIRMED_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) return "failed";
        const body = (await res.json()) as { sent?: boolean };
        return body.sent ? "sent" : "skipped";
      } catch {
        return "failed";
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
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set");
  browserApi = createAdminApi(createClient(url, anonKey));
  return browserApi;
}
