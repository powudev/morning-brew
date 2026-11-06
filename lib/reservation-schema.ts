import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

// 前端表單與 Pages Function 共用同一份驗證規則;資料庫的 check constraint 是最後一道防線
export const reservationSchema = z.strictObject({
  name: z
    .string({ error: "請輸入姓名" })
    .trim()
    .min(1, "請輸入姓名")
    .max(100, "姓名最多 100 字"),
  email: z
    .string({ error: "請輸入 Email" })
    .trim()
    .min(1, "請輸入 Email")
    .max(254, "Email 太長")
    .pipe(z.email({ error: "Email 格式不正確" })),
  phone: z
    .string()
    .trim()
    .max(30, "電話最多 30 字")
    .regex(/^[0-9+\-() ]*$/, "電話格式不正確")
    .default(""),
  partySize: z.coerce
    .number({ error: "請選擇人數" })
    .int("人數需介於 1–8 人")
    .min(1, "人數需介於 1–8 人")
    .max(8, "人數需介於 1–8 人"),
  date: z.string({ error: "請選擇日期" }).refine(isIsoDate, "請選擇日期"),
  slotId: z.coerce.number({ error: "請選擇時段" }).int("請選擇時段").positive("請選擇時段"),
  note: z.string().trim().max(500, "備註最多 500 字").default(""),
  turnstileToken: z.string({ error: "請完成驗證" }).min(1, "請完成驗證").max(2048, "請完成驗證"),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
export type FieldErrors = Partial<Record<keyof ReservationInput | "_form", string>>;

/** 每個欄位取第一則錯誤;不屬於任何欄位的錯誤(例如多餘欄位)放在 _form */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = (issue.path[0] ?? "_form") as keyof FieldErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}
