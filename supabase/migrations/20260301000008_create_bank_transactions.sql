CREATE TABLE bank_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date  date NOT NULL,
  description       text NOT NULL,
  amount            integer NOT NULL CHECK (amount >= 0),
  type              text NOT NULL CHECK (type IN ('credit', 'debit')),
  balance           integer NOT NULL CHECK (balance >= 0),
  source            text NOT NULL CHECK (source IN ('gotyme_import', 'manual')),
  reference_no      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
