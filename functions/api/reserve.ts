import { handleReserve, type ReserveEnv } from "../../server/reserve";

// Cloudflare Pages Function:POST /api/reserve(邏輯與測試在 server/reserve.ts)
export const onRequestPost = ({ request, env }: { request: Request; env: ReserveEnv }) =>
  handleReserve(request, env);
