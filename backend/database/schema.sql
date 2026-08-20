-- Wi-Fi CSI sensing prototype schema (SQLite).
-- Stores labels, extracted feature vectors, predictions, and calibration runs.

CREATE TABLE IF NOT EXISTS csi_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT,
  raw_json TEXT NOT NULL,
  features_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_csi_samples_room_created
  ON csi_samples(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_csi_samples_label
  ON csi_samples(label);

CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence REAL NOT NULL,
  motion INTEGER NOT NULL,
  signal_quality TEXT NOT NULL,
  features_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_predictions_room_created
  ON predictions(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS training_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS calibration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL,
  metrics_json TEXT,
  created_at TEXT NOT NULL
);
