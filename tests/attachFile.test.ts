import { afterEach, describe, expect, it, vi } from "vitest";
import { attachPdfToContact, hubspotAttachmentFilename } from "../src/hubspot/attachFile.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hubspotAttachmentFilename", () => {
  it("names the HubSpot file with client name and a readable date", () => {
    expect(hubspotAttachmentFilename("Test Jack", "08/19/2026")).toBe(
      "Housing Org referral – Test Jack – 08-19-2026.pdf"
    );
  });

  it("appends V2 at the end of a resent HubSpot file name", () => {
    expect(hubspotAttachmentFilename("Test Jack", "08/19/2026", 2)).toBe(
      "Housing Org referral – Test Jack – 08-19-2026 – V2.pdf"
    );
  });
});

describe("attachPdfToContact", () => {
  it("uploads the PDF into a HubSpot files folder then notes the contact", async () => {
    const fetchMock = vi.fn(
      async (url: string, init?: RequestInit): Promise<Response> => {
        if (String(url).includes("/files/v3/files")) {
          return new Response(JSON.stringify({ id: "file-1" }), { status: 200 });
        }
        if (String(url).includes("/crm/v3/objects/notes")) {
          return new Response(JSON.stringify({ id: "note-1" }), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await attachPdfToContact("token", {
      contactId: "c1",
      filename: "Housing-Org-Referral-Form-c1.pdf",
      bytes: new Uint8Array([1, 2, 3]),
      note: "Signed Housing Org Referral Form.",
    });

    expect(result).toEqual({ fileId: "file-1", noteId: "note-1" });
    const upload = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/files/v3/files")
    );
    expect(upload).toBeTruthy();
    const body = upload?.[1]?.body as FormData;
    expect(body.get("folderPath")).toBe("/Housing Org Referrals");
  });
});
