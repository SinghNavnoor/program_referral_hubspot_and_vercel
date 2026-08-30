/**
 * Organization-specific naming used in document titles, attachment filenames
 * and the HubSpot files folder. Override with ORG_SHORT_NAME so the pipeline
 * can be pointed at a different organization without code changes.
 */
export const ORG_SHORT_NAME = process.env.ORG_SHORT_NAME?.trim() || "Housing Org";

/** Title of the PandaDoc referral template, e.g. "Housing Org Referral Form". */
export const REFERRAL_FORM_NAME = `${ORG_SHORT_NAME} Referral Form`;

/** HubSpot Files folder that signed referral PDFs are uploaded into. */
export const REFERRAL_FOLDER_PATH = `/${ORG_SHORT_NAME} Referrals`;

/** Prefix used for signed referral attachment filenames. */
export const REFERRAL_FILENAME_PREFIX = `${ORG_SHORT_NAME} referral`;

/** PandaDoc recipient role that receives a completed copy of each referral. */
export const REFERRAL_COPY_ROLE = `${ORG_SHORT_NAME} Referral Email`;
