import { handleReserve, type ReserveEnv } from "../../server/reserve";

export const onRequestPost = ({ request, env }: { request: Request; env: ReserveEnv }) =>
  handleReserve(request, env);
