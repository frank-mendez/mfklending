-- Date-range queries (statement views, reconciliation) and reference_no lookups
-- both degrade to sequential scans without these as import volume grows.
CREATE INDEX idx_bank_transactions_transaction_date ON bank_transactions (transaction_date);
CREATE INDEX idx_bank_transactions_reference_no     ON bank_transactions (reference_no);
