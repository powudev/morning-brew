export const reservationStatuses = ["pending", "confirmed", "cancelled"] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

export type AdminReservation = {
  id: string;
  date: string;
  startTime: string;
  name: string;
  email: string;
  phone: string | null;
  partySize: number;
  note: string | null;
  status: ReservationStatus;
  createdAt: string;
};

type SlotRef = { start_time: string };
export type ReservationRow = {
  id: string;
  reservation_date: string;
  name: string;
  email: string;
  phone: string | null;
  party_size: number;
  note: string | null;
  status: string;
  created_at: string;
  time_slots: SlotRef | SlotRef[] | null;
};

export function isReservationStatus(value: string): value is ReservationStatus {
  return (reservationStatuses as readonly string[]).includes(value);
}

export function mapReservationRow(row: ReservationRow): AdminReservation {
  if (!isReservationStatus(row.status)) throw new Error(`unknown reservation status: ${row.status}`);
  const slot = Array.isArray(row.time_slots) ? row.time_slots[0] : row.time_slots;
  return {
    id: row.id,
    date: row.reservation_date,
    startTime: (slot?.start_time ?? "").slice(0, 5),
    name: row.name,
    email: row.email,
    phone: row.phone,
    partySize: row.party_size,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function sortReservations(list: AdminReservation[]): AdminReservation[] {
  return [...list].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.createdAt.localeCompare(b.createdAt));
}

export function summarize(list: AdminReservation[]) {
  const byStatus: Record<ReservationStatus, number> = { pending: 0, confirmed: 0, cancelled: 0 };
  let guests = 0;
  for (const r of list) {
    byStatus[r.status] += 1;
    if (r.status !== "cancelled") guests += r.partySize;
  }
  return { total: list.length, guests, byStatus };
}
