import { createHmac, timingSafeEqual } from "node:crypto";

export const REFERRAL_SOURCE = "ph-referral";

export type CompletedDocumentEvent = {
  documentId: string;
  metadata: Record<string, string>;
};

export function buildReferralMetadata(
  contactId: string,
  extra?: { clientName?: string; createdDate?: string; version?: string }
): Record<string, string> {
  const metadata: Record<string, string> = {
    source: REFERRAL_SOURCE,
    hubspotContactId: contactId,
  };
  if (extra?.clientName?.trim()) metadata.clientName = extra.clientName.trim();
  if (extra?.createdDate?.trim()) metadata.createdDate = extra.createdDate.trim();
  if (extra?.version?.trim()) metadata.version = extra.version.trim();
  return metadata;
}

export function isReferralMetadata(
  metadata: Record<string, string> | undefined
): metadata is {
  source: string;
  hubspotContactId: string;
  clientName?: string;
  createdDate?: string;
  version?: string;
} {
  return metadata?.source === REFERRAL_SOURCE && Boolean(metadata.hubspotContactId);
}

function asMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw;
  }
  return out;
}

export function parseCompletedEvents(body: unknown): CompletedDocumentEvent[] {
  const events = Array.isArray(body) ? body : body ? [body] : [];
  const parsed: CompletedDocumentEvent[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const e = event as {
      event?: string;
      data?: { id?: string; status?: string; metadata?: unknown };
    };
    const name = e.event ?? "";
    const status = e.data?.status ?? "";
    const id = e.data?.id?.trim();
    if (!id || seen.has(id)) continue;
    const completedEvent =
      name === "document_completed_pdf_ready" ||
      name === "document_completed" ||
      (name === "document_state_changed" && status === "document.completed");
    if (!completedEvent) continue;
    seen.add(id);
    parsed.push({ documentId: id, metadata: asMetadata(e.data?.metadata) });
  }
  return parsed;
}

export function parseCompletedDocumentIds(body: unknown): string[] {
  return parseCompletedEvents(body).map((event) => event.documentId);
}

export function signatureFromHeaders(
  headers: Record<string, string | string[] | undefined>
): string {
  const raw =
    headers.signature ??
    headers["x-signature"] ??
    headers["x-pandadoc-signature"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

export function verifyPandaDocSignature(
  sharedKey: string,
  rawBody: string,
  receivedSignature: string | undefined
): boolean {
  if (!sharedKey || !receivedSignature) return false;
  const expected = createHmac("sha256", sharedKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
