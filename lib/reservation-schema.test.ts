import { describe, expect, it, vi } from "vitest";
import { errorCodes, fieldErrors, reservationSchema } from "@/lib/reservation-schema";

const valid = {
  name: " 王小明 ",
  email: "demo@example.com",
  phone: "",
  partySize: "2",
  date: "2026-11-10",
  slotId: "3",
  note: "",
  turnstileToken: "token",
};

describe("reservationSchema", () => {
  it("accepts valid input, coerces types and trims whitespace", () => {
    const result = reservationSchema.parse(valid);
    expect(result).toEqual({
      name: "王小明",
      email: "demo@example.com",
      phone: "",
      partySize: 2,
      date: "2026-11-10",
      slotId: 3,
      note: "",
      turnstileToken: "token",
    });
  });

  it("phone and note are optional", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.phone;
    delete rest.note;
    expect(reservationSchema.parse(rest)).toMatchObject({ phone: "", note: "" });
  });

  const cases: [string, Partial<Record<keyof typeof valid, unknown>>, string][] = [
    ["blank name", { name: "   " }, "name"],
    ["name over 100 characters", { name: "a".repeat(101) }, "name"],
    ["invalid email", { email: "not-an-email" }, "email"],
    ["phone with letters", { phone: "abc" }, "phone"],
    ["party size 0", { partySize: "0" }, "partySize"],
    ["party size 9", { partySize: "9" }, "partySize"],
    ["non-integer party size", { partySize: "2.5" }, "partySize"],
    ["malformed date", { date: "2026/11/10" }, "date"],
    ["nonexistent date", { date: "2026-02-30" }, "date"],
    ["no slot selected", { slotId: "" }, "slotId"],
    ["note over 500 characters", { note: "a".repeat(501) }, "note"],
    ["Turnstile not completed", { turnstileToken: "" }, "turnstileToken"],
  ];

  for (const [label, override, field] of cases) {
    it(`rejects ${label}`, () => {
      const result = reservationSchema.safeParse({ ...valid, ...override });
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(fieldErrors(result.error))).toContain(field);
    });
  }

  it("rejects unknown extra fields (so status cannot be smuggled in)", () => {
    const result = reservationSchema.safeParse({ ...valid, status: "confirmed" });
    expect(result.success).toBe(false);
  });
  it("blank email returns email_required, not a format error", () => {
    const result = reservationSchema.safeParse({ ...valid, email: "  " });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).email).toBe("email_required");
  });
});

describe("fieldErrors", () => {
  it("returns the first error code per field (translated by the frontend)", () => {
    const result = reservationSchema.safeParse({ ...valid, name: "", email: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBe("name_required");
      expect(errors.email).toBe("email_invalid");
    }
  });

  it("all returned codes are listed in errorCodes", () => {
    const result = reservationSchema.safeParse({
      name: "",
      email: "",
      phone: "abc",
      partySize: "9",
      date: "x",
      slotId: "",
      note: "a".repeat(501),
      turnstileToken: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      for (const code of Object.values(fieldErrors(result.error))) expect(errorCodes).toContain(code);
    }
  });
});

describe("zod config", () => {
  it("jitless: validation never uses eval / new Function (CSP and Workers forbid it)", async () => {
    const { globalConfig } = await import("zod/v4/core");
    expect(globalConfig.jitless).toBe(true);
    const original = globalThis.Function;
    const spy = vi.fn();
    globalThis.Function = new Proxy(original, { construct: (...args) => (spy(), Reflect.construct(...args)) });
    try {
      expect(reservationSchema.safeParse(valid).success).toBe(true);
    } finally {
      globalThis.Function = original;
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
