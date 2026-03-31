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
    AS total_dividends_paid;
