import { createServer } from "node:http";
import { loadConfig } from "../src/config.js";
import { handleReferralRequest } from "../src/handler.js";
import { handlePandaDocCompleteRequest } from "../src/completeHandler.js";

const port = Number(process.env.PORT ?? 3000);
const config = loadConfig();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  let body: unknown = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }

  const headers: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = v;
  const querySig = url.searchParams.get("signature");
  if (querySig && !headers.signature) headers.signature = querySig;

  if (url.pathname === "/api/referral") {
    const result = await handleReferralRequest(
      { method: req.method, headers, body },
      config
    );
    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.json, null, 2));
    return;
  }

  if (url.pathname === "/api/pandadoc") {
    const result = await handlePandaDocCompleteRequest(
      { method: req.method, headers, body, rawBody: raw },
      config
    );
    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.json, null, 2));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`Local referral webhook: http://127.0.0.1:${port}/api/referral`);
  console.log(`Local PandaDoc complete webhook: http://127.0.0.1:${port}/api/pandadoc`);
});

