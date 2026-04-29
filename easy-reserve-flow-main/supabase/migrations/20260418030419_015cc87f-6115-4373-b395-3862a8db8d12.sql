-- Stop pre-assigning a single worker. Let all matching workers see the job
-- and the first to Accept claims it (already supported by RLS + worker.tsx).
DROP TRIGGER IF EXISTS trg_auto_assign_worker ON public.bookings;