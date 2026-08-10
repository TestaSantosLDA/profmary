-- Development seed: placeholder services (one per audience segment) and
-- an initial weekly schedule. Real content is entered through the admin panel.

insert into public.services
  (title_pt, title_en, description_pt, description_en,
   hourly_rate_cents, min_duration_minutes, max_duration_minutes, attendee_cap, sort_order)
values
  (
    'Português para estrangeiros',
    'Portuguese for foreigners',
    'Aulas práticas de conversação e gramática para quem vive em Portugal.',
    'Practical conversation and grammar lessons for people living in Portugal.',
    1500, 60, 120, -1, 1
  ),
  (
    'Preparação para o exame nacional',
    'National exam preparation',
    'Preparação intensiva para o exame nacional de Português (12.º ano).',
    'Intensive preparation for the Portuguese national exam (12th grade).',
    1500, 60, 120, -1, 2
  );

-- Mon-Fri 17:00-20:00 as a starting point; edited in the admin panel.
insert into public.availability_rules (weekday, start_time, end_time)
values
  (1, '17:00', '20:00'),
  (2, '17:00', '20:00'),
  (3, '17:00', '20:00'),
  (4, '17:00', '20:00'),
  (5, '17:00', '20:00');
