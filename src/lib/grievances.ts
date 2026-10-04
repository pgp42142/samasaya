export const CATEGORIES = [
  "Hostel",
  "Mess",
  "IT",
  "PGP Office",
  "Sports",
  "Clubs & Committees",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = [
  "Submitted",
  "Acknowledged",
  "In progress",
  "Resolved",
] as const;
export type Status = (typeof STATUSES)[number];

export type Role = "student" | "resolver" | "admin";

// Must match the checks on public.grievances and the daily-limit trigger.
export const TITLE_MIN = 5;
export const TITLE_MAX = 150;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 5000;
export const DAILY_LIMIT = 5;

// A row of the grievance_board view.
export type BoardGrievance = {
  id: string;
  category: Category;
  title: string;
  description: string;
  is_anonymous: boolean;
  status: Status;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
  is_mine: boolean;
  upvote_count: number;
  has_upvoted: boolean;
};

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category);
}

// Start of today in IST, matching the database's daily-limit window.
export function startOfTodayIST(now = new Date()): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}
