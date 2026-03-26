CREATE TABLE borrowers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL,
  age             integer NOT NULL CHECK (age > 0),
  occupation      text NOT NULL,
  email           text NOT NULL,
  phone           text NOT NULL,
  bank_name       text NOT NULL,
  account_name    text NOT NULL,
  account_number  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
