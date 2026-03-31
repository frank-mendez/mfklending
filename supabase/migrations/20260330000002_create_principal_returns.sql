CREATE TABLE principal_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  returned_at date NOT NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_principal_returns_loan_id ON principal_returns(loan_id);

ALTER TABLE principal_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage principal_returns"
  ON principal_returns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
