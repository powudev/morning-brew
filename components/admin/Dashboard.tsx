"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LOGIN_PATH, useAdminApi } from "@/components/admin/useAdminApi";
import { AdminApiError } from "@/lib/admin-api";
import {
  reservationStatuses,
  summarize,
  type AdminReservation,
  type ReservationStatus,
} from "@/lib/admin-reservations";
import { todayInTaipei } from "@/lib/dates";

const statusLabel: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
const actionLabel: Record<ReservationStatus, string> = {
  confirmed: "Confirm",
  cancelled: "Cancel",
  pending: "Mark as pending",
};
const badgeClass: Record<ReservationStatus, string> = {
  pending: "bg-latte text-espresso",
  confirmed: "bg-espresso text-cream",
  cancelled: "bg-foam text-ink/80 ring-1 ring-espresso/20",
};

type Loaded = { date: string; list: AdminReservation[]; error: string | null };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const controlClass = "mt-1 block min-h-11 rounded-lg border border-espresso/30 bg-foam px-3";

export default function Dashboard() {
  const router = useRouter();
  const api = useAdminApi();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(() => todayInTaipei());
  const [filter, setFilter] = useState<ReservationStatus | "all">("all");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. 確認是 staff,否則登出並導回登入頁(真正的權限由 RLS 把關,這裡只是導覽)
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

  // 2. 讀取選定日期的訂位(loading 狀態由「已載入的日期 ≠ 目前日期」推導)
  useEffect(() => {
    if (!ready) return;
    let active = true;
    api()
      .listReservations(date)
      .then((list) => active && setLoaded({ date, list, error: null }))
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof AdminApiError && err.code === "forbidden") return router.replace(LOGIN_PATH);
        setLoaded({ date, list: [], error: "Couldn't load reservations. Please try again." });
      });
    return () => {
      active = false;
    };
  }, [ready, date, api, router]);

  async function changeStatus(r: AdminReservation, status: ReservationStatus) {
    setActionError(null);
    setSaving(r.id);
    try {
      await api().updateStatus(r.id, status);
      setLoaded((l) => l && { ...l, list: l.list.map((x) => (x.id === r.id ? { ...x, status } : x)) });
    } catch (err) {
      if (err instanceof AdminApiError && err.code === "forbidden") return router.replace(LOGIN_PATH);
      setActionError("Couldn't save the change. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function signOut() {
    await api().signOut();
    router.replace(LOGIN_PATH);
  }

  if (!ready) return <p className="py-8 text-ink/80">Checking your session…</p>;

  const loading = loaded?.date !== date;
  const list = loading ? [] : (loaded?.list ?? []);
  const visible = filter === "all" ? list : list.filter((r) => r.status === filter);
  const stats = summarize(list);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-espresso">Reservations</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink/80">{email}</span>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-4 font-semibold hover:bg-espresso/5"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="date" className="font-semibold">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={controlClass}
          />
        </div>
        <button
          type="button"
          onClick={() => setDate(todayInTaipei())}
          className="inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-4 font-semibold hover:bg-espresso/5"
        >
          Today
        </button>
        <div>
          <label htmlFor="status-filter" className="font-semibold">
            Status
          </label>
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ReservationStatus | "all")}
            className={controlClass}
          >
            <option value="all">All</option>
            {reservationStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border-2 border-red-800 bg-foam p-3 font-semibold text-red-800">
          {actionError}
        </div>
      )}

      {loading ? (
        <p className="text-ink/80">Loading reservations…</p>
      ) : loaded?.error ? (
        <p className="font-semibold text-red-800">{loaded.error}</p>
      ) : (
        <>
          <p className="font-semibold">
            {plural(stats.total, "reservation", "reservations")} · {plural(stats.guests, "guest", "guests")}
          </p>
          {visible.length === 0 ? (
            <p className="text-ink/80">No reservations for this date.</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => (
                <li
                  key={r.id}
                  aria-labelledby={`res-${r.id}`}
                  className="grid gap-3 rounded-2xl bg-foam p-4 ring-1 ring-espresso/10 md:grid-cols-[5rem_1fr_auto] md:items-center"
                >
                  <p className="text-lg font-bold text-espresso">{r.startTime}</p>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span id={`res-${r.id}`} className="font-semibold">
                        {r.name}
                      </span>
                      <span>· {plural(r.partySize, "guest", "guests")}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${badgeClass[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                    </p>
                    <p className="break-words text-sm text-ink/80">
                      {r.email}
                      {r.phone && ` · ${r.phone}`}
                    </p>
                    {r.note && <p className="mt-1 text-sm">Note: {r.note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reservationStatuses
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={saving === r.id}
                          onClick={() => changeStatus(r, s)}
                          aria-label={`${actionLabel[s]} reservation for ${r.name} at ${r.startTime}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-4 text-sm font-semibold hover:bg-espresso/5 disabled:opacity-60"
                        >
                          {actionLabel[s]}
                        </button>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
