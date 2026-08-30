import { loadConfig } from "../src/config.js";

const id = process.argv[2];
if (!id) {
  console.error("Usage: document id");
  process.exit(1);
}
const { pandaDocApiKey } = loadConfig();
const res = await fetch(`https://api.pandadoc.com/public/v1/documents/${id}/details`, {
  headers: { Authorization: `API-Key ${pandaDocApiKey}` },
});
const data = await res.json();
console.log("status", res.status);
if (!res.ok) {
  console.log(JSON.stringify(data).slice(0, 2000));
  process.exit(1);
}
console.log("doc status", data.status);
console.log("tokens", JSON.stringify(data.tokens, null, 2));
console.log("\n=== FIELDS ===");
for (const f of data.fields ?? []) {
  console.log(
    JSON.stringify({
      field_id: f.field_id,
      name: f.name,
      type: f.type,
      value: f.value,
      merge_field: f.merge_field,
      placeholder: f.placeholder,
      assigned_to: f.assigned_to?.name,
    })
  );
}
