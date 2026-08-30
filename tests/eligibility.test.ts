import { describe, expect, it } from "vitest";
import {
  ELIGIBLE_PIPELINE_IDS,
  isEligiblePipeline,
  shouldRunReferral,
} from "../src/eligibility.js";

describe("isEligiblePipeline", () => {
  it("accepts each eligible pipeline by id or label", () => {
    expect(isEligiblePipeline("100000001")).toBe(true);
    expect(isEligiblePipeline("Rapid Rehousing")).toBe(true);
    expect(isEligiblePipeline("100000002")).toBe(true);
    expect(isEligiblePipeline("Youth Transitional Housing")).toBe(true);
    expect(isEligiblePipeline("100000003")).toBe(true);
    expect(isEligiblePipeline("Joint Component TH-RRH")).toBe(
      true
    );
  });

  it("rejects other program pipelines", () => {
    expect(isEligiblePipeline("Emergency Shelter")).toBe(false);
    expect(isEligiblePipeline("999999999")).toBe(false);
    expect(isEligiblePipeline("")).toBe(false);
  });
});

describe("shouldRunReferral", () => {
  it("runs when an eligible pipeline is in the Referral stage", () => {
    expect(
      shouldRunReferral({
        pipeline: "100000001",
        stage: "200000001",
        referralStatus: "",
      })
    ).toBe(true);
  });

  it("does not run based on Send Referral status alone", () => {
    expect(
      shouldRunReferral({
        pipeline: "Rapid Rehousing",
        stage: "",
        referralStatus: "Send Referral",
      })
    ).toBe(false);
  });

  it("does not run when status is already Referral Sent", () => {
    expect(
      shouldRunReferral({
        pipeline: "Rapid Rehousing",
        stage: "200000001",
        referralStatus: "Referral Sent",
      })
    ).toBe(false);
  });

  it("runs when status is Resend Referral", () => {
    expect(
      shouldRunReferral({
        pipeline: "Rapid Rehousing",
        stage: "200000001",
        referralStatus: "Resend Referral",
      })
    ).toBe(true);
  });

  it("does not run Send Referral on a non-PH pipeline", () => {
    expect(
      shouldRunReferral({
        pipeline: "Emergency Shelter",
        stage: "Referral",
        referralStatus: "Send Referral",
      })
    ).toBe(false);
  });
});

describe("eligible ids", () => {
  it("lists the three permanent housing pipelines", () => {
    expect(ELIGIBLE_PIPELINE_IDS.size).toBe(3);
  });
});
