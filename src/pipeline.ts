import type { AppConfig } from "./config.js";
import { REFERRAL_SENT, isResendReferral, shouldRunReferral } from "./eligibility.js";
import { HubSpotClient } from "./hubspot/client.js";
import { toReferralData } from "./hubspot/toReferralData.js";
import { createAndSendReferral } from "./pandadoc/send.js";
import { nextResendVersion } from "./referralVersion.js";

export type PipelineDeps = {
  hubspot: HubSpotClient;
  sendReferral: typeof createAndSendReferral;
};

export async function runReferralPipeline(
  config: AppConfig,
  programId: string,
  deps?: Partial<PipelineDeps>
) {
  const hubspot = deps?.hubspot ?? new HubSpotClient(config.hubspotApiKey);
  const sendReferral = deps?.sendReferral ?? createAndSendReferral;

  const program = await hubspot.getProgram(programId);
  const pipeline = program.properties.hs_pipeline ?? "";
  const stage = program.properties.hs_pipeline_stage ?? "";
  const referralStatus = program.properties.ref_status ?? "";

  if (
    !shouldRunReferral({
      pipeline,
      stage,
      referralStatus,
    })
  ) {
    return {
      ok: true,
      skipped: true,
      reason: "not_eligible",
      programId,
      pipeline,
      stage,
      referralStatus,
    };
  }

  const fullName = (program.properties.hoh__program__first_name ?? "").trim();
  if (!fullName) {
    throw new Error("Program is missing HOH - Full Name");
  }

  const contact = await hubspot.searchContactByName(fullName);
  const data = toReferralData(program, contact);
  if (!data.fullName) {
    throw new Error("Could not build referral data from Program + Contact");
  }

  let documentVersion: number | undefined;
  if (isResendReferral(referralStatus)) {
    const existing = contact?.id
      ? await hubspot.listReferralFilenames(fullName)
      : [];
    documentVersion = nextResendVersion(existing);
  }

  const sent = await sendReferral({
    apiKey: config.pandaDocApiKey,
    templateUuid: config.pandaDocTemplateId,
    toEmail: config.referralToEmail,
    notifyEmail: config.referralNotifyEmail,
    hubspotContactId: contact?.id,
    documentVersion,
    data,
  });

  await hubspot.updateReferralStatus(programId, REFERRAL_SENT);

  return {
    ok: true,
    skipped: false,
    programId,
    contactId: contact?.id,
    sentDocumentId: sent.sentDocumentId,
    clientName: fullName,
  };
}
