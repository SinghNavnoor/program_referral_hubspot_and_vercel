import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadConfig } from "../src/config.js";
import { handlePandaDocCompleteRequest } from "../src/completeHandler.js";

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let appConfig;
  try {
    appConfig = loadConfig();
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }

  const rawBody = await readRawBody(req);
  let body: unknown = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const headers: Record<string, string | string[] | undefined> = {
    ...(req.headers as Record<string, string | string[] | undefined>),
  };
  const querySig = req.query?.signature;
  if (typeof querySig === "string" && querySig && !headers.signature) {
    headers.signature = querySig;
  }

  const result = await handlePandaDocCompleteRequest(
    {
      method: req.method,
      headers,
      body,
      rawBody,
    },
    appConfig
  );
  return res.status(result.status).json(result.json);
}
