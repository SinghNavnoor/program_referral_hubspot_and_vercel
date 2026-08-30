import type { AppConfig } from "./config.js";
import { parseProgramId, verifyWebhookSecret } from "./auth.js";
import { runReferralPipeline } from "./pipeline.js";

export type HttpRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
};

export type HttpResponse = {
  status: number;
  json: Record<string, unknown>;
};

export async function handleReferralRequest(
  req: HttpRequest,
  config: AppConfig
): Promise<HttpResponse> {
  if (req.method && req.method !== "POST") {
    return { status: 405, json: { error: "Method not allowed" } };
  }

  if (!verifyWebhookSecret(req.headers["x-webhook-secret"], config.webhookSecret)) {
    return { status: 401, json: { error: "Unauthorized" } };
  }

  try {
    const programId = parseProgramId(req.body);
    const result = await runReferralPipeline(config, programId);
    return { status: 200, json: result };
  } catch (e) {
    const message = (e as Error).message;
    const status = /missing programId|Invalid payload/i.test(message)
      ? 400
      : /no matching|could not find|missing HOH/i.test(message)
        ? 422
        : 502;
    console.error("referral_failed", { message });
    return { status, json: { error: message } };
  }
}
