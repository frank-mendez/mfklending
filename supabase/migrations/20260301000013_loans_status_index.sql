-- Common filter: active/overdue loans for the dashboard and fund_summary view.
CREATE INDEX idx_loans_status ON loans (status);
