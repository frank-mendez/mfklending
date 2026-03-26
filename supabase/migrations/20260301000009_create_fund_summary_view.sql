CREATE VIEW fund_summary AS
SELECT
  COALESCE((SELECT SUM(amount) FROM contributions), 0)                          AS total_stash,
  COALESCE(
    (SELECT SUM(principal) FROM loans WHERE status IN ('active', 'overdue')), 0
  )                                                                              AS total_loaned_out,
  COALESCE(
    (SELECT SUM(amount_paid) FROM payments WHERE payment_type = 'interest'), 0
  )                                                                              AS total_collected_interest,
  COALESCE((SELECT SUM(penalty_amount) FROM payments), 0)                       AS total_penalties,
  COALESCE((SELECT SUM(amount) FROM dividends), 0)                              AS total_dividends_paid,
  (
    COALESCE((SELECT SUM(amount) FROM contributions), 0)
    + COALESCE(
        (SELECT SUM(amount_paid) FROM payments WHERE payment_type = 'interest'), 0
      )
    + COALESCE((SELECT SUM(penalty_amount) FROM payments), 0)
    - COALESCE(
        (SELECT SUM(principal) FROM loans WHERE status IN ('active', 'overdue')), 0
      )
    - COALESCE((SELECT SUM(amount) FROM dividends), 0)
  )                                                                              AS current_balance;
