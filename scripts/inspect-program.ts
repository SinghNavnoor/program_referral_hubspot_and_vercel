import { loadConfig } from "../src/config.js";
import { PROGRAM_PROPERTIES } from "../src/hubspot/client.js";

const programId = process.argv[2];
if (!programId) process.exit(1);

const { hubspotApiKey } = loadConfig();
const props = PROGRAM_PROPERTIES.join(",");
const res = await fetch(
  `https://api.hubapi.com/crm/v3/objects/tickets/${programId}?properties=${encodeURIComponent(props)}`,
  { headers: { Authorization: `Bearer ${hubspotApiKey}` } }
);
const data = (await res.json()) as {
  properties?: Record<string, string | null>;
  message?: string;
};
if (!res.ok) {
  console.error(res.status, data);
  process.exit(1);
}
const p = data.properties ?? {};
console.log("pipeline", p.hs_pipeline);
console.log("stage", p.hs_pipeline_stage);
console.log("ref_status", JSON.stringify(p.ref_status));
console.log("hoh_name", p.hoh__program__first_name ? "present" : "empty");
console.log("--- filled ---");
for (const k of Object.keys(p).sort()) {
  if (k.startsWith("ref_") && p[k]) {
    console.log(k, "=", String(p[k]).slice(0, 160));
  }
}
console.log(
  "--- empty ---",
  Object.keys(p)
    .filter((k) => k.startsWith("ref_") && !p[k])
    .join(", ")
);
