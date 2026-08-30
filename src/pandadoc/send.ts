import { ORG_SHORT_NAME, REFERRAL_COPY_ROLE } from "../branding.js";
import { splitClientName } from "../names.js";
import { buildDocumentName, buildPandaDocPayload, createdDateLabel } from "./fieldMap.js";
import type { ProgramReferralData } from "./fieldMap.js";
import { buildReferralMetadata } from "./complete.js";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function pandaDocFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`https://api.pandadoc.com${path}`, {
    ...init,
    headers: {
      Authorization: `API-Key ${apiKey}`,
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers ?? {}),
    },
  });
}

export async function waitForDocumentDraft(
  apiKey: string,
  documentId: string,
  options: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 20;
  const intervalMs = options.intervalMs ?? 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await pandaDocFetch(
      apiKey,
      `/public/v1/documents/${documentId}`
    );
    if (!res.ok) {
      throw new Error(`PandaDoc status check failed: ${res.status}`);
    }
    const data = (await res.json()) as { status: string };
    if (data.status === "document.draft") return;
    if (data.status === "document.error") {
      throw new Error(`PandaDoc document entered error status`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`PandaDoc document ${documentId} did not become draft in time`);
}

export async function sendPandaDocDocument(
  apiKey: string,
  documentId: string,
  subject: string,
  message: string
): Promise<void> {
  const res = await pandaDocFetch(
    apiKey,
    `/public/v1/documents/${documentId}/send`,
    {
      method: "POST",
      body: JSON.stringify({ subject, message, silent: false }),
    }
  );
  if (!res.ok) {
    throw new Error(`PandaDoc send failed: ${res.status} ${await res.text()}`);
  }
}

export type ReferralRecipient = {
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function buildReferralRecipients(args: {
  toEmail: string;
  notifyEmail?: string;
  caseManagerName: string;
  caseManagerEmail: string;
}): ReferralRecipient[] {
  const toEmail = normalizeEmail(args.toEmail);
  const notify = normalizeEmail(args.notifyEmail || args.toEmail);
  const cmEmail = normalizeEmail(args.caseManagerEmail) || toEmail;
  const cm = splitClientName(args.caseManagerName);
  const used = new Set<string>();

  const recipients: ReferralRecipient[] = [
    {
      email: cmEmail,
      first_name: cm.firstName || "Case",
      last_name: cm.lastName || "Manager",
      role: "Case Manager",
    },
  ];
  used.add(cmEmail);

  if (!used.has(notify)) {
    recipients.push({
      email: notify,
      first_name: ORG_SHORT_NAME,
      last_name: "Referrals",
      role: REFERRAL_COPY_ROLE,
    });
    used.add(notify);
  }

  if (!used.has(toEmail)) {
    recipients.push({
      email: toEmail,
      first_name: ORG_SHORT_NAME,
      last_name: "Copy",
    });
  }

  return recipients;
}

export async function createAndSendReferral(args: {
  apiKey: string;
  templateUuid: string;
  toEmail: string;
  notifyEmail?: string;
  hubspotContactId?: string;
  documentVersion?: number;
  data: ProgramReferralData;
}): Promise<{ sentDocumentId: string }> {
  const docName = buildDocumentName(args.data, new Date(), args.documentVersion);
  const { tokens, fields } = buildPandaDocPayload(args.data);
  const metadata = args.hubspotContactId
    ? buildReferralMetadata(args.hubspotContactId, {
        clientName: args.data.fullName,
        createdDate: createdDateLabel(),
        version:
          args.documentVersion && args.documentVersion >= 2
            ? String(args.documentVersion)
            : undefined,
      })
    : undefined;

  const res = await fetch("https://api.pandadoc.com/public/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `API-Key ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: docName,
      template_uuid: args.templateUuid,
      recipients: buildReferralRecipients({
        toEmail: args.toEmail,
        notifyEmail: args.notifyEmail,
        caseManagerName: args.data.completingFormName ?? "",
        caseManagerEmail: args.data.completingFormEmail ?? "",
      }),
      tokens,
      fields,
      ...(metadata ? { metadata } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `PandaDoc create from template failed: ${res.status} ${await res.text()}`
    );
  }

  const created = (await res.json()) as { id: string };
  await waitForDocumentDraft(args.apiKey, created.id);
  await sendPandaDocDocument(
    args.apiKey,
    created.id,
    docName,
    `${ORG_SHORT_NAME} permanent housing referral for ${args.data.fullName}.`
  );
  return { sentDocumentId: created.id };
}
