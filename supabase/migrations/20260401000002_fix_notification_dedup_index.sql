-- Fix dedup index to use sent_at (not created_at) so the calendar-day
-- boundary is computed from when the notification was actually delivered,
-- preventing edge-case double-sends around Manila midnight.
DROP INDEX IF EXISTS idx_notification_dedup;

CREATE UNIQUE INDEX idx_notification_dedup
  ON notification_logs(loan_id, schedule_id, notification_type, channel,
    (DATE(sent_at AT TIME ZONE 'Asia/Manila')))
  WHERE status = 'sent';

-- Add CHECK constraint to prevent arbitrary status values
ALTER TABLE notification_logs
  ADD CONSTRAINT notification_logs_status_check
    CHECK (status IN ('pending', 'sent', 'failed'));
