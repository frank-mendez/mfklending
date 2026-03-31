ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_loan_type_check;

ALTER TABLE loans
  ADD CONSTRAINT loans_loan_type_check
  CHECK (loan_type IN ('flat_interest', 'diminishing', 'hybrid_diminishing'));

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS import_source text;
