CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_id     uuid REFERENCES loan_schedules(id) ON DELETE SET NULL,
  amount_paid     integer NOT NULL CHECK (amount_paid >= 0),
  paid_at         timestamptz NOT NULL DEFAULT now(),
  payment_type    text NOT NULL CHECK (payment_type IN ('interest', 'principal', 'penalty', 'full')),
  late_days       integer NOT NULL DEFAULT 0 CHECK (late_days >= 0),
  penalty_amount  integer NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  remarks         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
