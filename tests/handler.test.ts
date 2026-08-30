import { describe, expect, it } from "vitest";
import { handleReferralRequest } from "../src/handler.js";
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

describe("handleReferralRequest", () => {
  it("rejects missing webhook secret", async () => {
    const res = await handleReferralRequest(
      { method: "POST", headers: {}, body: { programId: "1" } },
      config
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-POST", async () => {
    const res = await handleReferralRequest(
      {
        method: "GET",
        headers: { "x-webhook-secret": "secret" },
        body: {},
      },
      config
    );
    expect(res.status).toBe(405);
  });

  it("rejects missing programId", async () => {
    const res = await handleReferralRequest(
      {
        method: "POST",
        headers: { "x-webhook-secret": "secret" },
        body: {},
      },
      config
    );
    expect(res.status).toBe(400);
    expect(String(res.json.error)).toMatch(/programId/);
  });
});
