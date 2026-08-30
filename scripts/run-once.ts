import { loadConfig } from "../src/config.js";
import { runReferralPipeline } from "../src/pipeline.js";

const programId = process.argv[2];
if (!programId) {
  console.error("Usage: npx tsx --env-file=.env scripts/run-once.ts <programId>");
  process.exit(1);
}

const config = loadConfig();
try {
  const result = await runReferralPipeline(config, programId);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
