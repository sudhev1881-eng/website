-- Cloud-native Supabase Auth linkage

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supabase_auth_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_id ON users (supabase_auth_id);

COMMENT ON COLUMN users.supabase_auth_id IS 'Links app user to auth.users.id in Supabase Auth';
