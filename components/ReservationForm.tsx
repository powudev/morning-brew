"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Turnstile from "@/components/Turnstile";
import { bookingWindow } from "@/lib/dates";
import { getDictionary, interpolate, type Dictionary } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { fieldErrors, reservationSchema, type FieldErrors } from "@/lib/reservation-schema";

type Slot = { slotId: number; startTime: string; remaining: number };
type SlotsState = { status: "idle" | "loading" | "ready" | "error"; slots: Slot[] };

const initialValues = { name: "", email: "", phone: "", partySize: "2", date: "", slotId: "", note: "" };
type Values = typeof initialValues;

const fieldOrder = ["name", "email", "phone", "partySize", "date", "slotId", "note"] as const;

const inputClass =
  "mt-1 block min-h-11 w-full rounded-lg border border-espresso/30 bg-foam px-3 py-2 aria-[invalid=true]:border-red-700";

type FormText = Dictionary["form"];

function slotLabel(f: FormText, slot: Slot, partySize: number): string {
  const vars = { time: slot.startTime, n: slot.remaining };
  if (slot.remaining === 0) return interpolate(f.slotFull, vars);
  if (slot.remaining < partySize) return interpolate(f.slotNotEnough, vars);
  return interpolate(f.slotRemaining, vars);
}

export default function ReservationForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const f = getDictionary(locale).form;
  const [{ min, max }] = useState(() => bookingWindow());
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [slotsState, setSlotsState] = useState<SlotsState>({ status: "idle", slots: [] });
  const [token, setToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const slotsRequest = useRef<AbortController | null>(null);

  const partySize = Number(values.partySize);

  const loadSlots = useCallback(async (date: string) => {
    slotsRequest.current?.abort();
    if (!date) {
      setSlotsState({ status: "idle", slots: [] });
      return;
    }
    const controller = new AbortController();
    slotsRequest.current = controller;
    setSlotsState({ status: "loading", slots: [] });
    try {
      const res = await fetch(`/api/slots?date=${encodeURIComponent(date)}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { slots: Slot[] };
      if (!controller.signal.aborted) setSlotsState({ status: "ready", slots: data.slots });
    } catch {
      if (!controller.signal.aborted) setSlotsState({ status: "error", slots: [] });
    }
  }, []);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "date") next.slotId = "";
      if (key === "partySize") {
        const selected = slotsState.slots.find((s) => String(s.slotId) === v.slotId);
        if (selected && selected.remaining < Number(value)) next.slotId = "";
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "date") void loadSlots(value);
  }

  function resetTurnstile() {
    setToken(null);
    setTurnstileKey((k) => k + 1);
  }

  function focusFirstError(errs: FieldErrors) {
    const first = fieldOrder.find((f) => errs[f]);
    if (first) document.getElementById(first === "slotId" ? "slots-fieldset" : first)?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = reservationSchema.safeParse({ ...values, turnstileToken: token ?? "" });
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      focusFirstError(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.status === 201) {
        router.push(localePath(locale, "/reserve/done/"));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: FieldErrors };
      if (res.status === 400 && data.fields && Object.keys(data.fields).length > 0) {
        setErrors(data.fields);
        focusFirstError(data.fields);
        return;
      }
      const server = f.server as Record<string, string>;
      setFormError((data.error && server[data.error]) || f.server.generic);
      resetTurnstile();
      if (res.status === 409 || res.status === 422) {
        setValues((v) => ({ ...v, slotId: "" }));
        void loadSlots(values.date);
      }
    } catch {
      setFormError(f.server.generic);
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  const describedBy = (field: keyof FieldErrors) => (errors[field] ? `${field}-error` : undefined);
  const errorText = (field: keyof FieldErrors) =>
    errors[field] ? (
      <p id={`${field}-error`} className="mt-1 text-sm font-semibold text-red-800">
        {(f.errors as Record<string, string>)[errors[field]!] ?? f.errors.invalid_form}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-lg border-2 border-red-800 bg-foam p-4 font-semibold text-red-800">
          {formError}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="font-semibold">
            {f.labels.name}
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
            className={inputClass}
          />
          {errorText("name")}
        </div>
        <div>
          <label htmlFor="email" className="font-semibold">
            {f.labels.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className={inputClass}
          />
          {errorText("email")}
        </div>
        <div>
          <label htmlFor="phone" className="font-semibold">
            {f.labels.phone}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={describedBy("phone")}
            className={inputClass}
          />
          {errorText("phone")}
        </div>
        <div>
          <label htmlFor="partySize" className="font-semibold">
            {f.labels.partySize}
          </label>
          <select
            id="partySize"
            name="partySize"
            value={values.partySize}
            onChange={(e) => update("partySize", e.target.value)}
            aria-invalid={errors.partySize ? true : undefined}
            aria-describedby={describedBy("partySize")}
            className={inputClass}
          >
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? f.partyOne : interpolate(f.partyMany, { n })}
              </option>
            ))}
          </select>
          {errorText("partySize")}
        </div>
        <div>
          <label htmlFor="date" className="font-semibold">
            {f.labels.date}
          </label>
          <input
            id="date"
            name="date"
            type="date"
            min={min}
            max={max}
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy("date")}
            className={inputClass}
          />
          {errorText("date")}
        </div>
      </div>

      <fieldset
        id="slots-fieldset"
        tabIndex={-1}
        aria-describedby={describedBy("slotId")}
        className="rounded-lg focus:outline-none"
      >
        <legend className="font-semibold">{f.labels.slots}</legend>
        {slotsState.status === "idle" && <p className="mt-2 text-ink/80">{f.pickDateFirst}</p>}
        {slotsState.status === "loading" && <p className="mt-2 text-ink/80">{f.loadingSlots}</p>}
        {slotsState.status === "error" && <p className="mt-2">{f.slotsError}</p>}
        {slotsState.status === "ready" && slotsState.slots.length === 0 && <p className="mt-2">{f.noSlots}</p>}
        {slotsState.status === "ready" && slotsState.slots.length > 0 && (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {slotsState.slots.map((slot) => {
              const disabled = slot.remaining < partySize;
              const id = `slot-${slot.slotId}`;
              return (
                <label
                  key={slot.slotId}
                  htmlFor={id}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 ${
                    disabled
                      ? "cursor-not-allowed border-espresso/15 text-ink/60"
                      : "cursor-pointer border-espresso/30 bg-foam has-[:checked]:border-espresso has-[:checked]:bg-latte"
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name="slotId"
                    value={slot.slotId}
                    disabled={disabled}
                    checked={values.slotId === String(slot.slotId)}
                    onChange={(e) => update("slotId", e.target.value)}
                    className="h-5 w-5 accent-espresso"
                  />
                  {slotLabel(f, slot, partySize)}
                </label>
              );
            })}
          </div>
        )}
        {errorText("slotId")}
      </fieldset>

      <div>
        <label htmlFor="note" className="font-semibold">
          {f.labels.note}
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={500}
          value={values.note}
          onChange={(e) => update("note", e.target.value)}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={describedBy("note")}
          className={inputClass}
        />
        {errorText("note")}
      </div>

      <div>
        <Turnstile
          key={turnstileKey}
          language={locale}
          missingKeyText={f.turnstileMissing}
          onToken={(t) => {
            setToken(t);
            if (t) setErrors((e) => ({ ...e, turnstileToken: undefined }));
          }}
        />
        {errorText("turnstileToken")}
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        className="inline-flex min-h-11 items-center rounded-full bg-espresso px-8 font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60"
      >
        {submitting ? f.submitting : f.submit}
      </button>
    </form>
  );
}
