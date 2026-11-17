import { handleReserve, type ReserveEnv } from "../../server/reserve";

export const onRequestPost = ({
  request,
  env,
  waitUntil,
}: {
  request: Request;
  env: ReserveEnv;
  waitUntil: (work: Promise<unknown>) => void;
}) => handleReserve(request, env, fetch, waitUntil);
