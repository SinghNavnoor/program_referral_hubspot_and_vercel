import { loadConfig } from "../src/config.js";

const { pandaDocApiKey, hubspotApiKey } = loadConfig();
const templateId = process.env.PANDADOC_TEMPLATE_ID!;
const programId = process.argv[2];
if (!programId) {
  console.error(
    "Usage: npx tsx --env-file=.env scripts/check-merge-fields.ts <programId>"
  );
  process.exit(1);
}

const tmpl = await fetch(
  `https://api.pandadoc.com/public/v1/templates/${templateId}/details`,
  { headers: { Authorization: `API-Key ${pandaDocApiKey}` } }
);
const t = await tmpl.json();
const fields = t.fields ?? [];
const withMerge = fields.filter((f: { merge_field?: string | null }) => f.merge_field);
const without = fields.filter(
  (f: { merge_field?: string | null; type?: string }) =>
    !f.merge_field && f.type !== "signature"
);
console.log("template fields", fields.length);
console.log("with merge_field", withMerge.length);
console.log("missing merge_field (non-signature)", without.length);
for (const f of withMerge.slice(0, 15)) {
  console.log(" ", f.field_id, "->", f.merge_field, f.placeholder ?? f.type);
}
if (without.length) {
  console.log("still missing:");
  for (const f of without) {
    console.log(" ", f.field_id, f.name, f.placeholder ?? f.type);
  }
}

const hs = await fetch(
  `https://api.hubapi.com/crm/v3/objects/tickets/${programId}?properties=ref_status,hs_pipeline`,
  { headers: { Authorization: `Bearer ${hubspotApiKey}` } }
);
const p = await hs.json();
console.log("ref_status", p.properties?.ref_status);
