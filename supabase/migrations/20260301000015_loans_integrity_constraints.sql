ALTER TABLE loans
  ADD CONSTRAINT loans_end_date_after_start_date
    CHECK (end_date >= start_date),

  ADD CONSTRAINT loans_interest_rate_range
    CHECK (interest_rate >= 0 AND interest_rate <= 1);
