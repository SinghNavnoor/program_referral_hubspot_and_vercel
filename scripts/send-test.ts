const programId = process.argv[2] || process.env.PROGRAM_ID;
if (!programId) {
  console.error("Usage: npm run try -- <programId>");
  process.exit(1);
}

const secret = process.env.WEBHOOK_SECRET;
if (!secret) {
  console.error("WEBHOOK_SECRET is missing in .env");
  process.exit(1);
}

const port = process.env.PORT ?? "3000";
const res = await fetch(`http://127.0.0.1:${port}/api/referral`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": secret,
  },
  body: JSON.stringify({ programId }),
});

const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
