export const REFERRAL_SENT = "Referral Sent";
export const RESEND_REFERRAL = "Resend Referral";

/**
 * HubSpot Program (Tickets) pipeline id → label.
 *
 * SAMPLE IDS. Real pipeline and stage ids are deployment-specific and are not
 * published here. Replace them with the ids from your own HubSpot portal
 * (Settings → Objects → Tickets → Pipelines) before deploying.
 */
export const PIPELINE_ID_TO_LABEL: Record<string, string> = {
  "100000001": "Rapid Rehousing",
  "100000002": "Youth Transitional Housing",
  "100000003": "Joint Component TH-RRH",
};

/** Ticket stage id for "Referral" on each permanent housing pipeline. */
export const REFERRAL_STAGE_IDS = new Set([
  "200000001",
  "200000002",
  "200000003",
]);

export const ELIGIBLE_PIPELINE_IDS = new Set(Object.keys(PIPELINE_ID_TO_LABEL));

const ELIGIBLE_LABELS = new Set(
  Object.values(PIPELINE_ID_TO_LABEL).map(normalize)
);

export function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolvePipelineLabel(pipelineIdOrLabel: string): string {
  const raw = pipelineIdOrLabel.trim();
  return PIPELINE_ID_TO_LABEL[raw] ?? raw;
}

export function isEligiblePipeline(pipelineIdOrLabel: string): boolean {
  const raw = pipelineIdOrLabel.trim();
  if (!raw) return false;
  if (ELIGIBLE_PIPELINE_IDS.has(raw)) return true;
  return ELIGIBLE_LABELS.has(normalize(resolvePipelineLabel(raw)));
}

export function isReferralStage(stageIdOrLabel: string): boolean {
  const raw = stageIdOrLabel.trim();
  if (!raw) return false;
  if (REFERRAL_STAGE_IDS.has(raw)) return true;
  return normalize(raw) === "referral";
}

export function isResendReferral(status: string): boolean {
  return normalize(status) === normalize(RESEND_REFERRAL);
}

export function shouldRunReferral(args: {
  pipeline: string;
  stage?: string;
  referralStatus: string;
}): boolean {
  if (!isEligiblePipeline(args.pipeline)) return false;
  if (args.referralStatus.trim() === REFERRAL_SENT) return false;
  return isReferralStage(args.stage ?? "");
}
