# Prompts

## 1

Build an MVP grievance portal for IIM Lucknow students called "samasaya", in stages. First, keep a file called PROMPTS.md in the project root and append every prompt I give you, word for word, starting with this one. Stage 1 only: set up a Next.js (App Router) + Tailwind project in this folder connected to Supabase. Google sign-in is already configured in Supabase. Build the login page with Google sign-in, and allow only @iiml.ac.in emails, checked server-side. After login, show a simple placeholder home page with the user's name and a logout button.

## 2

run the app

## 3

Commit everything and push this project to https://github.com/pgp42142/samasaya. Make sure .env.local is not included.

## 4

Commit everything and push this project to https://github.com/pgp42142/samasaya. Make sure .env.local is not    included.

## 5

Stage 2: Create the database schema as a SQL migration file I can run in the
Supabase SQL Editor.

Tables:
- users (id, email, name, role, department) — role is student, resolver or admin
- grievances (id, author_id, category, title, description, is_anonymous,
  status, created_at)
- upvotes (user_id, grievance_id) with a unique constraint on the pair
- status_updates (grievance_id, updated_by, old_status, new_status,
  comment, created_at)

Categories: Hostel, Mess, IT, PGP Office, Sports, Clubs & Committees.
Each category routes to a resolver with the matching department.
Statuses: Submitted, Acknowledged, In progress, Resolved.

Add row-level security so students see their own grievances and the public
board, resolvers see only their department's grievances and never see
author_id on anonymous ones, and admins see everything.
Also give me seed data with ~20 realistic grievances across all categories.

## 6

Commit this stage to git with a clear message.

## 7

push it

## 8

Stage 3: Build the "File a grievance" screen.
Fields: category (the six categories), title, description, and an
"Submit anonymously" toggle with one line explaining that resolvers won't
see your name, but the system keeps it to prevent abuse.
While the user types the title, show up to 3 similar open grievances in the
same category with an Upvote button, so they can upvote instead of filing
a duplicate.
Enforce a limit of 5 grievances per student per day on the server.
After submitting, show a confirmation and take the user to "My grievances".
Keep the design clean and mobile-friendly, since most students will use
their phones.

## 9

Commit Stage 3 with a clear message.

## 10

Stage 4: Build the public board and "My grievances" page.

Public board: show all non-anonymous grievances and anonymous ones without
any author info. Each card shows category, title, status, upvote count, and
how long ago it was filed. Add filters for category and status, and sort by
most upvoted or newest. Students can upvote from here (one upvote per person).

My grievances: show only the logged-in student's grievances, including
anonymous ones, each with a status timeline (Submitted → Acknowledged →
In progress → Resolved) built from status_updates, showing the date and
the resolver's public comment for each change.

Add a simple navigation bar: Board, File a grievance, My grievances, Logout.
Keep it mobile-friendly.

## 11

Commit Stage 4 with a clear message.
