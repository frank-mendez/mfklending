CREATE TABLE loans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id           uuid NOT NULL REFERENCES borrowers(id) ON DELETE RESTRICT,
  loan_type             text NOT NULL CHECK (loan_type IN ('flat_interest', 'diminishing')),
  principal             integer NOT NULL CHECK (principal >= 0),
  interest_rate         numeric(5, 4) NOT NULL DEFAULT 0.0500,
  term_months           integer NOT NULL CHECK (term_months > 0),
  start_date            date NOT NULL,
  end_date              date NOT NULL,
  disbursed_at          timestamptz,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paid', 'defaulted', 'overdue')),
  signwell_document_id  text,
  contract_url          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
