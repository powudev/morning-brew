"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Turnstile from "@/components/Turnstile";
import { bookingWindow } from "@/lib/dates";
import { fieldErrors, reservationSchema, type FieldErrors } from "@/lib/reservation-schema";

type Slot = { slotId: number; startTime: string; remaining: number };
type SlotsState = { status: "idle" | "loading" | "ready" | "error"; slots: Slot[] };

const initialValues = { name: "", email: "", phone: "", partySize: "2", date: "", slotId: "", note: "" };
type Values = typeof initialValues;

// 前端欄位順序(驗證失敗時聚焦第一個錯誤欄位)
const fieldOrder = ["name", "email", "phone", "partySize", "date", "slotId", "note"] as const;

const GENERIC_ERROR = "系統忙碌中,請稍後再試。";
const serverMessages: Record<string, string> = {
  SLOT_FULL: "這個時段剛剛額滿了,請改選其他時段。",
  SLOT_NOT_AVAILABLE: "這個時段目前無法預約,請改選其他時段。",
  SLOT_IN_PAST: "這個時段已經過了,請改選其他時段。",
  INVALID_DATE: "這個日期無法預約(可預約今天起 30 天內)。",
  TURNSTILE_FAILED: "驗證失敗,請重新完成驗證後再送出。",
};

const inputClass =
  "mt-1 block min-h-11 w-full rounded-lg border border-espresso/30 bg-foam px-3 py-2 aria-[invalid=true]:border-red-700";

function slotLabel(slot: Slot, partySize: number): string {
  if (slot.remaining === 0) return `${slot.startTime}(已額滿)`;
  if (slot.remaining < partySize) return `${slot.startTime}(名額不足,剩 ${slot.remaining} 位)`;
  return `${slot.startTime}(剩 ${slot.remaining} 位)`;
}

export default function ReservationForm() {
  const router = useRouter();
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
      // 換日期要重選時段;換人數後原本的時段若名額不足就取消選取
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
        router.push("/reserve/done/");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: FieldErrors };
      if (res.status === 400 && data.fields && Object.keys(data.fields).length > 0) {
        // 伺服器端欄位驗證在 Turnstile 之前,token 未被使用,不需重設
        setErrors(data.fields);
        focusFirstError(data.fields);
        return;
      }
      setFormError((data.error && serverMessages[data.error]) || GENERIC_ERROR);
      // 其餘情況 token 已送去驗證(只能用一次),需重新完成 Turnstile
      resetTurnstile();
      if (res.status === 409 || res.status === 422) {
        setValues((v) => ({ ...v, slotId: "" }));
        void loadSlots(values.date);
      }
    } catch {
      setFormError(GENERIC_ERROR);
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  const describedBy = (field: keyof FieldErrors) => (errors[field] ? `${field}-error` : undefined);
  const errorText = (field: keyof FieldErrors) =>
    errors[field] ? (
      <p id={`${field}-error`} className="mt-1 text-sm font-semibold text-red-800">
        {errors[field]}
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
            姓名
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
            Email
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
            電話(選填)
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
            人數
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
                {n} 位
              </option>
            ))}
          </select>
          {errorText("partySize")}
        </div>
        <div>
          <label htmlFor="date" className="font-semibold">
            日期
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
        <legend className="font-semibold">時段</legend>
        {slotsState.status === "idle" && <p className="mt-2 text-ink/80">請先選擇日期</p>}
        {slotsState.status === "loading" && <p className="mt-2 text-ink/80">載入時段中…</p>}
        {slotsState.status === "error" && <p className="mt-2">無法載入時段,請稍後再試。</p>}
        {slotsState.status === "ready" && slotsState.slots.length === 0 && (
          <p className="mt-2">這天沒有可預約的時段,請改選其他日期。</p>
        )}
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
                  {slotLabel(slot, partySize)}
                </label>
              );
            })}
          </div>
        )}
        {errorText("slotId")}
      </fieldset>

      <div>
        <label htmlFor="note" className="font-semibold">
          備註(選填)
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
        <Turnstile key={turnstileKey} onToken={(t) => {
          setToken(t);
          if (t) setErrors((e) => ({ ...e, turnstileToken: undefined }));
        }} />
        {errorText("turnstileToken")}
      </div>

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting || undefined}
        className="inline-flex min-h-11 items-center rounded-full bg-espresso px-8 font-semibold text-cream hover:bg-espresso/90 disabled:opacity-60"
      >
        {submitting ? "送出中…" : "送出訂位"}
      </button>
    </form>
  );
}
