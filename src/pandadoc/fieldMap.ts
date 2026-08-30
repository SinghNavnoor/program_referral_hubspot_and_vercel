import { ORG_SHORT_NAME, REFERRAL_FORM_NAME } from "../branding.js";
import { toPandaDocDate } from "../age.js";
import { splitClientName } from "../names.js";

export type Episode = {
  monthYear: string;
  locationType: string;
};

export type ProgramReferralData = {
  fullName: string;
  email: string;
  phone: string;
  hmisId: string;
  age: string;
  householdSize: string;
  referralDate?: string;
  isTay?: string;
  referralType?: string;
  referralSource?: string;
  otherReferralSource?: string;
  isHomeless?: string;
  dateHomelessnessBegan?: string;
  currentlyStaying?: string;
  entryDate?: string;
  anticipatedExitDate?: string;
  geographicArea?: string;
  hasGovId?: string;
  hasSsnCard?: string;
  totalHouseholdIncome?: string;
  isEmployed?: string;
  sourceOfIncome?: string;
  incomeAmount?: string;
  hasCustody?: string;
  referringAgency?: string;
  encounter: string[];
  episodes: Episode[];
  mostRecentDateInLocation?: string;
  currentLocationType?: string;
  causeOfHomelessness: string[];
  completingFormName?: string;
  completingFormEmail?: string;
  oralStatementName?: string;
  pipelineLabel?: string;
};

export type PandaDocPayload = {
  tokens: Array<{ name: string; value: string }>;
  fields: Record<string, { value: string | boolean }>;
};

const REFERRAL_TYPE_CHECKBOX: Record<string, string> = {
  "crisis housing": "Checkbox1",
  "tay housing": "Checkbox1_1",
  "rapid rehousing": "Checkbox1_1_1",
};

const ENCOUNTER_CHECKBOXES = [
  "Checkbox2",
  "Checkbox3",
  "Checkbox4",
  "Checkbox5",
  "Checkbox6",
  "Checkbox7",
] as const;

const ENCOUNTER_OPTIONS = [
  "As a representative of an emergency shelter program, I can confirm that the household was a program participant in the period(s) listed below.",
  "As a representative of a safe haven program, I can confirm that the household was a program participant in the period(s) listed below.",
  "As a representative of a non-profit organization or government agency, I can confirm that my agency paid for at least 51% of the cost for a hotel/motel stay in the period(s) listed below.",
  "In my professional capacity, the household reported that they residing in the location listed, and in my professional judgement I found this to be truthful.",
  "I observed the person/household sleeping in the evening/early morning hours or observed signs of encampment that made me believe they were living in this location in the period(s) listed below.",
  "Self Certification: I experienced homelessness in the period(s) and locations listed below.",
] as const;

const CAUSE_CHECKBOXES = [
  "checkbox353eb546-f318-4303-94bc-825135273063",
  "checkbox2bedf96c-d2ba-4795-9676-bfea98bf2638",
  "checkboxd971beb3-c585-4e16-9627-a148bed4c38f",
] as const;

const CAUSE_OPTIONS = [
  "Self Certification: I am experiencing trauma or a lack of safety related to, or fleeing or attempting to flee, domestic violence",
  "In my professional capacity, I can confirm that the participant: is experiencing trauma",
  "None of the above apply.",
] as const;

const EPISODE_MONTH_FIELDS = [
  "Text11",
  "Text12",
  "Text13",
  "Text14",
  "Text15_1",
  "Text17_1",
  "Text18_1",
  "Text19_1",
  "Text20_1",
  "Text21_1",
  "Text22_1",
  "Text16_1",
] as const;
const EPISODE_LOCATION_FIELDS = [
  "Dropdown2_1_1_1",
  "Dropdown2_1_1_1_1",
  "Dropdown2_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
  "Dropdown2_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1_1",
] as const;

function yn(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "yes" || v === "true") return "Yes";
  if (v === "no" || v === "false") return "No";
  return raw.trim();
}

function setIf(
  fields: Record<string, { value: string | boolean }>,
  id: string,
  value: string | boolean | undefined
) {
  if (value === undefined || value === "") return;
  fields[id] = { value };
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesOption(value: string, option: string): boolean {
  const a = normalize(value);
  const b = normalize(option);
  return a === b || a.includes(b) || b.includes(a);
}

const LOCATION_TYPE_OPTIONS = [
  "1. Unsheltered Location - Other than encampment",
  "2. Unsheltered Location - Encampment",
  "3. Housing/Building w/o running water, electricity",
  "4. Vehicle - Safe Parking Location",
  "5. Vehicle - Other Location",
  "6. Emergency Shelter",
  "7. Safe Haven",
  "8. Hotel/Motel (paid for by organization)",
  "9. RV/Camper w/o running water, electricity",
  "10. Undisclosed",
  "11. Jail",
  "12. Hospital",
  "13. Substance Use Treatment Facility/Rehab",
  "14. Transitional Housing Program",
  "15. House/Apartment - Renter",
  "16. Housing/Apartment - Owner",
  "17. Living with friend or family member",
] as const;

export function locationNumberFromType(locationType: string): string {
  const m = locationType.trim().match(/^(\d{1,2})\b/);
  return m?.[1] ?? locationType.trim();
}

export function mapLocationType(locationType: string | undefined): string | undefined {
  if (!locationType?.trim()) return undefined;
  const trimmed = locationType.trim();
  const exact = LOCATION_TYPE_OPTIONS.find((opt) => matchesOption(trimmed, opt));
  if (exact) return exact;
  const number = locationNumberFromType(trimmed);
  return (
    LOCATION_TYPE_OPTIONS.find((opt) => locationNumberFromType(opt) === number) ??
    trimmed
  );
}

export function createdDateLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

export function buildDocumentName(
  data: ProgramReferralData,
  now: Date = new Date(),
  version?: number
): string {
  const { firstName, lastName } = splitClientName(data.fullName);
  const client = `${firstName} ${lastName}`.trim();
  const pipeline = (data.pipelineLabel ?? "").trim();
  const parts = [
    REFERRAL_FORM_NAME,
    client,
    createdDateLabel(now),
    pipeline,
    version && version >= 2 ? `V${version}` : "",
  ].filter(Boolean);
  return parts.join(" - ");
}

export function buildPandaDocPayload(
  data: ProgramReferralData,
  now: Date = new Date()
): PandaDocPayload {
  const { firstName, lastName } = splitClientName(data.fullName);
  const caseManager = splitClientName(data.completingFormName ?? "");
  const created = createdDateLabel(now);

  const tokens = [
    { name: "Client.FirstName", value: firstName },
    { name: "Client.LastName", value: lastName },
    { name: "Client.Email", value: data.email ?? "" },
    { name: "Client.Phone", value: data.phone ?? "" },
    { name: "Contact.Email", value: data.email ?? "" },
    { name: "Contact.Phone", value: data.phone ?? "" },
    { name: "Contact.UniqueId", value: data.hmisId ?? "" },
    { name: "Contact.RealDataOfBirth", value: "" },
    { name: "Case Manager.FirstName", value: caseManager.firstName },
    { name: "Case Manager.LastName", value: caseManager.lastName },
    { name: "Case Manager.Email", value: data.completingFormEmail ?? "" },
    { name: "Document.CreatedDate", value: created },
  ];

  const fields: Record<string, { value: string | boolean }> = {};

  setIf(fields, "Date7", toPandaDocDate(data.referralDate));
  setIf(fields, "client_email", data.email);
  setIf(fields, "Client_Email", data.email);
  setIf(fields, "HMIS_ID", data.hmisId);
  setIf(fields, "Dropdown1", yn(data.isTay));
  setIf(fields, "Text9", data.age);
  setIf(fields, "Date2", toPandaDocDate(data.dateHomelessnessBegan));
  setIf(fields, "Date3_1", toPandaDocDate(data.anticipatedExitDate));
  setIf(fields, "Date3", toPandaDocDate(data.entryDate));
  setIf(fields, "Text1", data.referralSource || `${ORG_SHORT_NAME} Outreach`);
  setIf(fields, "Text1_1_1", data.otherReferralSource);
  setIf(fields, "Text2", data.currentlyStaying);
  setIf(fields, "Text3", data.geographicArea);
  setIf(fields, "Dropdown1_1_1_1", yn(data.isHomeless));
  setIf(fields, "Dropdown1_1_1_1_1", yn(data.hasGovId));
  setIf(fields, "Dropdown1_1_1", yn(data.hasSsnCard));
  setIf(fields, "Text4", data.totalHouseholdIncome);
  setIf(fields, "Text1_1", data.sourceOfIncome);
  setIf(fields, "Text4_1", data.incomeAmount);
  setIf(fields, "Dropdown1_1_1_1_1_1", yn(data.isEmployed));
  setIf(fields, "Dropdown1_1", yn(data.hasCustody));
  setIf(fields, "Text5", data.householdSize);
  setIf(fields, "Text8", data.completingFormEmail);
  setIf(fields, "case_manager_email", data.completingFormEmail);
  setIf(fields, "Text23", data.completingFormName);
  setIf(fields, "Text10", data.oralStatementName);

  fields.Checkbox1 = { value: false };
  fields.Checkbox1_1 = { value: false };
  fields.Checkbox1_1_1 = { value: false };
  const typeKey = normalize(data.referralType ?? "");
  const typeField = REFERRAL_TYPE_CHECKBOX[typeKey];
  if (typeField) fields[typeField] = { value: true };

  for (const id of ENCOUNTER_CHECKBOXES) fields[id] = { value: false };
  for (const selected of data.encounter) {
    const idx = ENCOUNTER_OPTIONS.findIndex((opt) =>
      matchesOption(selected, opt)
    );
    if (idx >= 0) fields[ENCOUNTER_CHECKBOXES[idx]!] = { value: true };
  }

  for (const id of CAUSE_CHECKBOXES) fields[id] = { value: false };
  for (const selected of data.causeOfHomelessness) {
    const idx = CAUSE_OPTIONS.findIndex((opt) => matchesOption(selected, opt));
    if (idx >= 0) fields[CAUSE_CHECKBOXES[idx]!] = { value: true };
  }

  const episodes = data.episodes.slice(0, EPISODE_MONTH_FIELDS.length);
  for (let i = 0; i < EPISODE_MONTH_FIELDS.length; i++) {
    const ep = episodes[i];
    if (!ep) continue;
    setIf(fields, EPISODE_MONTH_FIELDS[i]!, ep.monthYear);
    setIf(
      fields,
      EPISODE_LOCATION_FIELDS[i]!,
      locationNumberFromType(ep.locationType)
    );
  }

  setIf(fields, "Date5", toPandaDocDate(data.mostRecentDateInLocation));
  setIf(
    fields,
    "dropdownc46ee6dc-df1b-41ec-9357-a6a28a385d7e",
    mapLocationType(data.currentLocationType)
  );

  return { tokens, fields };
}
