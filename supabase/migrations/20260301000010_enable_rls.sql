-- Enable Row Level Security on all tables

ALTER TABLE partners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends          ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions  ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users have full access to all tables

CREATE POLICY "authenticated_all" ON partners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON contributions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON dividends
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON borrowers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON loans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON loan_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON bank_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
