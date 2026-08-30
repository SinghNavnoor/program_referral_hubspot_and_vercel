/**
 * HubSpot owner id → display name for the staff who own Program records.
 *
 * SAMPLE DATA. The production deployment maps real HubSpot owner ids to real
 * staff; those values are intentionally not published. Replace this map with
 * your own ids, or load it from an external source, before deploying.
 */
const PROGRAM_OWNER_NAMES: Record<string, string> = {
  "10000001": "Alex Rivera",
  "10000002": "Sam Chen",
  "10000003": "Jordan Blake",
  "10000004": "Priya Raman",
  "10000005": "Casey Nguyen",
  "10000006": "intake@example.org",
};

/** Email domain used to derive an owner address from a display name. */
export const OWNER_EMAIL_DOMAIN =
  process.env.OWNER_EMAIL_DOMAIN?.trim() || "example.org";

export type ProgramOwner = {
  name: string;
  email: string;
};

export function ownerEmailFromName(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  const initial = first.charAt(0).toLowerCase();
  const lastClean = last.toLowerCase().replace(/[^a-z-]/g, "");
  return `${initial}${lastClean}@${OWNER_EMAIL_DOMAIN}`;
}

export function resolveProgramOwner(ownerId: string): ProgramOwner | undefined {
  const name = PROGRAM_OWNER_NAMES[ownerId.trim()];
  if (!name) return undefined;
  return { name, email: ownerEmailFromName(name) };
}
