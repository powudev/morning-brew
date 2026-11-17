-- Marks that the "reservation confirmed" email went out, so it is sent at most once.
-- Only the server (service_role) writes it: authenticated keeps its column-level update grant on status only.
alter table public.reservations add column confirmed_email_sent_at timestamptz;
