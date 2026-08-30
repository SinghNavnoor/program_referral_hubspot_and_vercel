export function parseHubSpotDate(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    const ms = s.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10) + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return new Date(Date.UTC(year, month - 1, day));
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return undefined;
  return new Date(t);
}

export function ageFromDateOfBirth(
  raw: string | undefined,
  asOf: Date
): number | undefined {
  const dob = parseHubSpotDate(raw);
  if (!dob) return undefined;
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && asOf.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }
  if (age < 0 || age > 120) return undefined;
  return age;
}

export function resolveAge(
  args: { ageCalculated?: string; dateOfBirth?: string },
  asOf: Date = new Date()
): string | undefined {
  const calc = args.ageCalculated?.trim() ?? "";
  if (calc && /^\d{1,3}$/.test(calc)) {
    const n = Number(calc);
    if (n >= 0 && n <= 120) return String(n);
  }
  const fromCalcDate = ageFromDateOfBirth(calc, asOf);
  if (fromCalcDate != null) return String(fromCalcDate);
  const fromDob = ageFromDateOfBirth(args.dateOfBirth, asOf);
  return fromDob != null ? String(fromDob) : undefined;
}

export function toPandaDocDate(raw: string | undefined): string | undefined {
  const d = parseHubSpotDate(raw);
  if (!d) return undefined;
  return d.toISOString();
}
