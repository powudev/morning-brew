import { handleNotifyConfirmed, type NotifyEnv } from "../../../server/notify-confirmed";

export const onRequestPost = ({ request, env }: { request: Request; env: NotifyEnv }) =>
  handleNotifyConfirmed(request, env);
