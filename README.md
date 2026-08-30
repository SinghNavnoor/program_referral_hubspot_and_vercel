# Permanent Housing Referral Pipeline

Serverless integration that turns a HubSpot CRM stage change into a signed
housing referral form, then files the executed PDF back onto the client record.

Built for a homelessness-services nonprofit to replace a manual process in
which case managers re-keyed ~40 fields from the CRM into a PDF by hand.

## What it does

1. A HubSpot workflow fires when a **Program** ticket in a permanent housing
   pipeline enters the **Referral** stage, POSTing to `/api/referral`.
2. The handler validates a shared-secret header, loads the Program and its
   associated Contact, and checks pipeline/stage eligibility.
3. ~40 CRM properties are mapped onto PandaDoc template tokens and fields —
   including derived values such as age from date of birth, household
   composition, and up to 12 homelessness episodes with location types.
4. PandaDoc creates the document from a template and emails it to the assigned
   case manager for signature, with completed copies routed to referral inboxes.
5. On `document_completed_pdf_ready`, PandaDoc calls `/api/pandadoc`. The
   handler verifies an HMAC-SHA256 signature, downloads the signed PDF, uploads
   it to a HubSpot Files folder, and attaches it to the Contact as a note.
6. Resends are versioned (`… – V2`, `– V3`) so prior signed copies are kept.

## Architecture

| Path | Responsibility |
|---|---|
| `api/referral.ts` | Vercel entry point for the HubSpot workflow webhook |
| `api/pandadoc.ts` | Vercel entry point for the PandaDoc completion webhook |
| `src/handler.ts` | Request validation and auth for the referral webhook |
| `src/pipeline.ts` | Orchestrates fetch → map → send → status write-back |
| `src/eligibility.ts` | Pipeline/stage gating rules |
| `src/hubspot/` | HubSpot client, property → domain mapping, file attachment |
| `src/pandadoc/` | Template field mapping, send, signature verify, download |
| `src/age.ts`, `src/names.ts` | Date and name parsing helpers |
| `src/branding.ts` | Organization-specific naming, overridable via env |

Zero runtime dependencies beyond `@vercel/node` — HTTP calls use `fetch`, and
HMAC verification uses `node:crypto`.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your own credentials
```

Required environment variables are documented in `.env.example`:

`WEBHOOK_SECRET`, `HUBSPOT_API_KEY`, `PANDADOC_API_KEY`,
`PANDADOC_TEMPLATE_ID`, `PANDADOC_WEBHOOK_SECRET`, `REFERRAL_TO_EMAIL`,
`REFERRAL_NOTIFY_EMAIL`, and the optional `ORG_SHORT_NAME`.

## Tests

```bash
npm test          # vitest
npm run typecheck # tsc --noEmit
```

## Run locally

```bash
npm run dev                  # local server on :3000
npm run try -- <programId>   # POST a test webhook
```

## Configuration notes

`HUBSPOT_API_KEY` needs a private app token with CRM read/write on tickets,
contacts and notes, plus Files read/write. The PandaDoc webhook is configured
in **Developer Dashboard → Webhooks** for the `document_completed_pdf_ready`
event, with its shared key set to `PANDADOC_WEBHOOK_SECRET`.

## Sample data and privacy

This is a portfolio copy of a system that runs against real client records, so
**all production configuration and data have been removed**:

- **Sample data not included for privacy.** No client records, exports, or
  fixtures containing real personal information are present. Test fixtures use
  invented people (`Jane Doe`, `jane@example.com`).
- **Staff directory replaced.** `src/hubspot/owners.ts` ships a short list of
  fictional owners on `example.org` in place of the real HubSpot owner mapping.
- **HubSpot pipeline and stage IDs are placeholders** in `src/eligibility.ts`
  and must be replaced with ids from your own portal.
- **No credentials are included.** `.env` is git-ignored; `.env.example` lists
  only variable names with placeholder values.
- **Custom property names** (`ref_*`, `hoh__program__*`) reflect the original
  CRM schema and would need remapping for another portal.

As a result the repository will not run end-to-end without being pointed at a
real HubSpot portal and PandaDoc template of your own.
