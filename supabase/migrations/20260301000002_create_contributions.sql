CREATE TABLE contributions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  amount      integer NOT NULL CHECK (amount >= 0),
  month       char(7) NOT NULL,             -- YYYY-MM
  paid_at     timestamptz NOT NULL DEFAULT now(),
  remarks     text,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (partner_id, month)
);
