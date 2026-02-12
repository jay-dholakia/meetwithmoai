/**
 * Compute age in years from birthdate (ISO or YYYY-MM-DD).
 * Returns null if birthdate is missing or invalid.
 */
export function ageFromBirthdate(birthdate: string | null | undefined): number | null {
  if (!birthdate || typeof birthdate !== "string") return null;
  const trimmed = birthdate.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--;
  return age >= 0 ? age : null;
}
