import { describe, expect, it } from "vitest";
import { toReferralData } from "../src/hubspot/toReferralData.js";
import type { HubSpotObject } from "../src/hubspot/client.js";

describe("toReferralData", () => {
  it("pulls contact household size, email, and computed age", () => {
    const program: HubSpotObject = {
      id: "p1",
      properties: {
        hoh__program__first_name: "Jane Doe",
        hs_pipeline: "100000001",
        ref_type: "Rapid Rehousing",
        ref_hv_enc:
          "As a representative of an emergency shelter program, I can confirm that the household was a program participant in the period(s) listed below.",
        ref_my_eoh: "01/2025",
        ref_loc_n1: "6. Emergency Shelter",
        ref_hv_cchv: "None of the above apply.",
      },
    };
    const contact: HubSpotObject = {
      id: "c1",
      properties: {
        email: "jane@example.com",
        phone: "555-0100",
        hhsize_n: "99",
        adults_n: "2",
        child_n: "2",
        age_calculated: "1999-02-01",
        real_data_of_birth: "1999-02-01",
        unique_id: "H-99",
      },
    };
    const data = toReferralData(program, contact, new Date("2026-08-17"));
    expect(data.email).toBe("jane@example.com");
    expect(data.householdSize).toBe("4");
    expect(data.age).toBe("27");
    expect(data.hmisId).toBe("H-99");
    expect(data.episodes[0]?.locationType).toBe("6. Emergency Shelter");
    expect(data.pipelineLabel).toBe("Rapid Rehousing");
  });

  it("resolves program owner name/email and oral-statement text", () => {
    const program: HubSpotObject = {
      id: "p1",
      properties: {
        hoh__program__first_name: "Jane Doe",
        hubspot_owner_id: "10000001",
        ref_oralstate: "Oral Witness",
      },
    };
    const data = toReferralData(program, undefined);
    expect(data.completingFormName).toBe("Alex Rivera");
    expect(data.completingFormEmail).toBe("arivera@example.org");
    expect(data.oralStatementName).toBe("Oral Witness");
  });

  it("prefers case_manager_email over the owner-derived email", () => {
    const program: HubSpotObject = {
      id: "p1",
      properties: {
        hoh__program__first_name: "Jane Doe",
        hubspot_owner_id: "10000001",
        case_manager_email: "schen@example.org",
      },
    };
    const data = toReferralData(program, undefined);
    expect(data.completingFormName).toBe("Alex Rivera");
    expect(data.completingFormEmail).toBe("schen@example.org");
  });

  it("reads homelessness episodes through slot 12", () => {
    const program: HubSpotObject = {
      id: "p1",
      properties: {
        hoh__program__first_name: "Jane Doe",
        ref_my_eoh: "01/2025",
        ref_loc_n1: "6. Emergency Shelter",
        ref_eof5: "05/2025",
        ref_loc_n5: "1. Unsheltered Location - Other than encampment",
        ref_eof12: "12/2025",
        ref_loc_n12: "7. Safe Haven",
      },
    };
    const data = toReferralData(program, undefined);
    expect(data.episodes[0]).toEqual({
      monthYear: "01/2025",
      locationType: "6. Emergency Shelter",
    });
    expect(data.episodes[4]).toEqual({
      monthYear: "05/2025",
      locationType: "1. Unsheltered Location - Other than encampment",
    });
    expect(data.episodes[11]).toEqual({
      monthYear: "12/2025",
      locationType: "7. Safe Haven",
    });
  });

  it("treats a missing adult or child count as zero", () => {
    const program: HubSpotObject = {
      id: "p1",
      properties: { hoh__program__first_name: "Jane Doe" },
    };
    const contact: HubSpotObject = {
      id: "c1",
      properties: { adults_n: "3", child_n: "" },
    };
    expect(toReferralData(program, contact).householdSize).toBe("3");
  });
});
