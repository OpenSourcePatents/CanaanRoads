-- ============================================================
-- Canaan Road Watch — Notification System + New Roles
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. NOTIFICATION CONTACTS ─────────────────────────────────────────────
-- Multiple emails/phones per user
create table if not exists public.notification_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('email', 'sms')),
  value text not null,           -- email address or phone number
  carrier text,                  -- for SMS: verizon, tmobile, att, sprint, uscellular, boost
  label text,                    -- optional: 'personal email', 'work phone', etc.
  verified boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  unique(user_id, value)
);

-- SMS carrier gateway mapping (reference)
-- verizon     → {number}@vtext.com
-- tmobile     → {number}@tmomail.net
-- att         → {number}@txt.att.net
-- sprint      → {number}@messaging.sprintpcs.com
-- uscellular  → {number}@email.uscc.net
-- boost       → {number}@sms.myboostmobile.com
-- cricket     → {number}@mms.cricketwireless.net
-- metro       → {number}@mymetropcs.com

-- ─── 2. NOTIFICATION PREFERENCES ─────────────────────────────────────────
-- Per-user toggles for each event type
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  event_type text not null,
  -- Event types:
  -- 'new_severe_report'     — new report with severity = severe
  -- 'road_closed'           — road closure filed
  -- 'road_reopened'         — road reopened
  -- 'safety_alert_public'   — public safety alert
  -- 'safety_alert_officials'— officials-only alert (officials only)
  -- 'safety_alert_police'   — police-only alert (police/admin only)
  -- 'construction_new'      — new construction notice
  -- 'construction_active'   — construction goes active
  -- 'report_resolved'       — report marked resolved
  -- 'broadcast'             — manual broadcast from official
  enabled boolean default true,
  channels jsonb default '{"email": true, "sms": false}'::jsonb,
  created_at timestamptz default now(),
  unique(user_id, event_type)
);

-- ─── 3. BROADCAST MESSAGES ────────────────────────────────────────────────
-- Manual broadcasts sent by officials
create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references auth.users on delete set null,
  sent_by_role text,             -- role of sender at time of send
  title text not null,
  message text not null,
  alert_type text default 'general',
  -- Types: general, road_closed, hazard, drunk_driver, pursuit,
  --        weather, evacuation, amber_alert, other
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  visibility text default 'public' check (visibility in ('public', 'officials', 'police')),
  target_audience text default 'all',
  -- Values: all, officials, police, residents
  expires_at timestamptz,        -- optional auto-expiry
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

-- ─── 4. NOTIFICATION LOG ──────────────────────────────────────────────────
-- Track what was sent to avoid duplicates
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  event_type text not null,
  event_id text,                 -- id of the triggering record
  channel text not null,         -- 'email' or 'sms'
  destination text not null,     -- email or phone
  status text default 'sent' check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz default now()
);

-- ─── 5. RLS POLICIES ──────────────────────────────────────────────────────

alter table public.notification_contacts enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.broadcast_messages enable row level security;
alter table public.notification_log enable row level security;

-- Notification contacts — users manage their own
create policy "Users manage own contacts" on public.notification_contacts
  for all using (auth.uid() = user_id);

-- Notification preferences — users manage their own
create policy "Users manage own preferences" on public.notification_preferences
  for all using (auth.uid() = user_id);

-- Broadcast messages — public ones visible to all
create policy "Public broadcasts visible to all" on public.broadcast_messages
  for select using (visibility = 'public' or resolved = false);

-- Officials can see officials+ broadcasts
create policy "Officials see officials broadcasts" on public.broadcast_messages
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'police_chief', 'police', 'road_agent_manager', 'road_agent', 'road_worker', 'town_administrator')
    )
  );

-- Officials can insert broadcasts
create policy "Officials can send broadcasts" on public.broadcast_messages
  for insert with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'police_chief', 'police', 'road_agent_manager', 'road_agent', 'road_worker')
    )
  );

-- Officials can resolve broadcasts
create policy "Officials can resolve broadcasts" on public.broadcast_messages
  for update using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'police_chief', 'police', 'road_agent_manager', 'road_agent', 'road_worker')
    )
  );

-- Notification log — users see their own
create policy "Users see own notification log" on public.notification_log
  for select using (auth.uid() = user_id);

-- ─── 6. UPDATE USER_ROLES CHECK CONSTRAINT ────────────────────────────────
-- Add new role values to user_roles if there's an existing constraint
-- (Run this only if you get a constraint violation on insert)
-- alter table public.user_roles drop constraint if exists user_roles_role_check;
-- alter table public.user_roles add constraint user_roles_role_check
--   check (role in ('user', 'road_agent', 'road_worker', 'road_agent_manager',
--                   'police', 'police_chief', 'town_administrator', 'admin'));

-- ─── 7. DEFAULT NOTIFICATION PREFERENCES FUNCTION ─────────────────────────
-- Auto-create default preferences when a user signs up
create or replace function public.handle_new_user_notifications()
returns trigger as $$
begin
  -- Create default notification preferences for all event types
  insert into public.notification_preferences (user_id, event_type, enabled, channels)
  values
    (new.id, 'new_severe_report',      true,  '{"email": true, "sms": false}'),
    (new.id, 'road_closed',            true,  '{"email": true, "sms": true}'),
    (new.id, 'road_reopened',          false, '{"email": true, "sms": false}'),
    (new.id, 'safety_alert_public',    true,  '{"email": true, "sms": true}'),
    (new.id, 'construction_new',       false, '{"email": true, "sms": false}'),
    (new.id, 'construction_active',    false, '{"email": true, "sms": false}'),
    (new.id, 'report_resolved',        false, '{"email": true, "sms": false}'),
    (new.id, 'broadcast',              true,  '{"email": true, "sms": true}')
  on conflict (user_id, event_type) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Attach to existing trigger or create new one
drop trigger if exists on_auth_user_created_notifications on auth.users;
create trigger on_auth_user_created_notifications
  after insert on auth.users
  for each row execute procedure public.handle_new_user_notifications();

-- ─── 8. CARRIER GATEWAY FUNCTION ──────────────────────────────────────────
-- Helper to build SMS gateway email address from phone + carrier
create or replace function public.sms_gateway_email(phone text, carrier text)
returns text as $$
declare
  cleaned text;
begin
  -- Strip everything except digits
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  -- Take last 10 digits
  cleaned := right(cleaned, 10);

  return case carrier
    when 'verizon'    then cleaned || '@vtext.com'
    when 'tmobile'    then cleaned || '@tmomail.net'
    when 'att'        then cleaned || '@txt.att.net'
    when 'sprint'     then cleaned || '@messaging.sprintpcs.com'
    when 'uscellular' then cleaned || '@email.uscc.net'
    when 'boost'      then cleaned || '@sms.myboostmobile.com'
    when 'cricket'    then cleaned || '@mms.cricketwireless.net'
    when 'metro'      then cleaned || '@mymetropcs.com'
    else null
  end;
end;
$$ language plpgsql immutable;

-- ============================================================
-- DONE. New role values to use in user_roles table:
--   police_chief        — sees all police officer alerts
--   road_agent_manager  — sees all agent reports/closures
--   town_administrator  — read-heavy, can annotate, no operational control
--
-- Existing roles unchanged:
--   admin, police, road_agent, road_worker, user
-- ============================================================
