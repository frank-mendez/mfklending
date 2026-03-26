-- Supports "payments for a loan ordered by paid_at" without a post-scan sort.
-- loan_id and schedule_id single-column indexes already exist (migration 20260301000012).
CREATE INDEX idx_payments_loan_id_paid_at ON payments (loan_id, paid_at);
