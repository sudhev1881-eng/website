-- Telegram Admin Assistant tables

DO $$ BEGIN
  CREATE TYPE telegram_permission_level AS ENUM ('super_admin', 'college_admin', 'read_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS telegram_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_level telegram_permission_level NOT NULL DEFAULT 'read_only',
  college_scope VARCHAR(255),
  display_name VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT telegram_admins_college_scope_check CHECK (
    permission_level <> 'college_admin' OR (college_scope IS NOT NULL AND college_scope <> '')
  )
);

CREATE INDEX IF NOT EXISTS idx_telegram_admins_user_id ON telegram_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_admins_active ON telegram_admins(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS telegram_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  admin_id UUID REFERENCES telegram_admins(id) ON DELETE SET NULL,
  state VARCHAR(64) NOT NULL DEFAULT 'idle',
  pending_action JSONB,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_sessions_user
  ON telegram_sessions(telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_sessions_expires ON telegram_sessions(expires_at);

CREATE TABLE IF NOT EXISTS telegram_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  admin_id UUID REFERENCES telegram_admins(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  parsed_intent VARCHAR(100),
  parsed_args JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_commands_user ON telegram_commands(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_commands_created ON telegram_commands(created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT,
  admin_id UUID REFERENCES telegram_admins(id) ON DELETE SET NULL,
  command VARCHAR(100),
  result VARCHAR(20) NOT NULL DEFAULT 'ok',
  error TEXT,
  ip_address VARCHAR(64),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_logs_created ON telegram_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_logs_user ON telegram_logs(telegram_user_id);

CREATE TABLE IF NOT EXISTS telegram_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  admin_id UUID REFERENCES telegram_admins(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  result VARCHAR(20) NOT NULL DEFAULT 'ok',
  error TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_audit_created ON telegram_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_audit_admin ON telegram_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_telegram_audit_action ON telegram_audit(action);

COMMENT ON TABLE telegram_admins IS 'Authorized Telegram users linked to StudentLink admin accounts';
COMMENT ON TABLE telegram_sessions IS 'Pending confirmations and conversational state for Telegram admins';
COMMENT ON TABLE telegram_commands IS 'Command history for Telegram Admin Assistant';
COMMENT ON TABLE telegram_logs IS 'Operational logs for Telegram bot requests';
COMMENT ON TABLE telegram_audit IS 'Audit trail for mutating Telegram admin actions';

-- Match 005_enable_rls: API uses privileged pooler role; block anon/authenticated REST.
ALTER TABLE public.telegram_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.telegram_admins FROM anon, authenticated;
REVOKE ALL ON TABLE public.telegram_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.telegram_commands FROM anon, authenticated;
REVOKE ALL ON TABLE public.telegram_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.telegram_audit FROM anon, authenticated;
