-- ============================================================
-- Inactivity Reminder Tracking
--
-- Backs /api/send-inactivity-reminders — a lighter-touch companion
-- to the weekly digest that nudges a student a few days after they
-- go quiet, instead of waiting for the weekly cron.
--
-- last_inactivity_reminder_sent_at lets that route send at most ONE
-- reminder per inactivity streak: it only sends again once the
-- student has written (which advances user_stats.last_activity past
-- this timestamp) and then gone quiet again. Without it the cron
-- would re-send the same nudge every single day a student stays
-- inactive.
--
-- No new opt-in column: this reuses `email_notifications`, whose
-- description on the Profile page ("Get weekly progress summaries
-- and writing reminders") already promised reminders beyond just
-- the weekly digest.
-- ============================================================

alter table public.profiles
  add column last_inactivity_reminder_sent_at timestamptz;
