alter table public.people
drop constraint if exists people_disc_profile_check;

alter table public.people
add constraint people_disc_profile_check
check (
  disc_profile is null
  or disc_profile in (
    'D',
    'I',
    'S',
    'C',
    'ID',
    'IS',
    'IC',
    'DI',
    'DS',
    'DC',
    'SI',
    'SD',
    'SC',
    'CI',
    'CD',
    'CS'
  )
);
