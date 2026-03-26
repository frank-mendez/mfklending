-- Indexes on foreign key columns.
-- Postgres does not auto-create these; without them every FK constraint check
-- and JOIN on these columns degrades to a sequential scan as data grows.

CREATE INDEX idx_contributions_partner_id  ON contributions  (partner_id);
CREATE INDEX idx_dividends_partner_id      ON dividends      (partner_id);
CREATE INDEX idx_loans_borrower_id         ON loans          (borrower_id);
CREATE INDEX idx_loan_schedules_loan_id    ON loan_schedules (loan_id);
CREATE INDEX idx_payments_loan_id          ON payments       (loan_id);
CREATE INDEX idx_payments_schedule_id      ON payments       (schedule_id);
