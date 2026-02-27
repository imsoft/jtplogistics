export const EMAIL_ACCOUNT_TYPES = [
  "Gmail",
  "Outlook",
  "iCloud",
  "Yahoo",
  "Corporativo",
  "Otro",
] as const;

export type EmailAccountType = (typeof EMAIL_ACCOUNT_TYPES)[number];
