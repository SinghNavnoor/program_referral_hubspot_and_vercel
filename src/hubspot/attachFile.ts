import {
  REFERRAL_FILENAME_PREFIX,
  REFERRAL_FOLDER_PATH,
} from "../branding.js";

const NOTE_TO_CONTACT = 202;

export function hubspotAttachmentFilename(
  clientName: string,
  createdDate: string,
  version?: number
): string {
  const name = clientName.trim() || "Client";
  const date = (createdDate.trim() || "unknown date").replaceAll("/", "-");
  const suffix = version && version >= 2 ? ` – V${version}` : "";
  return `${REFERRAL_FILENAME_PREFIX} – ${name} – ${date}${suffix}.pdf`;
}

export async function attachPdfToContact(
  token: string,
  args: {
    contactId: string;
    filename: string;
    bytes: Uint8Array;
    note: string;
  }
): Promise<{ fileId: string; noteId: string }> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(args.bytes)], { type: "application/pdf" }),
    args.filename
  );
  form.append("folderPath", REFERRAL_FOLDER_PATH);
  form.append(
    "options",
    JSON.stringify({ access: "PRIVATE", overwrite: false })
  );

  const upload = await fetch("https://api.hubapi.com/files/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!upload.ok) {
    throw new Error(`HubSpot file upload failed: ${upload.status} ${await upload.text()}`);
  }
  const file = (await upload.json()) as { id: string };
  if (!file.id) throw new Error("HubSpot file upload returned no id");

  const noteRes = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: args.note,
        hs_attachment_ids: file.id,
      },
      associations: [
        {
          to: { id: args.contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: NOTE_TO_CONTACT,
            },
          ],
        },
      ],
    }),
  });
  if (!noteRes.ok) {
    throw new Error(`HubSpot note create failed: ${noteRes.status} ${await noteRes.text()}`);
  }
  const note = (await noteRes.json()) as { id: string };
  return { fileId: file.id, noteId: note.id };
}
