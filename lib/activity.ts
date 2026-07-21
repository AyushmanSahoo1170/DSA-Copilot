import { readAccountData, writeAccountData } from "./account-data";

export type ActivitySubmission = {
  createdAt?: string;
  verdict?: string;
  problemId?: string;
  durationMinutes?: number;
  [key: string]: unknown;
};

export function readSubmissions(): ActivitySubmission[] {
  const saved = readAccountData<unknown>("dsa-submissions", []);
  return Array.isArray(saved) ? saved as ActivitySubmission[] : [];
}

export function writeSubmissions(submissions: ActivitySubmission[]) {
  writeAccountData("dsa-submissions", submissions);
}

export function readSolvedSlugs() {
  const saved = readAccountData<unknown>("dsa-solved", []);
  return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
}

export function writeSolvedSlugs(slugs: string[]) {
  writeAccountData("dsa-solved", slugs);
}

export function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getActivityCounts(submissions: ActivitySubmission[]) {
  return submissions.reduce<Record<string, number>>((counts, submission) => {
    if (!submission.createdAt) return counts;
    const date = new Date(submission.createdAt);
    if (Number.isNaN(date.getTime())) return counts;
    const key = dayKey(date);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

export function getCurrentStreak(submissions: ActivitySubmission[], referenceDate = new Date()) {
  const activity = getActivityCounts(submissions);
  let streak = 0;
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  while (activity[dayKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function formatStudyTime(minutes: number) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining}m`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
