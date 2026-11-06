import { describe, expect, it } from "vitest";
import { fieldErrors, reservationSchema } from "@/lib/reservation-schema";

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
  it("接受合法輸入,並把字串轉成需要的型別、去除前後空白", () => {
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

  it("電話與備註可省略", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.phone;
    delete rest.note;
    expect(reservationSchema.parse(rest)).toMatchObject({ phone: "", note: "" });
  });

  const cases: [string, Partial<Record<keyof typeof valid, unknown>>, string][] = [
    ["空白姓名", { name: "   " }, "name"],
    ["姓名超過 100 字", { name: "a".repeat(101) }, "name"],
    ["email 格式錯誤", { email: "not-an-email" }, "email"],
    ["電話含英文字母", { phone: "abc" }, "phone"],
    ["人數 0", { partySize: "0" }, "partySize"],
    ["人數 9", { partySize: "9" }, "partySize"],
    ["人數非整數", { partySize: "2.5" }, "partySize"],
    ["日期格式錯誤", { date: "2026/11/10" }, "date"],
    ["不存在的日期", { date: "2026-02-30" }, "date"],
    ["未選時段", { slotId: "" }, "slotId"],
    ["備註超過 500 字", { note: "a".repeat(501) }, "note"],
    ["未完成 Turnstile", { turnstileToken: "" }, "turnstileToken"],
  ];

  for (const [label, override, field] of cases) {
    it(`拒絕:${label}`, () => {
      const result = reservationSchema.safeParse({ ...valid, ...override });
      expect(result.success).toBe(false);
      if (!result.success) expect(Object.keys(fieldErrors(result.error))).toContain(field);
    });
  }

  it("拒絕未定義的多餘欄位(避免把 status 等欄位偷渡進來)", () => {
    const result = reservationSchema.safeParse({ ...valid, status: "confirmed" });
    expect(result.success).toBe(false);
  });
  it("空白 email 顯示「請輸入 Email」,而不是格式錯誤", () => {
    const result = reservationSchema.safeParse({ ...valid, email: "  " });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).email).toBe("請輸入 Email");
  });
});

describe("fieldErrors", () => {
  it("每個欄位回傳第一則中文錯誤訊息", () => {
    const result = reservationSchema.safeParse({ ...valid, name: "", email: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBe("請輸入姓名");
      expect(errors.email).toBe("Email 格式不正確");
    }
  });
});
