export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
