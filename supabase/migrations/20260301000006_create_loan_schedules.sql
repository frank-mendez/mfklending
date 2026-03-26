CREATE TABLE loan_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  due_date        date NOT NULL,
  period_number   integer NOT NULL CHECK (period_number > 0),
  principal_due   integer NOT NULL CHECK (principal_due >= 0),
  interest_due    integer NOT NULL CHECK (interest_due >= 0),
  total_due       integer NOT NULL CHECK (total_due >= 0),
  balance_after   integer NOT NULL CHECK (balance_after >= 0),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'late')),

  UNIQUE (loan_id, period_number)
);
