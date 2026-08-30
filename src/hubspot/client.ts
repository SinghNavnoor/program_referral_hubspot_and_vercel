import {
  REFERRAL_FILENAME_PREFIX,
  REFERRAL_FOLDER_PATH,
} from "../branding.js";

export const PROGRAM_PROPERTIES = [
  "hs_pipeline",
  "hs_pipeline_stage",
  "hoh__program__first_name",
  "ref_status",
  "ref_date",
  "ref_tay",
  "ref_type",
  "ref_source",
  "ref_sou_oth",
  "ref_ct_hl",
  "ref_dhb",
  "ref_wiccs",
  "ref_ed",
  "ref_aed",
  "ref_wgacbs",
  "ref_dchid",
  "ref_ssc",
  "ref_thhinc",
  "ref_ctemp",
  "ref_soi",
  "ref_amt",
  "ref_cust",
  "ref_agecy",
  "hubspot_owner_id",
  "case_manager_email",
  "ref_oralstate",
  "ref_hv_enc",
  "ref_my_eoh",
  "ref_eof2",
  "ref_eof3",
  "ref_eof4",
  "ref_eof5",
  "ref_eof6",
  "ref_eof7",
  "ref_eof8",
  "ref_eof9",
  "ref_eof10",
  "ref_eof11",
  "ref_eof12",
  "ref_loc_n1",
  "ref_loc_n2",
  "ref_loc_n3",
  "ref_loc_n4",
  "ref_loc_n5",
  "ref_loc_n6",
  "ref_loc_n7",
  "ref_loc_n8",
  "ref_loc_n9",
  "ref_loc_n10",
  "ref_loc_n11",
  "ref_loc_n12",
  "ref_hc_rl",
  "ref_hv_hhr",
  "ref_hv_cchv",
] as const;

export const CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "mobilephone",
  "hhsize_n",
  "adults_n",
  "child_n",
  "age_calculated",
  "real_data_of_birth",
  "unique_id",
] as const;

export type HubSpotObject = {
  id: string;
  properties: Record<string, string | null>;
};

export class HubSpotClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.fetchImpl(`https://api.hubapi.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    return res;
  }

  async getProgram(id: string): Promise<HubSpotObject> {
    const props = PROGRAM_PROPERTIES.join(",");
    const res = await this.request(
      `/crm/v3/objects/tickets/${encodeURIComponent(id)}?properties=${encodeURIComponent(props)}`
    );
    if (!res.ok) {
      throw new Error(`HubSpot get program failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as HubSpotObject;
  }

  async searchContactByName(fullName: string): Promise<HubSpotObject | undefined> {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    const props = [...CONTACT_PROPERTIES];

    const body = {
      filterGroups: [
        {
          filters: [
            { propertyName: "firstname", operator: "EQ", value: firstName },
            ...(lastName
              ? [{ propertyName: "lastname", operator: "EQ", value: lastName }]
              : []),
          ],
        },
      ],
      properties: props,
      limit: 5,
    };

    const res = await this.request("/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `HubSpot contact search failed: ${res.status} ${await res.text()}`
      );
    }
    const data = (await res.json()) as { results?: HubSpotObject[] };
    const results = data.results ?? [];
    if (!results.length) return undefined;
    if (results.length === 1) return results[0];

    const want = fullName.trim().toLowerCase();
    const exact = results.find((c) => {
      const fn = c.properties.firstname ?? "";
      const ln = c.properties.lastname ?? "";
      return `${fn} ${ln}`.trim().toLowerCase() === want;
    });
    return exact ?? results[0];
  }

  async listReferralFilenames(clientName: string): Promise<string[]> {
    const params = new URLSearchParams({
      limit: "100",
      path: REFERRAL_FOLDER_PATH,
    });
    const res = await this.request(`/files/v3/files/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Array<{ name?: string }> };
    const needle = clientName.trim().toLowerCase();
    return (data.results ?? [])
      .map((file) => file.name ?? "")
      .filter((name) => {
        const lower = name.toLowerCase();
        return (
          lower.includes(REFERRAL_FILENAME_PREFIX.toLowerCase()) &&
          (!needle || lower.includes(needle))
        );
      });
  }

  async updateReferralStatus(programId: string, value: string): Promise<void> {
    const res = await this.request(
      `/crm/v3/objects/tickets/${encodeURIComponent(programId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ properties: { ref_status: value } }),
      }
    );
    if (!res.ok) {
      throw new Error(
        `HubSpot update referral status failed: ${res.status} ${await res.text()}`
      );
    }
  }
}
