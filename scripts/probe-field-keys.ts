import { REFERRAL_COPY_ROLE } from "../src/branding.js";
import { loadConfig } from "../src/config.js";

const { pandaDocApiKey, pandaDocTemplateId, referralToEmail } = loadConfig();

const tmpl = await fetch(
  `https://api.pandadoc.com/public/v1/templates/${pandaDocTemplateId}/details`,
  { headers: { Authorization: `API-Key ${pandaDocApiKey}` } }
);
const t = await tmpl.json();
const ageField = (t.fields as Array<{ placeholder?: string; uuid: string; field_id: string }>).find(
  (f) => f.placeholder === "Enter Age"
);
if (!ageField) throw new Error("age field not found");

const fieldsByUuid = { [ageField.uuid]: { value: "26" } };
const fieldsById = { [ageField.field_id]: { value: "26" } };

async function create(label: string, fields: Record<string, { value: string }>) {
  const res = await fetch("https://api.pandadoc.com/public/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `API-Key ${pandaDocApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `MERGE TEST ${label}`,
      template_uuid: pandaDocTemplateId,
      recipients: [
        { email: referralToEmail, first_name: "Test", last_name: "Merge", role: "Case Manager" },
        { email: referralToEmail, first_name: "Test", last_name: "Merge", role: REFERRAL_COPY_ROLE },
        { email: referralToEmail, first_name: "Test", last_name: "Merge", role: "Client" },
      ],
      fields,
    }),
  });
  const data = await res.json();
  console.log(label, "create", res.status, data.id, data.info_message ?? "");
  return data.id as string | undefined;
}

const idUuid = await create("uuid", fieldsByUuid);
const idField = await create("field_id", fieldsById);

async function waitDraft(id: string) {
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`https://api.pandadoc.com/public/v1/documents/${id}`, {
      headers: { Authorization: `API-Key ${pandaDocApiKey}` },
    });
    const d = await res.json();
    if (d.status === "document.draft") return;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function ageValue(id: string, label: string) {
  await waitDraft(id);
  const res = await fetch(
    `https://api.pandadoc.com/public/v1/documents/${id}/details`,
    { headers: { Authorization: `API-Key ${pandaDocApiKey}` } }
  );
  const d = await res.json();
  const age = (d.fields as Array<{ placeholder?: string; value: unknown; field_id: string }>).find(
    (f) => f.placeholder === "Enter Age"
  );
  console.log(label, "age field", age?.field_id, "value=", JSON.stringify(age?.value));
}

if (idUuid) await ageValue(idUuid, "uuid");
if (idField) await ageValue(idField, "field_id");
