import { handleSlots } from "../../server/slots";
import type { SupabaseEnv } from "../../server/supabase";

export const onRequestGet = ({ request, env }: { request: Request; env: SupabaseEnv }) =>
  handleSlots(request, env);
