import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  REFERRAL_SOURCE,
  buildReferralMetadata,
  isReferralMetadata,
  parseCompletedDocumentIds,
  parseCompletedEvents,
  verifyPandaDocSignature,
} from "../src/pandadoc/complete.js";
import { handlePandaDocCompleteRequest } from "../src/completeHandler.js";
import type { AppConfig } from "../src/config.js";

const config: AppConfig = {
  webhookSecret: "secret",
  hubspotApiKey: "hs",
  pandaDocApiKey: "pd",
  pandaDocTemplateId: "tpl",
  referralToEmail: "arivera@example.org",
  referralNotifyEmail: "referrals@example.org",
  pandaDocWebhookSecret: "pd-hook",
};

describe("buildReferralMetadata", () => {
  it("stores contact id, client name, and created date for the HubSpot file name", () => {
    expect(
      buildReferralMetadata("c1", {
        clientName: "Test Jack",
        createdDate: "08/19/2026",
      })
    ).toEqual({
      source: REFERRAL_SOURCE,
      hubspotContactId: "c1",
      clientName: "Test Jack",
      createdDate: "08/19/2026",
    });
  });

  it("stores the resend version for the HubSpot file name", () => {
    expect(
      buildReferralMetadata("c1", {
        clientName: "Test Jack",
        createdDate: "08/19/2026",
        version: "2",
      })
    ).toEqual({
      source: REFERRAL_SOURCE,
      hubspotContactId: "c1",
      clientName: "Test Jack",
      createdDate: "08/19/2026",
      version: "2",
    });
  });
});

describe("isReferralMetadata", () => {
  it("accepts only our permanent-housing referral source", () => {
    expect(isReferralMetadata({ source: REFERRAL_SOURCE, hubspotContactId: "c1" })).toBe(
      true
    );
    expect(isReferralMetadata({ source: "consent-packet", hubspotContactId: "c1" })).toBe(
      false
    );
    expect(isReferralMetadata({})).toBe(false);
  });
});

describe("parseCompletedDocumentIds", () => {
  it("keeps completed referral events and ignores other PandaDoc docs", () => {
    const ids = parseCompletedDocumentIds([
      {
        event: "document_completed_pdf_ready",
        data: { id: "ref-doc", status: "document.completed" },
      },
      {
        event: "document_state_changed",
        data: { id: "consent-doc", status: "document.draft" },
      },
    ]);
    expect(ids).toEqual(["ref-doc"]);
  });

  it("reads hubspot contact metadata from the completed-PDF webhook payload", () => {
    const events = parseCompletedEvents([
      {
        event: "document_completed_pdf_ready",
        data: {
          id: "ref-doc",
          status: "document.completed",
          metadata: {
            source: REFERRAL_SOURCE,
            hubspotContactId: "c1",
          },
        },
      },
    ]);
    expect(events).toEqual([
      {
        documentId: "ref-doc",
        metadata: { source: REFERRAL_SOURCE, hubspotContactId: "c1" },
      },
    ]);
  });
});

describe("verifyPandaDocSignature", () => {
  it("accepts an HMAC of the raw body", () => {
    const raw = '[{"event":"document_completed_pdf_ready"}]';
    const signature = createHmac("sha256", "pd-hook").update(raw).digest("hex");
    expect(verifyPandaDocSignature("pd-hook", raw, signature)).toBe(true);
    expect(verifyPandaDocSignature("pd-hook", raw, "nope")).toBe(false);
  });
});

describe("handlePandaDocCompleteRequest", () => {
  it("rejects a bad signature", async () => {
    const res = await handlePandaDocCompleteRequest(
      {
        method: "POST",
        headers: { signature: "bad" },
        rawBody: "[]",
        body: [],
      },
      config
    );
    expect(res.status).toBe(401);
  });

  it("skips non-referral documents and attaches ours to the contact", async () => {
    const raw = JSON.stringify([
      {
        event: "document_completed_pdf_ready",
        data: { id: "doc-1", status: "document.completed" },
      },
    ]);
    const signature = createHmac("sha256", "pd-hook").update(raw).digest("hex");
    const getMetadata = vi.fn(async () => ({
      source: REFERRAL_SOURCE,
      hubspotContactId: "c1",
      clientName: "Test Jack",
      createdDate: "08/19/2026",
    }));
    const attach = vi.fn(async () => ({ fileId: "f1", noteId: "n1" }));

    const res = await handlePandaDocCompleteRequest(
      {
        method: "POST",
        headers: { signature },
        rawBody: raw,
        body: JSON.parse(raw),
      },
      config,
      { getMetadata, attach }
    );
    expect(res.status).toBe(200);
    expect(attach).toHaveBeenCalledWith({
      documentId: "doc-1",
      contactId: "c1",
      clientName: "Test Jack",
      createdDate: "08/19/2026",
    });
  });

  it("attaches using webhook metadata even when document status has none", async () => {
    const raw = JSON.stringify([
      {
        event: "document_completed_pdf_ready",
        data: {
          id: "doc-1",
          status: "document.completed",
          metadata: {
            source: REFERRAL_SOURCE,
            hubspotContactId: "c1",
            clientName: "Test Jack",
            createdDate: "08/19/2026",
            version: "2",
          },
        },
      },
    ]);
    const signature = createHmac("sha256", "pd-hook").update(raw).digest("hex");
    const getMetadata = vi.fn(async () => ({}));
    const attach = vi.fn(async () => ({ fileId: "f1", noteId: "n1" }));

    const res = await handlePandaDocCompleteRequest(
      {
        method: "POST",
        headers: { signature },
        rawBody: raw,
        body: JSON.parse(raw),
      },
      config,
      { getMetadata, attach }
    );
    expect(res.status).toBe(200);
    expect(res.json.skipped).toBeUndefined();
    expect(attach).toHaveBeenCalledWith({
      documentId: "doc-1",
      contactId: "c1",
      clientName: "Test Jack",
      createdDate: "08/19/2026",
      version: 2,
    });
    expect(getMetadata).not.toHaveBeenCalled();
  });

  it("does not attach a completed consent packet", async () => {
    const raw = JSON.stringify([
      {
        event: "document_completed_pdf_ready",
        data: { id: "consent", status: "document.completed" },
      },
    ]);
    const signature = createHmac("sha256", "pd-hook").update(raw).digest("hex");
    const getMetadata = vi.fn(async () => ({ source: "consent-packet" }));
    const attach = vi.fn();

    const res = await handlePandaDocCompleteRequest(
      {
        method: "POST",
        headers: { signature },
        rawBody: raw,
        body: JSON.parse(raw),
      },
      config,
      { getMetadata, attach }
    );
    expect(res.status).toBe(200);
    expect(res.json.skipped).toBe(true);
    expect(attach).not.toHaveBeenCalled();
  });
});
