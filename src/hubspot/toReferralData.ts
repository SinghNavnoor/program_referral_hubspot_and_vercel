import { resolveAge } from "../age.js";
import { resolvePipelineLabel } from "../eligibility.js";
import type { Episode, ProgramReferralData } from "../pandadoc/fieldMap.js";
import type { HubSpotObject } from "./client.js";
import { resolveProgramOwner } from "./owners.js";

function prop(obj: HubSpotObject, name: string): string {
  return (obj.properties[name] ?? "").trim();
}

function splitMulti(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countOrZero(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export function householdSizeFromCounts(adults: string, children: string): string {
  if (!adults.trim() && !children.trim()) return "";
  return String(countOrZero(adults) + countOrZero(children));
}

export function toReferralData(
  program: HubSpotObject,
  contact: HubSpotObject | undefined,
  now: Date = new Date()
): ProgramReferralData {
  const fullName = prop(program, "hoh__program__first_name");
  const email = (contact && prop(contact, "email")) || "";
  const phone =
    (contact && (prop(contact, "phone") || prop(contact, "mobilephone"))) || "";
  const hmisId = (contact && prop(contact, "unique_id")) || "";
  const age =
    resolveAge(
      {
        ageCalculated: contact ? prop(contact, "age_calculated") : "",
        dateOfBirth: contact ? prop(contact, "real_data_of_birth") : "",
      },
      now
    ) ?? "";
  const householdSize = contact
    ? householdSizeFromCounts(prop(contact, "adults_n"), prop(contact, "child_n"))
    : "";

  const episodes: Episode[] = [
    ["ref_my_eoh", "ref_loc_n1"],
    ["ref_eof2", "ref_loc_n2"],
    ["ref_eof3", "ref_loc_n3"],
    ["ref_eof4", "ref_loc_n4"],
    ["ref_eof5", "ref_loc_n5"],
    ["ref_eof6", "ref_loc_n6"],
    ["ref_eof7", "ref_loc_n7"],
    ["ref_eof8", "ref_loc_n8"],
    ["ref_eof9", "ref_loc_n9"],
    ["ref_eof10", "ref_loc_n10"],
    ["ref_eof11", "ref_loc_n11"],
    ["ref_eof12", "ref_loc_n12"],
  ].map(([monthYearProp, locationProp]) => ({
    monthYear: prop(program, monthYearProp),
    locationType: prop(program, locationProp),
  }));

  const owner = resolveProgramOwner(prop(program, "hubspot_owner_id"));

  return {
    fullName,
    email,
    phone,
    hmisId,
    age,
    householdSize,
    referralDate: prop(program, "ref_date"),
    isTay: prop(program, "ref_tay"),
    referralType: prop(program, "ref_type"),
    referralSource: prop(program, "ref_source"),
    otherReferralSource: prop(program, "ref_sou_oth"),
    isHomeless: prop(program, "ref_ct_hl"),
    dateHomelessnessBegan: prop(program, "ref_dhb"),
    currentlyStaying: prop(program, "ref_wiccs"),
    entryDate: prop(program, "ref_ed"),
    anticipatedExitDate: prop(program, "ref_aed"),
    geographicArea: prop(program, "ref_wgacbs"),
    hasGovId: prop(program, "ref_dchid"),
    hasSsnCard: prop(program, "ref_ssc"),
    totalHouseholdIncome: prop(program, "ref_thhinc"),
    isEmployed: prop(program, "ref_ctemp"),
    sourceOfIncome: prop(program, "ref_soi"),
    incomeAmount: prop(program, "ref_amt"),
    hasCustody: prop(program, "ref_cust"),
    referringAgency: prop(program, "ref_agecy"),
    encounter: splitMulti(prop(program, "ref_hv_enc")),
    episodes,
    mostRecentDateInLocation: prop(program, "ref_hc_rl"),
    currentLocationType: prop(program, "ref_hv_hhr"),
    causeOfHomelessness: splitMulti(prop(program, "ref_hv_cchv")),
    completingFormName: owner?.name ?? "",
    completingFormEmail:
      prop(program, "case_manager_email") || owner?.email || "",
    oralStatementName: prop(program, "ref_oralstate"),
    pipelineLabel: resolvePipelineLabel(prop(program, "hs_pipeline")),
  };
}
