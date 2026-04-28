const WHITELIST = [
  process.env.WHITELIST_EMAIL_1,
  process.env.WHITELIST_EMAIL_2,
]
  .filter((e): e is string => Boolean(e))
  .map((e) => e.trim().toLowerCase());

export function isWhitelisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return WHITELIST.includes(email.trim().toLowerCase());
}

export function getWhitelist(): string[] {
  return [...WHITELIST];
}
