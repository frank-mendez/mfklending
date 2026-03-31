-- Recreate fund_summary view with current_balance column
DROP VIEW IF EXISTS fund_summary;

CREATE VIEW fund_summary AS
SELECT
  (SELECT COALESCE(SUM(amount), 0) FROM contributions)
    AS total_stash,

  (SELECT COALESCE(SUM(l.principal), 0)
   FROM loans l
   WHERE l.status IN ('active', 'overdue'))
    AS total_principal_loaned,

  (SELECT COALESCE(SUM(l.principal) - COALESCE(SUM(pr.amount), 0), 0)
   FROM loans l
   LEFT JOIN principal_returns pr ON pr.loan_id = l.id
   WHERE l.status IN ('active', 'overdue'))
    AS total_outstanding_balance,

  (SELECT COALESCE(SUM(amount_paid), 0)
   FROM payments WHERE payment_type = 'interest')
    AS total_collected_interest,

  (SELECT COALESCE(SUM(penalty_amount), 0) FROM payments)
    AS total_penalties,

  (SELECT COALESCE(SUM(amount), 0) FROM dividends)
    AS total_dividends_paid,

  -- current_balance = stash + interest collected + penalties − dividends paid − outstanding loans
  (
    COALESCE((SELECT SUM(amount) FROM contributions), 0)
    + COALESCE((SELECT SUM(amount_paid) FROM payments WHERE payment_type = 'interest'), 0)
    + COALESCE((SELECT SUM(penalty_amount) FROM payments), 0)
    - COALESCE((SELECT SUM(amount) FROM dividends), 0)
    - COALESCE((
        SELECT SUM(l.principal) - COALESCE(SUM(pr.amount), 0)
        FROM loans l
        LEFT JOIN principal_returns pr ON pr.loan_id = l.id
        WHERE l.status IN ('active', 'overdue')
      ), 0)
  ) AS current_balance;
