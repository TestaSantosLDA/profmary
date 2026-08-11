-- Students (fichas) + intake questionnaire (design handoff 14).
--
-- A "student" is a ficha inside an account: guardians own the account and a
-- child student is a ficha of theirs, never an account of its own. Bookings
-- resolve their free-text attendee names into fichas via trigger, so lesson
-- history accumulates on the ficha. Questions live in a shared "common" set
-- plus optional per-service sets; every answer is optional by design.

-- ---------------------------------------------------------------------------
-- students

create table public.students (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  birth_date date,
  email text,
  phone text,
  -- Admin-only: the student never sees these. The table has no user-facing
  -- RLS policies for exactly this reason — user-owned reads go through
  -- server code with the service client.
  private_notes text not null default '',
  -- The questionnaire link. Deliberately non-expiring: students revise their
  -- answers as their level changes, so the token must survive years and edits.
  questionnaire_token uuid not null unique default gen_random_uuid(),
  questionnaire_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- Attendee resolution key: one ficha per distinct name within an account.
create unique index students_account_name_key
  on public.students (account_id, lower(trim(name)));

create index students_account_idx on public.students (account_id);

alter table public.students enable row level security;

create policy "Admins manage students"
  on public.students for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- booking_attendees: bookings referencing fichas instead of free text

create table public.booking_attendees (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  primary key (booking_id, student_id)
);

create index booking_attendees_student_idx
  on public.booking_attendees (student_id);

alter table public.booking_attendees enable row level security;

create policy "Admins read booking attendees"
  on public.booking_attendees for select
  using (public.is_admin());

-- Resolve attendee_names into fichas on every booking insert. Runs as
-- definer so it also covers the series RPCs and bypasses the admin-only RLS.
create or replace function public.resolve_booking_attendees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_student uuid;
begin
  for v_name in
    select distinct trim(n)
    from jsonb_array_elements_text(new.attendee_names) as n
    where trim(n) <> ''
  loop
    select id into v_student
    from public.students
    where account_id = new.user_id
      and lower(trim(name)) = lower(v_name);

    if v_student is null then
      begin
        insert into public.students (account_id, name)
        values (new.user_id, v_name)
        returning id into v_student;
      exception
        when unique_violation then
          select id into v_student
          from public.students
          where account_id = new.user_id
            and lower(trim(name)) = lower(v_name);
      end;
    end if;

    insert into public.booking_attendees (booking_id, student_id)
    values (new.id, v_student)
    on conflict do nothing;
  end loop;

  return new;
end;
$$;

create trigger bookings_resolve_attendees
  after insert on public.bookings
  for each row execute function public.resolve_booking_attendees();

-- Backfill: existing bookings carry free-text names only.
insert into public.students (account_id, name)
select distinct on (b.user_id, lower(trim(n))) b.user_id, trim(n)
from public.bookings b
cross join lateral jsonb_array_elements_text(b.attendee_names) as n
where trim(n) <> '';

insert into public.booking_attendees (booking_id, student_id)
select b.id, s.id
from public.bookings b
cross join lateral jsonb_array_elements_text(b.attendee_names) as n
join public.students s
  on s.account_id = b.user_id
 and lower(trim(s.name)) = lower(trim(n))
where trim(n) <> ''
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- questions

-- service_id null = the shared "perguntas comuns" set (the handoff's
-- scope 'common' | 'service:<id>' expressed relationally). options is a json
-- array of strings, PT only — options have no EN variant in the builder.
-- follow_up_question_id points at a hidden question revealed by a "sim"
-- answer; follow-ups never appear in top-level lists.
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services (id) on delete cascade,
  type text not null check (type in ('short_text', 'long_text', 'multi_choice', 'yes_no')),
  label_pt text not null,
  label_en text not null default '',
  hint_pt text not null default '',
  hint_en text not null default '',
  options jsonb not null default '[]'::jsonb,
  follow_up_question_id uuid references public.questions (id),
  position integer not null default 0,
  -- Editing a question that already has answers versions it: the old row
  -- goes inactive and a fresh row takes its place, so answered fichas keep
  -- showing the question text the student actually saw.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create index questions_service_idx on public.questions (service_id, position)
  where active;

alter table public.questions enable row level security;

-- The form is public (tokenised link, no session), so questions are too.
create policy "Anyone can read questions"
  on public.questions for select
  using (true);

create policy "Admins manage questions"
  on public.questions for insert
  with check (public.is_admin());

create policy "Admins update questions"
  on public.questions for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- answers

-- value: json string for text/yes-no answers, json array for multi_choice.
-- Answers are never deleted when questions change (versioning covers that);
-- clearing a field on the form deletes just that row.
create table public.answers (
  student_id uuid not null references public.students (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  value jsonb not null,
  answered_at timestamptz not null default now(),
  primary key (student_id, question_id)
);

alter table public.answers enable row level security;

-- Writes happen server-side (the token is the credential); admins read.
create policy "Admins read answers"
  on public.answers for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Default common questions — a working starting set Maria edits in the
-- builder. Short on purpose: four questions is near the practical ceiling.

insert into public.questions (type, label_pt, label_en, hint_pt, hint_en, position)
values
  (
    'short_text',
    'Quem vai ter a aula?',
    'Who is the lesson for?',
    'Nome e idade, se for para um filho ou filha.',
    'Name and age, if the lesson is for your child.',
    1
  ),
  (
    'multi_choice',
    'O que o traz às aulas de português?',
    'What brings you to Portuguese lessons?',
    'Pode escolher mais do que uma opção.',
    'You can pick more than one option.',
    2
  ),
  (
    'long_text',
    'O que gostava de conseguir fazer daqui a seis meses?',
    'What would you like to be able to do six months from now?',
    '',
    '',
    3
  );

update public.questions
set options = '["Trabalho", "Estudos ou exames", "Vivo em Portugal", "Família", "Gosto pessoal"]'::jsonb
where label_pt = 'O que o traz às aulas de português?';

-- The classic yes/no + follow-up pair: "already studied Portuguese?" reveals
-- "where and for how long" on a "sim".
with follow_up as (
  insert into public.questions (type, label_pt, label_en, position, active)
  values ('short_text', 'Onde e durante quanto tempo?', 'Where and for how long?', 0, true)
  returning id
)
insert into public.questions (type, label_pt, label_en, follow_up_question_id, position)
select
  'yes_no',
  'Já estudou português antes?',
  'Have you studied Portuguese before?',
  follow_up.id,
  4
from follow_up;
