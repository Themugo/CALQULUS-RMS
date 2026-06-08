-- ============================================================
-- RentFlow: Scheduled jobs via pg_cron
-- ============================================================
-- Enable pg_cron extension (pre-enabled on Supabase Pro)
-- If not available, these can be set up as Supabase Edge Function
-- scheduled invocations in the dashboard instead.

-- NOTE: pg_cron is available on Supabase Pro plans.
-- On Free/Starter plans, use Supabase Dashboard → Edge Functions → Schedule
-- to set up equivalent cron triggers for each function below.

-- ── 1. Apply late payment penalties — daily at 09:00 EAT (06:00 UTC) ──
-- Marks overdue invoices and applies configured penalty amounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('rentflow-apply-penalties');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not unschedule rentflow-apply-penalties (job may not exist)';
    END;
    PERFORM cron.schedule(
      'rentflow-apply-penalties',
      '0 6 * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/apply-penalties',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-apply-penalties';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule apply-penalties via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 2. Send overdue invoice notifications — daily at 09:30 EAT (06:30 UTC) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('rentflow-overdue-notifications');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not unschedule rentflow-overdue-notifications (job may not exist)';
    END;
    PERFORM cron.schedule(
      'rentflow-overdue-notifications',
      '30 6 * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/send-overdue-notifications',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-overdue-notifications';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule overdue-notifications via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 3. Auto-generate monthly invoices — 1st of each month at 02:00 EAT ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('rentflow-auto-generate-invoices');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not unschedule rentflow-auto-generate-invoices (job may not exist)';
    END;
    PERFORM cron.schedule(
      'rentflow-auto-generate-invoices',
      '0 0 1 * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/auto-generate-invoices',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-auto-generate-invoices';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule auto-generate-invoices via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 4. Send payment reminders — daily at 08:00 EAT (05:00 UTC) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('rentflow-payment-reminders');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not unschedule rentflow-payment-reminders (job may not exist)';
    END;
    PERFORM cron.schedule(
      'rentflow-payment-reminders',
      '0 5 * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/send-payment-reminders',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-payment-reminders';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule payment-reminders via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 2. Send overdue invoice notifications — daily at 09:30 EAT (06:30 UTC) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rentflow-overdue-notifications');
    PERFORM cron.schedule(
      'rentflow-overdue-notifications',
      '30 6 * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/send-overdue-notifications',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-overdue-notifications';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule overdue-notifications via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 3. Auto-generate monthly invoices — 25th of each month at 07:00 EAT ──
-- Generates next month's invoices so they're ready before month end
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rentflow-auto-generate-invoices');
    PERFORM cron.schedule(
      'rentflow-auto-generate-invoices',
      '0 4 25 * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/auto-generate-invoices',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-auto-generate-invoices';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule auto-generate-invoices via Supabase Dashboard';
  END IF;
END;
$$;

-- ── 4. Send payment reminders — 3 days before due date, daily check ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rentflow-payment-reminders');
    PERFORM cron.schedule(
      'rentflow-payment-reminders',
      '0 7 * * *',
      $cron$
        SELECT net.http_post(
          url    := current_setting('app.supabase_url') || '/functions/v1/send-payment-reminders',
          headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
          body   := '{}'::jsonb
        );
      $cron$
    );
    RAISE NOTICE 'Scheduled rentflow-payment-reminders';
  ELSE
    RAISE NOTICE 'pg_cron not available — schedule payment-reminders via Supabase Dashboard';
  END IF;
END;
$$;

-- ── Alternative: Supabase Dashboard setup instructions ──────────────
-- For plans without pg_cron, set up these schedules in the Supabase Dashboard
-- under Edge Functions → each function → Schedule tab:
--
-- apply-penalties          → Daily,  06:00 UTC
-- send-overdue-notifications → Daily, 06:30 UTC
-- auto-generate-invoices   → Monthly, 25th, 04:00 UTC
-- send-payment-reminders   → Daily,  07:00 UTC
-- send-monthly-report      → Monthly, 1st,  05:00 UTC
