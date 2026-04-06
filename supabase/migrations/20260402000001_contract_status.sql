ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS contract_status text
    NOT NULL DEFAULT 'none'
    CHECK (contract_status IN ('none', 'pending_signature', 'signed', 'declined', 'expired')),
  ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_signed_pdf_path text;

-- signwell_document_id and contract_url already exist from Phase 0 migrations

-- Index for fast webhook lookups by signwell_document_id
CREATE INDEX IF NOT EXISTS idx_loans_signwell_document_id
  ON loans(signwell_document_id)
  WHERE signwell_document_id IS NOT NULL;
