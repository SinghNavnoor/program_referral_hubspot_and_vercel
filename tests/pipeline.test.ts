import { describe, expect, it, vi } from "vitest";
import { runReferralPipeline } from "../src/pipeline.js";
import type { AppConfig } from "../src/config.js";
import type { HubSpotClient } from "../src/hubspot/client.js";

const config: AppConfig = {
  webhookSecret: "secret",
  hubspotApiKey: "hs",
  pandaDocApiKey: "pd",
  pandaDocTemplateId: "tpl",
  referralToEmail: "arivera@example.org",
  referralNotifyEmail: "referrals@example.org",
  pandaDocWebhookSecret: "pd-hook",
};

function programProps(overrides: Record<string, string | null> = {}) {
  return {
    id: "111",
    properties: {
      hs_pipeline: "100000001",
      hs_pipeline_stage: "200000001",
      ref_status: "",
      hoh__program__first_name: "Jane Doe",
      ref_type: "Rapid Rehousing",
      ...overrides,
    },
  };
}

describe("runReferralPipeline", () => {
  it("skips when status is already Referral Sent", async () => {
    const hubspot = {
      getProgram: vi.fn(async () =>
        programProps({ ref_status: "Referral Sent" })
      ),
      searchContactByName: vi.fn(),
      updateReferralStatus: vi.fn(),
    } as unknown as HubSpotClient;
    const sendReferral = vi.fn();

    const result = await runReferralPipeline(config, "111", {
      hubspot,
      sendReferral,
    });
    expect(result.skipped).toBe(true);
    expect(sendReferral).not.toHaveBeenCalled();
    expect(hubspot.updateReferralStatus).not.toHaveBeenCalled();
  });

  it("sends the form and sets Referral Sent", async () => {
    const hubspot = {
      getProgram: vi.fn(async () => programProps()),
      searchContactByName: vi.fn(async () => ({
        id: "c1",
        properties: {
          email: "jane@example.com",
          hhsize_n: "3",
          age_calculated: "24",
          real_data_of_birth: "",
          unique_id: "H1",
          phone: "555",
        },
      })),
      updateReferralStatus: vi.fn(async () => undefined),
    } as unknown as HubSpotClient;
    const sendReferral = vi.fn(async () => ({ sentDocumentId: "doc-1" }));

    const result = await runReferralPipeline(config, "111", {
      hubspot,
      sendReferral,
    });
    expect(result.skipped).toBe(false);
    expect(result).toMatchObject({ sentDocumentId: "doc-1", contactId: "c1" });
    expect(hubspot.updateReferralStatus).toHaveBeenCalledWith(
      "111",
      "Referral Sent"
    );
    expect(sendReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        hubspotContactId: "c1",
        data: expect.objectContaining({ pipelineLabel: "Rapid Rehousing" }),
      })
    );
  });

  it("resends with V2 and sets status back to Referral Sent", async () => {
    const hubspot = {
      getProgram: vi.fn(async () =>
        programProps({ ref_status: "Resend Referral" })
      ),
      searchContactByName: vi.fn(async () => ({
        id: "c1",
        properties: {
          email: "jane@example.com",
          hhsize_n: "3",
          age_calculated: "24",
          real_data_of_birth: "",
          unique_id: "H1",
          phone: "555",
        },
      })),
      listReferralFilenames: vi.fn(async () => [
        "Housing Org referral – Jane Doe – 08/19/2026.pdf",
      ]),
      updateReferralStatus: vi.fn(async () => undefined),
    } as unknown as HubSpotClient;
    const sendReferral = vi.fn(async () => ({ sentDocumentId: "doc-2" }));

    const result = await runReferralPipeline(config, "111", {
      hubspot,
      sendReferral,
    });
    expect(result.skipped).toBe(false);
    expect(sendReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        documentVersion: 2,
        hubspotContactId: "c1",
      })
    );
    expect(hubspot.updateReferralStatus).toHaveBeenCalledWith(
      "111",
      "Referral Sent"
    );
  });
});
