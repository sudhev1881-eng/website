-- StudentLink Phase 4: profile analytics events

CREATE TABLE IF NOT EXISTS profile_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  source VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_events_student_id ON profile_events(student_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_created_at ON profile_events(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_events_type ON profile_events(event_type);
