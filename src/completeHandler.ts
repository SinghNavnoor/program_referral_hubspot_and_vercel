import { REFERRAL_FORM_NAME } from "./branding.js";
import type { AppConfig } from "./config.js";
import {
  isReferralMetadata,
  parseCompletedEvents,
  signatureFromHeaders,
  verifyPandaDocSignature,
} from "./pandadoc/complete.js";
import { pandaDocFetch } from "./pandadoc/send.js";
import { downloadCompletedPdf } from "./pandadoc/download.js";
import {
  attachPdfToContact,
  hubspotAttachmentFilename,
} from "./hubspot/attachFile.js";
import { createdDateLabel } from "./pandadoc/fieldMap.js";
import { parseStoredVersion } from "./referralVersion.js";

export type HttpRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody: string;
};

export type HttpResponse = {
  status: number;
  json: Record<string, unknown>;
};

export type CompleteDeps = {
  getMetadata: (documentId: string) => Promise<Record<string, string>>;
  attach: (args: {
    documentId: string;
    contactId: string;
    clientName?: string;
    createdDate?: string;
    version?: number;
  }) => Promise<{ fileId: string; noteId: string }>;
};

export async function fetchDocumentMetadata(
  apiKey: string,
  documentId: string
): Promise<Record<string, string>> {
  const res = await pandaDocFetch(
    apiKey,
    `/public/v1/documents/${documentId}/details`
  );
  if (!res.ok) {
    throw new Error(`PandaDoc document lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as { metadata?: Record<string, string> };
  return data.metadata ?? {};
}

export async function attachCompletedReferral(
  config: AppConfig,
  args: {
    documentId: string;
    contactId: string;
    clientName?: string;
    createdDate?: string;
    version?: number;
  }
): Promise<{ fileId: string; noteId: string }> {
  const pdf = await downloadCompletedPdf(config.pandaDocApiKey, args.documentId);
  return attachPdfToContact(config.hubspotApiKey, {
    contactId: args.contactId,
    filename: hubspotAttachmentFilename(
      args.clientName ?? "",
      args.createdDate ?? createdDateLabel(),
      args.version
    ),
    bytes: pdf,
    note: `Signed ${REFERRAL_FORM_NAME}.`,
  });
}

export async function handlePandaDocCompleteRequest(
  req: HttpRequest,
  config: AppConfig,
  deps?: Partial<CompleteDeps>
): Promise<HttpResponse> {
  if (req.method && req.method !== "POST") {
    return { status: 405, json: { error: "Method not allowed" } };
  }

  const signature = signatureFromHeaders(req.headers);
  if (
    !verifyPandaDocSignature(config.pandaDocWebhookSecret, req.rawBody, signature)
  ) {
    return { status: 401, json: { error: "Unauthorized" } };
  }

  const getMetadata =
    deps?.getMetadata ??
    ((documentId: string) =>
      fetchDocumentMetadata(config.pandaDocApiKey, documentId));
  const attach =
    deps?.attach ??
    ((args) => attachCompletedReferral(config, args));

  try {
    const events = parseCompletedEvents(req.body);
    const attached: Array<{ documentId: string; contactId: string }> = [];
    for (const event of events) {
      let metadata = event.metadata;
      if (!isReferralMetadata(metadata)) {
        metadata = await getMetadata(event.documentId);
      }
      if (!isReferralMetadata(metadata)) {
        console.info("pandadoc_complete_skipped", {
          documentId: event.documentId,
          reason: "not_our_referral",
        });
        continue;
      }
      const contactId = metadata.hubspotContactId;
      const version = parseStoredVersion(metadata.version);
      await attach({
        documentId: event.documentId,
        contactId,
        clientName: metadata.clientName,
        createdDate: metadata.createdDate,
        ...(version ? { version } : {}),
      });
      attached.push({ documentId: event.documentId, contactId });
    }
    if (!attached.length) {
      return { status: 200, json: { ok: true, skipped: true, reason: "not_our_referral" } };
    }
    return { status: 200, json: { ok: true, attached } };
  } catch (e) {
    const message = (e as Error).message;
    console.error("pandadoc_complete_failed", { message });
    return { status: 502, json: { error: message } };
  }
}
