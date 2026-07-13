-- Drop WebAuthn / Windows Hello tables if they were created earlier.
DROP TABLE IF EXISTS public.webauthn_challenges;
DROP TABLE IF EXISTS public.webauthn_credentials;
