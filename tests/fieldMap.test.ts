import { describe, expect, it } from "vitest";
import {
  buildDocumentName,
  buildPandaDocPayload,
  locationNumberFromType,
  type ProgramReferralData,
} from "../src/pandadoc/fieldMap.js";

function sample(overrides: Partial<ProgramReferralData> = {}): ProgramReferralData {
  return {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "555-0100",
    hmisId: "HMIS-1",
    age: "26",
    householdSize: "3",
    referralDate: "2026-08-17",
    isTay: "Yes",
    referralType: "Rapid Rehousing",
    referralSource: "Housing Org Outreach",
    otherReferralSource: "",
    isHomeless: "Yes",
    dateHomelessnessBegan: "2025-01-01",
    currentlyStaying: "Shelter",
    entryDate: "2026-07-01",
    anticipatedExitDate: "2027-07-01",
    geographicArea: "Central District",
    hasGovId: "Yes",
    hasSsnCard: "No",
    totalHouseholdIncome: "1200",
    isEmployed: "No",
    sourceOfIncome: "GR",
    incomeAmount: "221",
    hasCustody: "Yes",
    referringAgency: "Housing Org",
    encounter: [
      "As a representative of an emergency shelter program, I can confirm that the household was a program participant in the period(s) listed below.",
    ],
    episodes: [
      {
        monthYear: "01/2025",
        locationType: "6. Emergency Shelter",
      },
      {
        monthYear: "02/2025",
        locationType: "2. Unsheltered location - Encampment",
      },
    ],
    mostRecentDateInLocation: "2026-08-10",
    currentLocationType: "6. Emergency Shelter",
    causeOfHomelessness: ["None of the above apply."],
    pipelineLabel: "Rapid Rehousing",
    ...overrides,
  };
}

describe("locationNumberFromType", () => {
  it("pulls the leading number from a HubSpot location option", () => {
    expect(locationNumberFromType("6. Emergency Shelter")).toBe("6");
    expect(
      locationNumberFromType("17. Living with friend or family member")
    ).toBe("17");
    expect(
      locationNumberFromType("8. Hotel/Motel (paid for by organization)")
    ).toBe("8");
  });
});

describe("buildPandaDocPayload", () => {
  it("sets name tokens from the HOH full name", () => {
    const { tokens } = buildPandaDocPayload(sample());
    expect(tokens.find((t) => t.name === "Client.FirstName")?.value).toBe(
      "Jane"
    );
    expect(tokens.find((t) => t.name === "Client.LastName")?.value).toBe("Doe");
    expect(tokens.find((t) => t.name === "Client.Email")?.value).toBe(
      "jane@example.com"
    );
    expect(tokens.find((t) => t.name === "Contact.UniqueId")?.value).toBe(
      "HMIS-1"
    );
  });

  it("checks exactly one referral-type box", () => {
    const { fields } = buildPandaDocPayload(sample());
    expect(fields.Checkbox1?.value).toBe(false);
    expect(fields.Checkbox1_1?.value).toBe(false);
    expect(fields.Checkbox1_1_1?.value).toBe(true);
  });

  it("fills the first four episode month/year texts and location dropdowns", () => {
    const { fields } = buildPandaDocPayload(
      sample({
        episodes: [
          { monthYear: "01/2025", locationType: "6. Emergency Shelter" },
          { monthYear: "02/2025", locationType: "2. Unsheltered location - Encampment" },
          { monthYear: "03/2025", locationType: "11. Jail" },
          { monthYear: "04/2025", locationType: "12. Hospital" },
        ],
      })
    );
    expect(fields.Text11?.value).toBe("01/2025");
    expect(fields.Text12?.value).toBe("02/2025");
    expect(fields.Text13?.value).toBe("03/2025");
    expect(fields.Text14?.value).toBe("04/2025");
    expect(fields.Dropdown2_1_1_1?.value).toBe("6");
    expect(fields.Dropdown2_1_1_1_1?.value).toBe("2");
    expect(fields.Dropdown2_1_1_1_1_1?.value).toBe("11");
    expect(fields["Dropdown2_1_1_1_1_1_1_1"]?.value).toBe("12");
  });

  it("fills episode month/year texts and location dropdowns through slot 12", () => {
    const { fields } = buildPandaDocPayload(
      sample({
        episodes: [
          { monthYear: "01/2025", locationType: "6. Emergency Shelter" },
          { monthYear: "02/2025", locationType: "2. Unsheltered Location - Encampment" },
          { monthYear: "03/2025", locationType: "11. Jail" },
          { monthYear: "04/2025", locationType: "12. Hospital" },
          { monthYear: "05/2025", locationType: "1. Unsheltered Location - Other than encampment" },
          { monthYear: "06/2025", locationType: "4. Vehicle - Safe Parking Location" },
          { monthYear: "07/2025", locationType: "8. Hotel/Motel (paid for by organization)" },
          { monthYear: "08/2025", locationType: "14. Transitional Housing Program" },
          { monthYear: "09/2025", locationType: "15. House/Apartment - Renter" },
          { monthYear: "10/2025", locationType: "16. Housing/Apartment - Owner" },
          { monthYear: "11/2025", locationType: "17. Living with friend or family member" },
          { monthYear: "12/2025", locationType: "7. Safe Haven" },
        ],
      })
    );
    expect(fields.Text15_1?.value).toBe("05/2025");
    expect(fields.Text17_1?.value).toBe("06/2025");
    expect(fields.Text18_1?.value).toBe("07/2025");
    expect(fields.Text19_1?.value).toBe("08/2025");
    expect(fields.Text20_1?.value).toBe("09/2025");
    expect(fields.Text21_1?.value).toBe("10/2025");
    expect(fields.Text22_1?.value).toBe("11/2025");
    expect(fields.Text16_1?.value).toBe("12/2025");
    expect(
      fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value
    ).toBe("1");
    expect(fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value).toBe("4");
    expect(
      fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value
    ).toBe("8");
    expect(fields.Dropdown2_1?.value).toBe("14");
    expect(fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value).toBe("15");
    expect(
      fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value
    ).toBe("16");
    expect(fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value).toBe(
      "17"
    );
    expect(fields["Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1"]?.value).toBe("7");
  });

  it("maps Yes/No HubSpot selects onto TAY and homeless dropdowns", () => {
    const { fields } = buildPandaDocPayload(sample());
    expect(fields.Dropdown1?.value).toBe("Yes");
    expect(fields.Text9?.value).toBe("26");
    expect(fields.Text5?.value).toBe("3");
  });

  it("fills the new HMIS_ID and client_email merge fields", () => {
    const { fields } = buildPandaDocPayload(sample());
    expect(fields.HMIS_ID?.value).toBe("HMIS-1");
    expect(fields.client_email?.value).toBe("jane@example.com");
  });

  it("appends created date and pipeline to the document title", () => {
    expect(
      buildDocumentName(sample(), new Date("2026-08-17T20:00:00-07:00"))
    ).toBe("Housing Org Referral Form - Jane Doe - 08/17/2026 - Rapid Rehousing");
  });

  it("appends V2 at the end of a resent document title", () => {
    expect(
      buildDocumentName(sample(), new Date("2026-08-17T20:00:00-07:00"), 2)
    ).toBe("Housing Org Referral Form - Jane Doe - 08/17/2026 - Rapid Rehousing - V2");
  });

  it("fills owner name, owner email, and oral-statement fields", () => {
    const { tokens, fields } = buildPandaDocPayload(
      sample({
        completingFormName: "Alex Rivera",
        completingFormEmail: "arivera@example.org",
        oralStatementName: "Jane Doe",
      })
    );
    expect(fields.Text23?.value).toBe("Alex Rivera");
    expect(fields.Text8?.value).toBe("arivera@example.org");
    expect(fields.Text10?.value).toBe("Jane Doe");
    expect(tokens.find((t) => t.name === "Case Manager.FirstName")?.value).toBe(
      "Alex"
    );
    expect(tokens.find((t) => t.name === "Case Manager.LastName")?.value).toBe(
      "Rivera"
    );
    expect(tokens.find((t) => t.name === "Case Manager.Email")?.value).toBe(
      "arivera@example.org"
    );
    expect(fields.case_manager_email?.value).toBe("arivera@example.org");
  });

  it("maps cause-of-homelessness HubSpot options onto the three PandaDoc checkboxes", () => {
    const self = "Self Certification: I am experiencing trauma or a lack of safety related to, or fleeing or attempting to flee, domestic violence";
    const professional =
      "In my professional capacity, I can confirm that the participant: is experiencing trauma";
    const none = "None of the above";

    const selfFields = buildPandaDocPayload(sample({ causeOfHomelessness: [self] })).fields;
    expect(selfFields["checkbox353eb546-f318-4303-94bc-825135273063"]?.value).toBe(true);
    expect(selfFields["checkbox2bedf96c-d2ba-4795-9676-bfea98bf2638"]?.value).toBe(false);
    expect(selfFields["checkboxd971beb3-c585-4e16-9627-a148bed4c38f"]?.value).toBe(false);

    const proFields = buildPandaDocPayload(
      sample({ causeOfHomelessness: [professional] })
    ).fields;
    expect(proFields["checkbox2bedf96c-d2ba-4795-9676-bfea98bf2638"]?.value).toBe(true);
    expect(proFields["checkbox353eb546-f318-4303-94bc-825135273063"]?.value).toBe(false);
    expect(proFields["checkboxd971beb3-c585-4e16-9627-a148bed4c38f"]?.value).toBe(false);

    const noneFields = buildPandaDocPayload(sample({ causeOfHomelessness: [none] })).fields;
    expect(noneFields["checkboxd971beb3-c585-4e16-9627-a148bed4c38f"]?.value).toBe(true);
    expect(noneFields["checkbox353eb546-f318-4303-94bc-825135273063"]?.value).toBe(false);
    expect(noneFields["checkbox2bedf96c-d2ba-4795-9676-bfea98bf2638"]?.value).toBe(false);
  });

  it("maps HubSpot location options onto the matching PandaDoc 3A dropdown labels", () => {
    const exact = buildPandaDocPayload(
      sample({ currentLocationType: "6. Emergency Shelter" })
    ).fields;
    expect(exact["dropdownc46ee6dc-df1b-41ec-9357-a6a28a385d7e"]?.value).toBe(
      "6. Emergency Shelter"
    );

    const byNumber = buildPandaDocPayload(
      sample({ currentLocationType: "2. Unsheltered location - Encampment" })
    ).fields;
    expect(byNumber["dropdownc46ee6dc-df1b-41ec-9357-a6a28a385d7e"]?.value).toBe(
      "2. Unsheltered Location - Encampment"
    );

    const last = buildPandaDocPayload(
      sample({
        currentLocationType: "17. Living with friend or family member",
      })
    ).fields;
    expect(last["dropdownc46ee6dc-df1b-41ec-9357-a6a28a385d7e"]?.value).toBe(
      "17. Living with friend or family member"
    );
  });
});
