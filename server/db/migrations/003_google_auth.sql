-- Google OAuth + pre-registered students (claim by legal name)

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';

-- Allow students pre-registered by admin before they claim with Google
ALTER TABLE students ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_name_upper ON students (UPPER(TRIM(name)));
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id) WHERE google_id IS NOT NULL;
