import { describe, expect, it } from "vitest";
import { buildReferralRecipients } from "../src/pandadoc/send.js";

describe("buildReferralRecipients", () => {
  it("makes the case manager the only signer and CCs the completed-copy inboxes", () => {
    const recipients = buildReferralRecipients({
      toEmail: "arivera@example.org",
      notifyEmail: "referrals@example.org",
      caseManagerName: "Sam Chen",
      caseManagerEmail: "schen@example.org",
    });
    expect(recipients).toEqual([
      {
        email: "schen@example.org",
        first_name: "Sam",
        last_name: "Chen",
        role: "Case Manager",
      },
      {
        email: "referrals@example.org",
        first_name: "Housing Org",
        last_name: "Referrals",
        role: "Housing Org Referral Email",
      },
      {
        email: "arivera@example.org",
        first_name: "Housing Org",
        last_name: "Copy",
      },
    ]);
    expect(recipients.some((r) => r.role === "Client")).toBe(false);
  });

  it("does not add a duplicate copy when the case manager is already one of the inboxes", () => {
    const recipients = buildReferralRecipients({
      toEmail: "arivera@example.org",
      notifyEmail: "referrals@example.org",
      caseManagerName: "Alex Rivera",
      caseManagerEmail: "arivera@example.org",
    });
    expect(recipients.map((r) => `${r.role ?? "cc"}:${r.email}`)).toEqual([
      "Case Manager:arivera@example.org",
      "Housing Org Referral Email:referrals@example.org",
    ]);
  });

  it("falls back to the to-address as case manager when owner email is missing", () => {
    const recipients = buildReferralRecipients({
      toEmail: "arivera@example.org",
      notifyEmail: "referrals@example.org",
      caseManagerName: "",
      caseManagerEmail: "",
    });
    expect(recipients[0]).toEqual({
      email: "arivera@example.org",
      first_name: "Case",
      last_name: "Manager",
      role: "Case Manager",
    });
  });
});
