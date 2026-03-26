CREATE TABLE dividends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  amount          integer NOT NULL CHECK (amount >= 0),
  distributed_at  timestamptz NOT NULL DEFAULT now(),
  remarks         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
