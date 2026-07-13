-- Lock down public tables for Supabase PostgREST.
-- StudentLink accesses Postgres via the Express API (pooler connection),
-- which uses a privileged role that bypasses RLS when FORCE is not set.
-- Enabling RLS with no anon/authenticated policies blocks direct REST
-- access with the public anon key (fixes Supabase security linter).

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;

-- Defense in depth: revoke direct table access from browser-facing API roles.
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.students FROM anon, authenticated;
REVOKE ALL ON TABLE public.projects FROM anon, authenticated;
REVOKE ALL ON TABLE public.skills FROM anon, authenticated;
REVOKE ALL ON TABLE public.certificates FROM anon, authenticated;
REVOKE ALL ON TABLE public.experience FROM anon, authenticated;
REVOKE ALL ON TABLE public.resumes FROM anon, authenticated;
REVOKE ALL ON TABLE public.nfc_cards FROM anon, authenticated;
REVOKE ALL ON TABLE public.universities FROM anon, authenticated;
REVOKE ALL ON TABLE public.profile_events FROM anon, authenticated;
