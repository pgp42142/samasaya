-- samasaya: demo seed data
-- Run in the Supabase SQL Editor AFTER the initial schema migration.
--
-- Creates 8 demo students, one demo resolver per department, 20 grievances
-- with status histories, and upvotes. Every demo account's email ends in
-- ".seed@iiml.ac.in" and has no password or Google identity, so nobody can
-- sign in as one.
--
-- Safe to re-run: it deletes the previous demo data first. Real users and
-- their grievances are never touched.

begin;

-- Removing the demo auth users cascades to their profiles, grievances,
-- upvotes and status history.
delete from auth.users where email like '%.seed@iiml.ac.in';

-- ---------------------------------------------------------------------------
-- Demo accounts (the on_auth_user_created trigger creates public.users rows)
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  id::uuid,
  'authenticated',
  'authenticated',
  email,
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  jsonb_build_object('full_name', full_name),
  now() - interval '60 days',
  now() - interval '60 days',
  '', '', '', ''
from (values
  -- students
  ('a0000000-0000-4000-8000-000000000001', 'aarav.mehta.seed@iiml.ac.in',     'Aarav Mehta'),
  ('a0000000-0000-4000-8000-000000000002', 'ishita.rao.seed@iiml.ac.in',      'Ishita Rao'),
  ('a0000000-0000-4000-8000-000000000003', 'rohan.verma.seed@iiml.ac.in',     'Rohan Verma'),
  ('a0000000-0000-4000-8000-000000000004', 'sneha.iyer.seed@iiml.ac.in',      'Sneha Iyer'),
  ('a0000000-0000-4000-8000-000000000005', 'kabir.singh.seed@iiml.ac.in',     'Kabir Singh'),
  ('a0000000-0000-4000-8000-000000000006', 'ananya.ghosh.seed@iiml.ac.in',    'Ananya Ghosh'),
  ('a0000000-0000-4000-8000-000000000007', 'vikram.nair.seed@iiml.ac.in',     'Vikram Nair'),
  ('a0000000-0000-4000-8000-000000000008', 'meera.kulkarni.seed@iiml.ac.in',  'Meera Kulkarni'),
  -- resolvers
  ('b0000000-0000-4000-8000-000000000001', 'hostel.office.seed@iiml.ac.in',   'Hostel Office'),
  ('b0000000-0000-4000-8000-000000000002', 'mess.committee.seed@iiml.ac.in',  'Mess Committee'),
  ('b0000000-0000-4000-8000-000000000003', 'it.helpdesk.seed@iiml.ac.in',     'IT Helpdesk'),
  ('b0000000-0000-4000-8000-000000000004', 'pgp.office.seed@iiml.ac.in',      'PGP Office'),
  ('b0000000-0000-4000-8000-000000000005', 'sports.office.seed@iiml.ac.in',   'Sports Office'),
  ('b0000000-0000-4000-8000-000000000006', 'student.affairs.seed@iiml.ac.in', 'Student Affairs')
) as v (id, email, full_name);

update public.users u
set role = 'resolver', department = v.department::public.grievance_category
from (values
  ('b0000000-0000-4000-8000-000000000001', 'Hostel'),
  ('b0000000-0000-4000-8000-000000000002', 'Mess'),
  ('b0000000-0000-4000-8000-000000000003', 'IT'),
  ('b0000000-0000-4000-8000-000000000004', 'PGP Office'),
  ('b0000000-0000-4000-8000-000000000005', 'Sports'),
  ('b0000000-0000-4000-8000-000000000006', 'Clubs & Committees')
) as v (id, department)
where u.id = v.id::uuid;

-- ---------------------------------------------------------------------------
-- Grievances
-- ---------------------------------------------------------------------------

insert into public.grievances
  (id, author_id, category, title, description, is_anonymous, status, created_at)
select
  id::uuid, author_id::uuid, category::public.grievance_category,
  title, description, is_anonymous, status::public.grievance_status,
  now() - days_ago * interval '1 day'
from (values
  -- Hostel
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Hostel',
   'No hot water in Hostel 4 after 8 AM',
   'For the past week the geysers on all three floors of Hostel 4 stop giving hot water by 8 AM. Students with early lectures are fine, but anyone showering after the 8:30 slot gets cold water. Could the boiler timings be extended or the heaters checked?',
   false, 'In progress', 21),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'Hostel',
   'Ceiling fans broken in several Hostel 7 rooms',
   'Rooms 712, 715 and 719 have had non-working ceiling fans since the start of term. Complaints were logged in the hostel register twice but nobody has come. It is very hard to study in the afternoons.',
   false, 'Resolved', 34),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006', 'Hostel',
   'Two of three washing machines out of order in Hostel 2',
   'Only one washing machine works in the Hostel 2 laundry room, so there is a queue every evening and on weekends. One machine shows an error code and the other does not drain.',
   false, 'Acknowledged', 9),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000007', 'Hostel',
   'Rats seen in Hostel 10 corridors at night',
   'Several of us have seen rats near the pantry and the second-floor corridor of Hostel 10 late at night. Food left in rooms has been chewed. Please arrange pest control and close the gaps near the drain pipes.',
   true, 'Submitted', 3),

  -- Mess
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Mess',
   'Dinner quality in Mess 1 has dropped sharply',
   'Over the last two weeks the dinner rotis are often undercooked and the sabzi is watery. Many students are skipping dinner and ordering outside. Please review the vendor and the menu.',
   true, 'Acknowledged', 12),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'Mess',
   'Breakfast closes before 8:30 AM lectures end',
   'Breakfast service stops at 9:00, but on days with an 8:00–9:15 lecture we cannot eat at all. Could the counter stay open until 9:45, even with a limited menu?',
   false, 'In progress', 18),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008', 'Mess',
   'Insect found in dal at Mess 2 lunch',
   'At lunch on Monday there was an insect in the dal served at Mess 2. Photos were shown to the staff at the counter. Kitchen hygiene and storage of pulses need to be checked.',
   true, 'Resolved', 27),
  ('c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'Mess',
   'Need a Jain / no-onion-garlic option at every meal',
   'A number of students follow Jain diets but the only option most days is plain rice and curd. A small dedicated counter or one marked dish per meal would help.',
   false, 'Submitted', 5),

  -- IT
  ('c0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000006', 'IT',
   'Wi-Fi keeps dropping in the library reading room',
   'Between 7 PM and midnight the Wi-Fi in the library reading room disconnects every few minutes, which makes it impossible to join calls or download readings. Other parts of campus seem fine.',
   false, 'In progress', 15),
  ('c0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'IT',
   'LMS went down during the quiz submission deadline',
   'The LMS was unreachable from 11:40 PM to about 12:20 AM on the night the Operations quiz was due. Several of us could not submit. Please share what happened so the deadline can be extended.',
   false, 'Resolved', 30),
  ('c0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000004', 'IT',
   'Off-campus access to journal databases',
   'When we are away for internships or travel we cannot open EBSCO or JSTOR because access is IP-based. Can a VPN or proxy login be set up for students?',
   false, 'Submitted', 4),
  ('c0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000007', 'IT',
   'Computer centre printer always out of toner',
   'The main printer in the computer centre has been out of toner on most days this month, right when case submissions need to be printed. Please keep spare cartridges stocked.',
   false, 'Acknowledged', 8),

  -- PGP Office
  ('c0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000002', 'PGP Office',
   'Bonafide certificates taking over two weeks',
   'I applied for a bonafide certificate for a visa appointment 16 days ago and it is still not issued. Others are facing the same delay. Is there a way to fast-track urgent requests?',
   false, 'In progress', 16),
  ('c0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000005', 'PGP Office',
   'Term 3 attendance not updated on the portal',
   'Attendance on the student portal has not been updated for Term 3 since week 2. With the attendance cutoff policy, we need accurate numbers to plan.',
   true, 'Acknowledged', 10),
  ('c0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000003', 'PGP Office',
   'End-term exam clash between two electives',
   'The end-term schedule has Digital Marketing and Corporate Valuation on the same slot. Around 40 students are registered for both. Please reschedule one of them.',
   false, 'Submitted', 2),

  -- Sports
  ('c0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000008', 'Sports',
   'Two treadmills in the gym not working',
   'Two of the four treadmills in the gym have been broken for about three weeks, so there is a long wait in the evenings. Please get them repaired or replaced.',
   false, 'Resolved', 25),
  ('c0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000006', 'Sports',
   'Request for women-only swimming pool hours',
   'Many women students would use the pool more if there were a dedicated slot with a female lifeguard. Even two evening slots a week would make a difference.',
   true, 'Submitted', 6),
  ('c0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000005', 'Sports',
   'Football ground floodlights not working',
   'Half the floodlights on the football ground have been off for two weeks. Evening practice for the inter-IIM tournament is getting cancelled.',
   false, 'Acknowledged', 11),

  -- Clubs & Committees
  ('c0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000004', 'Clubs & Committees',
   'Committee selection process is not transparent',
   'Selection criteria and interview panels for some committees were not published, and results came out without any scores or feedback. Please publish the criteria before the next round.',
   true, 'Submitted', 7),
  ('c0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000003', 'Clubs & Committees',
   'Club event reimbursements pending for two months',
   'Our club spent out of pocket on the August speaker session and submitted bills on time, but reimbursements are still pending. Members are now reluctant to fund future events.',
   false, 'In progress', 40)
) as v (id, author_id, category, title, description, is_anonymous, status, days_ago);

-- ---------------------------------------------------------------------------
-- Status history: one row per step, made by that department's resolver
-- ---------------------------------------------------------------------------

insert into public.status_updates
  (grievance_id, updated_by, old_status, new_status, comment, created_at)
select
  g.id,
  r.id,
  v.old_status::public.grievance_status,
  v.new_status::public.grievance_status,
  v.comment,
  g.created_at + v.hours_after * interval '1 hour'
from (values
  ('c0000000-0000-4000-8000-000000000001', 'Submitted',    'Acknowledged', 'Checked with the maintenance team; the boiler timer is set too early.', 20),
  ('c0000000-0000-4000-8000-000000000001', 'Acknowledged', 'In progress',  'Timer being reprogrammed and the second boiler serviced this week.', 72),

  ('c0000000-0000-4000-8000-000000000002', 'Submitted',    'Acknowledged', 'Electrician assigned to Hostel 7.', 6),
  ('c0000000-0000-4000-8000-000000000002', 'Acknowledged', 'In progress',  'Replacement fan regulators ordered.', 30),
  ('c0000000-0000-4000-8000-000000000002', 'In progress',  'Resolved',     'Fans in rooms 712, 715 and 719 replaced and tested.', 120),

  ('c0000000-0000-4000-8000-000000000003', 'Submitted',    'Acknowledged', 'Vendor has been called to inspect both machines.', 26),

  ('c0000000-0000-4000-8000-000000000005', 'Submitted',    'Acknowledged', 'Raised with the Mess 1 vendor; tasting committee will review dinner this week.', 18),

  ('c0000000-0000-4000-8000-000000000006', 'Submitted',    'Acknowledged', 'Discussing extended hours with the vendor.', 24),
  ('c0000000-0000-4000-8000-000000000006', 'Acknowledged', 'In progress',  'Trial of a grab-and-go counter until 9:45 starts next Monday.', 96),

  ('c0000000-0000-4000-8000-000000000007', 'Submitted',    'Acknowledged', 'Kitchen inspected the same day.', 3),
  ('c0000000-0000-4000-8000-000000000007', 'Acknowledged', 'In progress',  'Pulses stock discarded; storage bins being replaced.', 20),
  ('c0000000-0000-4000-8000-000000000007', 'In progress',  'Resolved',     'New sealed storage in place and vendor issued a formal warning.', 72),

  ('c0000000-0000-4000-8000-000000000009', 'Submitted',    'Acknowledged', 'Logged with the network team.', 10),
  ('c0000000-0000-4000-8000-000000000009', 'Acknowledged', 'In progress',  'Access point overloaded at peak hours; two more APs are being installed.', 60),

  ('c0000000-0000-4000-8000-000000000010', 'Submitted',    'Acknowledged', 'Confirmed an outage caused by a failed server update.', 4),
  ('c0000000-0000-4000-8000-000000000010', 'Acknowledged', 'Resolved',     'Root cause fixed. PGP Office has extended the quiz deadline by 24 hours.', 28),

  ('c0000000-0000-4000-8000-000000000012', 'Submitted',    'Acknowledged', 'Toner order raised with procurement.', 22),

  ('c0000000-0000-4000-8000-000000000013', 'Submitted',    'Acknowledged', 'Backlog due to the signatory being on leave.', 30),
  ('c0000000-0000-4000-8000-000000000013', 'Acknowledged', 'In progress',  'Pending certificates being processed this week; urgent ones prioritised.', 80),

  ('c0000000-0000-4000-8000-000000000014', 'Submitted',    'Acknowledged', 'Checking the sync between the attendance system and the portal.', 40),

  ('c0000000-0000-4000-8000-000000000016', 'Submitted',    'Acknowledged', 'Service request placed with the equipment vendor.', 12),
  ('c0000000-0000-4000-8000-000000000016', 'Acknowledged', 'In progress',  'Technician visit scheduled.', 70),
  ('c0000000-0000-4000-8000-000000000016', 'In progress',  'Resolved',     'Both treadmills repaired; belts replaced.', 200),

  ('c0000000-0000-4000-8000-000000000018', 'Submitted',    'Acknowledged', 'Electrical team will inspect the floodlight panel.', 16),

  ('c0000000-0000-4000-8000-000000000020', 'Submitted',    'Acknowledged', 'Bills received; forwarding to accounts.', 48),
  ('c0000000-0000-4000-8000-000000000020', 'Acknowledged', 'In progress',  'Accounts has approved; payment expected in the next cycle.', 400)
) as v (grievance_id, old_status, new_status, comment, hours_after)
join public.grievances g on g.id = v.grievance_id::uuid
join public.users r on r.role = 'resolver' and r.department = g.category
                    and r.email like '%.seed@iiml.ac.in';

-- ---------------------------------------------------------------------------
-- Upvotes: a deterministic pseudo-random spread, never on one's own grievance
-- ---------------------------------------------------------------------------

insert into public.upvotes (user_id, grievance_id)
select s.id, g.id
from public.grievances g
cross join public.users s
where s.role = 'student'
  and s.email like '%.seed@iiml.ac.in'
  and g.author_id <> s.id
  and g.id::text like 'c0000000-%'
  and abs(hashtext(g.id::text || s.id::text)) % 5 < 2
on conflict do nothing;

commit;
