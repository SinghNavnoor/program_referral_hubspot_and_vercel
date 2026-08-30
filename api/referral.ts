import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadConfig } from "../src/config.js";
import { handleReferralRequest } from "../src/handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }

  const result = await handleReferralRequest(
    {
      method: req.method,
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: req.body,
    },
    config
  );
  return res.status(result.status).json(result.json);
}
