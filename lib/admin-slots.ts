import { isIsoDate } from "@/lib/dates";

export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 200;

/** Index matches Postgres `extract(dow)`: 0 = Sunday. */
export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type AdminSlot = {
  id: number;
  weekday: number | null;
  date: string | null;
  startTime: string;
  capacity: number;
  active: boolean;
};

export type SlotRow = {
  id: number;
  weekday: number | null;
  slot_date: string | null;
  start_time: string;
  capacity: number;
  is_active: boolean;
};

export function mapSlotRow(row: SlotRow): AdminSlot {
  return {
    id: row.id,
    weekday: row.weekday,
    date: row.slot_date,
    startTime: row.start_time.slice(0, 5),
    capacity: row.capacity,
    active: row.is_active,
  };
}

const byTime = (a: AdminSlot, b: AdminSlot) => a.startTime.localeCompare(b.startTime);

export function groupSlots(slots: AdminSlot[], today: string) {
  const weekly: { weekday: number; slots: AdminSlot[] }[] = [];
  for (let day = 0; day < 7; day++) {
    const list = slots.filter((x) => x.date === null && x.weekday === day).sort(byTime);
    if (list.length > 0) weekly.push({ weekday: day, slots: list });
  }
  const dated = slots
    .filter((x) => x.date !== null && x.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || byTime(a, b));
  return { weekly, dated };
}

export type NewSlotForm = { kind: "weekly" | "date"; weekday: string; date: string; startTime: string; capacity: string };
export type NewSlot = { weekday: number | null; date: string | null; startTime: string; capacity: number };
export type NewSlotField = "weekday" | "date" | "startTime" | "capacity";

export function isValidCapacity(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= MIN_CAPACITY && n <= MAX_CAPACITY;
}

export function validateNewSlot(
  form: NewSlotForm,
  today: string,
): { ok: true; value: NewSlot } | { ok: false; field: NewSlotField } {
  let weekday: number | null = null;
  let date: string | null = null;
  if (form.kind === "weekly") {
    if (!/^[0-6]$/.test(form.weekday)) return { ok: false, field: "weekday" };
    weekday = Number(form.weekday);
  } else {
    if (!isIsoDate(form.date) || form.date < today) return { ok: false, field: "date" };
    date = form.date;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.startTime)) return { ok: false, field: "startTime" };
  if (!isValidCapacity(form.capacity)) return { ok: false, field: "capacity" };
  return { ok: true, value: { weekday, date, startTime: form.startTime, capacity: Number(form.capacity) } };
}
