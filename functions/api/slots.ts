import { handleSlots } from "../../server/slots";
import type { SupabaseEnv } from "../../server/supabase";

// Cloudflare Pages Function:GET /api/slots?date=YYYY-MM-DD(邏輯與測試在 server/slots.ts)
export const onRequestGet = ({ request, env }: { request: Request; env: SupabaseEnv }) =>
  handleSlots(request, env);
