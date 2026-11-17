"use client";

import { useEffect, useState, type FormEvent } from "react";
import StaffBar from "@/components/admin/StaffBar";
import { useStaffSession } from "@/components/admin/useStaffSession";
import { AdminApiError } from "@/lib/admin-api";
import {
  groupSlots,
  isValidCapacity,
  MAX_CAPACITY,
  MIN_CAPACITY,
  validateNewSlot,
  weekdayNames,
  type AdminSlot,
  type NewSlotField,
  type NewSlotForm,
} from "@/lib/admin-slots";
import { todayInTaipei } from "@/lib/dates";

const controlClass = "mt-1 block min-h-11 rounded-lg border border-espresso/30 bg-foam px-3";
const buttonClass =
  "inline-flex min-h-11 items-center rounded-full border border-espresso/30 px-4 text-sm font-semibold hover:bg-espresso/5 disabled:opacity-60";
const capacityMessage = `Capacity must be a whole number from ${MIN_CAPACITY} to ${MAX_CAPACITY}.`;
const fieldMessages: Record<NewSlotField, string> = {
  weekday: "Choose a weekday.",
  date: "Choose today or a later date.",
  startTime: "Enter a start time.",
  capacity: capacityMessage,
};

const slotLabel = (s: AdminSlot) => `${s.date ?? weekdayNames[s.weekday ?? 0]} ${s.startTime}`;
const emptyForm = (): NewSlotForm => ({ kind: "weekly", weekday: "1", date: "", startTime: "", capacity: "10" });

export default function SlotsManager() {
  const { ready, email, signOut, handleForbidden, api } = useStaffSession();
  const [slots, setSlots] = useState<AdminSlot[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [invalidId, setInvalidId] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<NewSlotForm>(emptyForm);
  const [formError, setFormError] = useState<{ field: NewSlotField | null; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    api()
      .listSlots()
      .then((list) => active && setSlots(list))
      .catch((err: unknown) => {
        if (!active || handleForbidden(err)) return;
        setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [ready, api, handleForbidden]);

  async function save(slot: AdminSlot, change: { capacity?: number; active?: boolean }) {
    setMessage(null);
    setSaving(slot.id);
    try {
      await api().updateSlot(slot.id, change);
      setSlots((list) => list && list.map((x) => (x.id === slot.id ? { ...x, ...change } : x)));
      setMessage({ kind: "ok", text: `Saved ${slotLabel(slot)}.` });
    } catch (err) {
      if (handleForbidden(err)) return;
      const invalid = err instanceof AdminApiError && err.code === "invalid";
      setMessage({ kind: "error", text: invalid ? capacityMessage : "Couldn't save the change. Please try again." });
    } finally {
      setSaving(null);
    }
  }

  function saveCapacity(slot: AdminSlot) {
    const value = drafts[slot.id] ?? String(slot.capacity);
    if (!isValidCapacity(value)) {
      setInvalidId(slot.id);
      setMessage({ kind: "error", text: capacityMessage });
      return;
    }
    setInvalidId(null);
    void save(slot, { capacity: Number(value) });
  }

  async function addSlot(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = validateNewSlot(form, todayInTaipei());
    if (!result.ok) {
      setFormError({ field: result.field, text: fieldMessages[result.field] });
      return;
    }
    setAdding(true);
    try {
      const created = await api().createSlot(result.value);
      setSlots((list) => [...(list ?? []), created]);
      setForm(emptyForm());
      setMessage({ kind: "ok", text: `Added ${slotLabel(created)}.` });
    } catch (err) {
      if (handleForbidden(err)) return;
      const code = err instanceof AdminApiError ? err.code : "unknown";
      setFormError({
        field: null,
        text:
          code === "duplicate"
            ? "A slot already exists at that time."
            : code === "invalid"
              ? "Please check the values and try again."
              : "Couldn't add the slot. Please try again.",
      });
    } finally {
      setAdding(false);
    }
  }

  if (!ready) return <p className="py-8 text-ink/80">Checking your session…</p>;

  const { weekly, dated } = groupSlots(slots ?? [], todayInTaipei());

  const row = (slot: AdminSlot) => {
    const label = slotLabel(slot);
    const inputId = `capacity-${slot.id}`;
    return (
      <li
        key={slot.id}
        aria-label={label}
        className="flex flex-wrap items-center gap-3 rounded-2xl bg-foam p-3 ring-1 ring-espresso/10"
      >
        <span className="w-14 text-lg font-bold text-espresso">{slot.startTime}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
            slot.active ? "bg-espresso text-cream" : "bg-cream text-ink/80 ring-1 ring-espresso/20"
          }`}
        >
          {slot.active ? "Active" : "Inactive"}
        </span>
        <label htmlFor={inputId} className="sr-only">
          Capacity for {label}
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          value={drafts[slot.id] ?? String(slot.capacity)}
          aria-invalid={invalidId === slot.id || undefined}
          onChange={(e) => setDrafts((d) => ({ ...d, [slot.id]: e.target.value }))}
          className="min-h-11 w-24 rounded-lg border border-espresso/30 bg-white px-3"
        />
        <span className="text-sm text-ink/80">seats</span>
        <button
          type="button"
          disabled={saving === slot.id}
          onClick={() => saveCapacity(slot)}
          aria-label={`Save capacity for ${label}`}
          className={buttonClass}
        >
          Save
        </button>
        <button
          type="button"
          disabled={saving === slot.id}
          onClick={() => save(slot, { active: !slot.active })}
          aria-label={`${slot.active ? "Deactivate" : "Activate"} ${label}`}
          className={buttonClass}
        >
          {slot.active ? "Deactivate" : "Activate"}
        </button>
      </li>
    );
  };

  const invalid = (field: NewSlotField) => (formError?.field === field ? true : undefined);

  return (
    <div className="space-y-8">
      <StaffBar email={email} onSignOut={signOut} />
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-espresso">Time slots</h1>
        <p className="max-w-prose text-ink/80">
          Capacity is the number of guests per slot. Deactivating a slot stops new bookings and keeps existing ones.
          To change a slot&apos;s time or day, add a new slot and deactivate the old one.
        </p>
      </div>

      {message && (
        <p
          role={message.kind === "ok" ? "status" : "alert"}
          className={
            message.kind === "ok"
              ? "rounded-lg bg-foam p-3 font-semibold text-espresso ring-1 ring-espresso/20"
              : "rounded-lg border-2 border-red-800 bg-foam p-3 font-semibold text-red-800"
          }
        >
          {message.text}
        </p>
      )}

      {loadError ? (
        <p className="font-semibold text-red-800">Couldn&apos;t load time slots. Please try again.</p>
      ) : slots === null ? (
        <p className="text-ink/80">Loading time slots…</p>
      ) : (
        <>
          <section aria-labelledby="weekly-heading" className="space-y-4">
            <h2 id="weekly-heading" className="font-display text-2xl font-bold text-espresso">
              Weekly schedule
            </h2>
            {weekly.length === 0 && <p className="text-ink/80">No weekly slots yet.</p>}
            {weekly.map((group) => (
              <div key={group.weekday} className="space-y-2">
                <h3 className="font-semibold">{weekdayNames[group.weekday]}</h3>
                <ul aria-label={weekdayNames[group.weekday]} className="space-y-2">
                  {group.slots.map(row)}
                </ul>
              </div>
            ))}
          </section>

          <section aria-labelledby="dated-heading" className="space-y-4">
            <h2 id="dated-heading" className="font-display text-2xl font-bold text-espresso">
              Specific dates
            </h2>
            {dated.length === 0 ? (
              <p className="text-ink/80">No upcoming date-specific slots.</p>
            ) : (
              <ul aria-label="Specific dates" className="space-y-2">
                {dated.map(row)}
              </ul>
            )}
          </section>
        </>
      )}

      <form
        aria-label="Add a time slot"
        noValidate
        onSubmit={addSlot}
        className="space-y-4 rounded-2xl bg-foam p-4 ring-1 ring-espresso/10"
      >
        <h2 className="font-display text-2xl font-bold text-espresso">Add a time slot</h2>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="font-semibold">Repeats</legend>
          {(["weekly", "date"] as const).map((kind) => (
            <label key={kind} className="inline-flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="kind"
                value={kind}
                checked={form.kind === kind}
                onChange={() => setForm((f) => ({ ...f, kind }))}
                className="h-5 w-5"
              />
              {kind === "weekly" ? "Every week" : "Specific date"}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-end gap-4">
          {form.kind === "weekly" ? (
            <div>
              <label htmlFor="new-weekday" className="font-semibold">
                Weekday
              </label>
              <select
                id="new-weekday"
                value={form.weekday}
                aria-invalid={invalid("weekday")}
                onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
                className={controlClass}
              >
                {weekdayNames.map((name, i) => (
                  <option key={name} value={String(i)}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="new-date" className="font-semibold">
                Date
              </label>
              <input
                id="new-date"
                type="date"
                min={todayInTaipei()}
                value={form.date}
                aria-invalid={invalid("date")}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={controlClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="new-time" className="font-semibold">
              Start time
            </label>
            <input
              id="new-time"
              type="time"
              value={form.startTime}
              aria-invalid={invalid("startTime")}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className={controlClass}
            />
          </div>
          <div>
            <label htmlFor="new-capacity" className="font-semibold">
              Capacity
            </label>
            <input
              id="new-capacity"
              type="number"
              inputMode="numeric"
              min={MIN_CAPACITY}
              max={MAX_CAPACITY}
              value={form.capacity}
              aria-invalid={invalid("capacity")}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              className={`${controlClass} w-28`}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex min-h-11 items-center rounded-full bg-espresso px-5 font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60"
          >
            Add slot
          </button>
        </div>
        {formError && (
          <p role="alert" className="font-semibold text-red-800">
            {formError.text}
          </p>
        )}
      </form>
    </div>
  );
}
