-- Mensagens — chat aluno ↔ Maria (design handoff 16, messaging core).
--
-- One continuous conversation per account: not per booking, not per lesson.
-- Guardian accounts share the thread, so it hangs off profiles. Booking
-- activity lands inside the thread as kind='event' rows, which keeps the
-- ordering trivial and the thread a single query. Messages are edited, never
-- deleted (5-minute window); deleted_at exists only as a reserved column.

-- ---------------------------------------------------------------------------
-- conversations

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.profiles (id) on delete cascade,
  -- Real-message caches: the truth is the messages table, these exist so the
  -- admin list and the header badge are one cheap query. Events never touch
  -- them — an event moves last_activity_at (sort key) only, so the overdue
  -- flag keeps measuring from the student's actual message.
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender text check (last_message_sender in ('student', 'teacher')),
  last_activity_at timestamptz not null default now(),
  unread_teacher integer not null default 0,
  unread_student integer not null default 0,
  -- Maria's triage flags (pin/archive UI ships in a later pass).
  pinned boolean not null default false,
  archived boolean not null default false,
  -- Email debounce stamps: at most one notification email per side per
  -- conversation per 15 minutes.
  last_email_student_at timestamptz,
  last_email_teacher_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_list_idx
  on public.conversations (pinned desc, last_activity_at desc)
  where last_message_at is not null;

alter table public.conversations enable row level security;

create policy "Owners and admins read conversations"
  on public.conversations for select
  using (account_id = auth.uid() or public.is_admin());

-- Pin/archive are Maria's flags; everything else changes via triggers or
-- security-definer functions. Students never update the row directly, and
-- rows are created server-side (service client) on first use.
create policy "Admins update conversations"
  on public.conversations for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- messages

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Null sender = system event. sender_user_id records which person in a
  -- guardian account actually wrote ("Emma Weber · educanda" derives from it).
  sender_type text check (sender_type in ('student', 'teacher')),
  sender_user_id uuid references public.profiles (id) on delete set null,
  body text,
  -- file/image/audio are reserved for the attachments pass so it won't need
  -- another check-constraint migration.
  kind text not null default 'text'
    check (kind in ('text', 'file', 'image', 'audio', 'event')),
  event_type text check (
    event_type in (
      'booking_requested', 'booking_confirmed', 'booking_declined',
      'booking_cancelled', 'booking_rescheduled', 'pack_activated'
    )
  ),
  -- Snapshot of what the event line renders (starts_at, mode, …) taken at
  -- emit time, so a later reschedule doesn't rewrite history.
  event_payload jsonb,
  booking_id uuid references public.bookings (id) on delete set null,
  pack_purchase_id uuid references public.pack_purchases (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  read_at timestamptz,
  deleted_at timestamptz, -- reserved; nothing sets it today
  check ((kind = 'event') = (sender_type is null)),
  check ((kind = 'event') = (event_type is not null)),
  check (kind <> 'text' or body is not null)
);

create index messages_thread_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx
  on public.messages (conversation_id)
  where read_at is null and kind <> 'event';

alter table public.messages enable row level security;

create policy "Owners and admins read messages"
  on public.messages for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.account_id = auth.uid()
    )
  );

-- Text only from the browser; events arrive server-side with the service
-- client, and attachment kinds get their own path in a later pass.
create policy "Participants write text messages"
  on public.messages for insert
  with check (
    kind = 'text'
    and sender_user_id = auth.uid()
    and (
      (
        sender_type = 'teacher'
        and public.is_admin()
      )
      or (
        sender_type = 'student'
        and exists (
          select 1 from public.conversations c
          where c.id = conversation_id and c.account_id = auth.uid()
        )
      )
    )
  );

-- No update/delete policies: edits go through edit_message() below, reads
-- through mark_conversation_read(). Nothing is ever deleted.

-- ---------------------------------------------------------------------------
-- caches follow the messages, never the other way around

create or replace function public.apply_message_to_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'event' then
    update public.conversations
    set last_activity_at = new.created_at
    where id = new.conversation_id;
  else
    update public.conversations
    set
      last_activity_at = new.created_at,
      last_message_at = new.created_at,
      last_message_preview = left(coalesce(new.body, ''), 140),
      last_message_sender = new.sender_type,
      unread_teacher = unread_teacher
        + case when new.sender_type = 'student' then 1 else 0 end,
      unread_student = unread_student
        + case when new.sender_type = 'teacher' then 1 else 0 end,
      -- Writing into an archived conversation surfaces it again.
      archived = false
    where id = new.conversation_id;
  end if;
  return new;
end;
$$;

create trigger messages_apply
  after insert on public.messages
  for each row execute function public.apply_message_to_conversation();

-- ---------------------------------------------------------------------------
-- reading and editing

-- Marks the other side's messages read and zeroes the caller's counter.
-- Runs as the signed-in user (RPC), so it checks membership itself.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_owns boolean;
begin
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.account_id = auth.uid()
  ) into v_owns;

  if not v_is_admin and not v_owns then
    raise exception 'not allowed';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and read_at is null
    and kind <> 'event'
    and sender_type = case when v_is_admin then 'student' else 'teacher' end;

  if v_is_admin then
    update public.conversations
    set unread_teacher = 0 where id = p_conversation_id;
  else
    update public.conversations
    set unread_student = 0 where id = p_conversation_id;
  end if;
end;
$$;

-- The 5-minute window is server truth, not client politeness. Only the
-- author edits, only text messages, only the body.
create or replace function public.edit_message(p_message_id uuid, p_body text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.messages%rowtype;
begin
  select * into v_message from public.messages where id = p_message_id;

  if v_message.id is null or v_message.sender_user_id <> auth.uid() then
    return 'not_allowed';
  end if;
  if v_message.kind <> 'text' then
    return 'not_editable';
  end if;
  if v_message.created_at < now() - interval '5 minutes' then
    return 'window_closed';
  end if;
  if length(trim(p_body)) = 0 then
    return 'empty';
  end if;

  update public.messages
  set body = trim(p_body), edited_at = now()
  where id = p_message_id;

  -- If it was the latest real message, the list preview follows the edit.
  update public.conversations c
  set last_message_preview = left(trim(p_body), 140)
  where c.id = v_message.conversation_id
    and c.last_message_at = v_message.created_at;

  return 'ok';
end;
$$;
