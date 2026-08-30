import { loadConfig } from "../src/config.js";

const { pandaDocApiKey } = loadConfig();
const templateId = process.env.PANDADOC_TEMPLATE_ID!;
const res = await fetch(
  `https://api.pandadoc.com/public/v1/templates/${templateId}/details`,
  { headers: { Authorization: `API-Key ${pandaDocApiKey}` } }
);
const t = await res.json();
console.log("template name", t.name);
console.log("modified", t.date_modified, t.content_date_modified);
const f = t.fields?.[0];
console.log("sample keys", f ? Object.keys(f) : []);
console.log("sample", JSON.stringify(f, null, 2));
console.log("\nname vs field_id vs merge:");
for (const field of t.fields ?? []) {
  console.log(
    `${field.field_id} | name=${JSON.stringify(field.name)} | merge=${JSON.stringify(field.merge_field)} | title=${JSON.stringify(field.title)}`
  );
}
