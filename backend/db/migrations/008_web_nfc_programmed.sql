-- Web NFC programming metadata on nfc_cards
-- Status stays on existing enum (active = programmed / in use).
-- programmed_at / programmed_by record who wrote the tag via Web NFC (or cloud assign).

ALTER TABLE nfc_cards
  ADD COLUMN IF NOT EXISTS programmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS programmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programmed_url TEXT,
  ADD COLUMN IF NOT EXISTS program_source VARCHAR(32);

COMMENT ON COLUMN nfc_cards.programmed_at IS 'When the NFC tag was last programmed (Web NFC or admin assign)';
COMMENT ON COLUMN nfc_cards.programmed_by IS 'Admin user id who programmed the card';
COMMENT ON COLUMN nfc_cards.programmed_url IS 'URL written to / registered for the card';
COMMENT ON COLUMN nfc_cards.program_source IS 'web_nfc | cloud | server';

CREATE INDEX IF NOT EXISTS idx_nfc_cards_programmed_by ON nfc_cards(programmed_by);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_programmed_at ON nfc_cards(programmed_at DESC);
