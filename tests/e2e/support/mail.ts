export const MAIL_PORT = 8795;
export const MAIL_API_KEY = "re_e2e";

export type CapturedEmail = { to: string[]; subject: string; text: string; html: string; idempotencyKey?: string };

/** Emails the local Resend stand-in received for one address. */
export async function mailTo(address: string): Promise<CapturedEmail[]> {
  const res = await fetch(`http://localhost:${MAIL_PORT}/emails?to=${encodeURIComponent(address)}`);
  return (await res.json()) as CapturedEmail[];
}
