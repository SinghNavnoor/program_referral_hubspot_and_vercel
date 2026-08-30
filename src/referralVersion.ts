import { REFERRAL_FILENAME_PREFIX } from "./branding.js";

export function parseReferralVersion(filename: string): number {
  const trimmed = filename.trim();
  if (!trimmed) return 0;
  const suffix = trimmed.match(/[–-]\s*V(\d+)(?:\.pdf)?$/i);
  if (suffix) return Number(suffix[1]);
  if (trimmed.toLowerCase().includes(REFERRAL_FILENAME_PREFIX.toLowerCase()))
    return 1;
  return 0;
}

export function nextResendVersion(filenames: string[]): number {
  let max = 1;
  for (const name of filenames) {
    const parsed = parseReferralVersion(name);
    if (parsed > max) max = parsed;
  }
  return Math.max(2, max + 1);
}

export function parseStoredVersion(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value.trim());
  return Number.isInteger(n) && n >= 2 ? n : undefined;
}
