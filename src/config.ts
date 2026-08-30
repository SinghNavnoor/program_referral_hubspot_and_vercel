export type AppConfig = {
  webhookSecret: string;
  hubspotApiKey: string;
  pandaDocApiKey: string;
  pandaDocTemplateId: string;
  referralToEmail: string;
  referralNotifyEmail: string;
  pandaDocWebhookSecret: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = [
    "WEBHOOK_SECRET",
    "HUBSPOT_API_KEY",
    "PANDADOC_API_KEY",
    "PANDADOC_TEMPLATE_ID",
    "REFERRAL_TO_EMAIL",
    "REFERRAL_NOTIFY_EMAIL",
  ] as const;
  for (const key of required) {
    if (!env[key]?.trim()) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  return {
    webhookSecret: env.WEBHOOK_SECRET!,
    hubspotApiKey: env.HUBSPOT_API_KEY!,
    pandaDocApiKey: env.PANDADOC_API_KEY!,
    pandaDocTemplateId: env.PANDADOC_TEMPLATE_ID!,
    referralToEmail: env.REFERRAL_TO_EMAIL!,
    referralNotifyEmail: env.REFERRAL_NOTIFY_EMAIL!,
    pandaDocWebhookSecret: env.PANDADOC_WEBHOOK_SECRET?.trim() || "",
  };
}
