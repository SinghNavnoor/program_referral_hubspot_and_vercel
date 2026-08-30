import { describe, expect, it } from "vitest";
import { nextResendVersion, parseReferralVersion } from "../src/referralVersion.js";

describe("parseReferralVersion", () => {
  it("treats the first untitled referral file as version 1", () => {
    expect(
      parseReferralVersion("Housing Org referral – Jane Doe – 08/19/2026.pdf")
    ).toBe(1);
  });

  it("reads an explicit V2 / V3 suffix", () => {
    expect(
      parseReferralVersion("Housing Org referral – Jane Doe – 08/19/2026 – V2.pdf")
    ).toBe(2);
    expect(
      parseReferralVersion(
        "Housing Org Referral Form - Jane Doe - 08/19/2026 - Rapid Rehousing - V3"
      )
    ).toBe(3);
  });
});

describe("nextResendVersion", () => {
  it("starts at V2 when nothing has been attached yet", () => {
    expect(nextResendVersion([])).toBe(2);
  });

  it("uses V2 after the first unversioned referral", () => {
    expect(
      nextResendVersion(["Housing Org referral – Jane Doe – 08/19/2026.pdf"])
    ).toBe(2);
  });

  it("increments past the highest existing version", () => {
    expect(
      nextResendVersion([
        "Housing Org referral – Jane Doe – 08/19/2026.pdf",
        "Housing Org referral – Jane Doe – 08/20/2026 – V2.pdf",
      ])
    ).toBe(3);
  });
});
