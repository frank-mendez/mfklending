CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_type AS ENUM (
  'reminder_3day',
  'reminder_1day',
  'reminder_due',
  'overdue_1day',
  'overdue_7day',
  'overdue_weekly'
);

CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES loan_schedules(id) ON DELETE SET NULL,
  borrower_id uuid NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  notification_type notification_type NOT NULL,
  recipient text NOT NULL,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_logs_loan_id ON notification_logs(loan_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);

CREATE UNIQUE INDEX idx_notification_dedup
  ON notification_logs(loan_id, schedule_id, notification_type, channel,
    (DATE(created_at AT TIME ZONE 'Asia/Manila')))
  WHERE status = 'sent';

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification_logs"
  ON notification_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage notification_logs"
  ON notification_logs FOR ALL TO service_role USING (true);
