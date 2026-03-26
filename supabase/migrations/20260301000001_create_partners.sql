CREATE TABLE partners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  phone       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
