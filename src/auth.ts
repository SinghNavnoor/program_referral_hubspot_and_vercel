export function verifyWebhookSecret(
  headerValue: string | string[] | undefined,
  secret: string
): boolean {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!value || !secret) return false;
  return value === secret;
}

export function parseProgramId(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload: expected object");
  }
  const b = body as Record<string, unknown>;
  const id =
    firstString(b.programId) ??
    firstString(b.hs_object_id) ??
    firstString(b.objectId) ??
    nestedId(b);
  if (!id) throw new Error("Invalid payload: missing programId");
  return id;
}

function nestedId(b: Record<string, unknown>): string | undefined {
  const obj = b.object;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    return firstString(o.objectId) ?? firstString(o.id);
  }
  return undefined;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}
