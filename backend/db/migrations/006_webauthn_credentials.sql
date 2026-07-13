-- WebAuthn / Windows Hello passkeys

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_type VARCHAR(32) NOT NULL DEFAULT 'singleDevice',
  backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports TEXT[] NOT NULL DEFAULT '{}',
  label VARCHAR(255) NOT NULL DEFAULT 'Windows Hello',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id
  ON webauthn_credentials (user_id);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('register', 'login')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires
  ON webauthn_challenges (expires_at);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.webauthn_credentials FROM anon, authenticated;
REVOKE ALL ON TABLE public.webauthn_challenges FROM anon, authenticated;
