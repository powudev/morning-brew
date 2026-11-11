import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

// No eval-based JIT: the site's CSP forbids unsafe-eval (and so do Cloudflare Workers).
z.config({ jitless: true });

export const errorCodes = [
  "name_required",
  "name_too_long",
  "email_required",
  "email_invalid",
  "email_too_long",
  "phone_invalid",
  "phone_too_long",
  "party_size_invalid",
  "date_required",
  "slot_required",
  "note_too_long",
  "turnstile_required",
  "invalid_form",
] as const;
export type ErrorCode = (typeof errorCodes)[number];

const code = (c: ErrorCode) => c;

export const reservationSchema = z.strictObject(
  {
    name: z
      .string({ error: code("name_required") })
      .trim()
      .min(1, code("name_required"))
      .max(100, code("name_too_long")),
    email: z
      .string({ error: code("email_required") })
      .trim()
      .min(1, code("email_required"))
      .max(254, code("email_too_long"))
      .pipe(z.email({ error: code("email_invalid") })),
    phone: z
      .string({ error: code("phone_invalid") })
      .trim()
      .max(30, code("phone_too_long"))
      .regex(/^[0-9+\-() ]*$/, code("phone_invalid"))
      .default(""),
    partySize: z.coerce
      .number({ error: code("party_size_invalid") })
      .int(code("party_size_invalid"))
      .min(1, code("party_size_invalid"))
      .max(8, code("party_size_invalid")),
    date: z.string({ error: code("date_required") }).refine(isIsoDate, code("date_required")),
    slotId: z.coerce
      .number({ error: code("slot_required") })
      .int(code("slot_required"))
      .positive(code("slot_required")),
    note: z.string({ error: code("note_too_long") }).trim().max(500, code("note_too_long")).default(""),
    turnstileToken: z
      .string({ error: code("turnstile_required") })
      .min(1, code("turnstile_required"))
      .max(2048, code("turnstile_required")),
  },
  { error: code("invalid_form") },
);

export type ReservationInput = z.infer<typeof reservationSchema>;
export type FieldErrors = Partial<Record<keyof ReservationInput | "_form", ErrorCode>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] ?? "_form") as keyof FieldErrors;
    const message = (errorCodes as readonly string[]).includes(issue.message) ? issue.message : "invalid_form";
    errors[key] ??= message as ErrorCode;
  }
  return errors;
}
