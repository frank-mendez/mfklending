CREATE TYPE import_type AS ENUM ('stash', 'lending', 'diminishing', 'summary');
CREATE TYPE import_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type import_type NOT NULL,
  status import_status NOT NULL DEFAULT 'pending',
  filename text NOT NULL,
  rows_parsed integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  errors jsonb,
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage import_logs"
  ON import_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
