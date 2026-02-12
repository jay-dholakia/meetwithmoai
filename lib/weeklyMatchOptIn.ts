/**
 * Next Monday (YYYY-MM-DD) used as batch_week for weekly match opt-in.
 * Must match the week used by replenish-matches cron (Tuesday run).
 */
export function getNextBatchWeekMonday(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToNextMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const next = new Date(now);
  next.setDate(now.getDate() + daysToNextMonday);
  next.setHours(0, 0, 0, 0);
  return next.toISOString().split('T')[0];
}
