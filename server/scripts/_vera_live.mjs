import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const provider = await import("../utils/veraProvider.js");
const vera = await import("../utils/veraAssistant.js");
const { computeInsights, insightsToPromptBlock } = await import("../utils/veraInsights.js");

await mongoose.connect(process.env.MONGO_URI);
const ins = await computeInsights({});
const block = insightsToPromptBlock(ins);

for (const forced of [process.argv[2] || "anthropic"]) {
  const cfg = { enabled: true, publicEnabled: true, tone: "analyst", responseLength: "balanced", provider: { provider: forced } };
  console.log(`\n===== ${forced} → ${provider.resolveModel(cfg)} | operational=${provider.isOperational(cfg)} | key=${provider.resolveKey(cfg).source}`);
  const t0 = Date.now();
  try {
    const t = await provider.testConnection(cfg);
    console.log(`testConnection OK (${Date.now() - t0} ms): "${t.text}" tokens=${t.inputTokens}+${t.outputTokens}`);
  } catch (e) {
    console.log("testConnection FAILED:", provider.sanitizeError(e, provider.resolveKey(cfg).key, forced), "|", e?.status, String(e?.message).slice(0, 300));
    continue;
  }
  for (const q of ["Which SQD dimension is the weakest and what should we do about it?", "How many responses did we get in the last 30 days compared to before?"]) {
    const t1 = Date.now();
    const r = await vera.answer({ message: q, realm: "admin", settings: cfg, insights: ins, insightsBlock: block, page: "dashboard" });
    console.log(`\n>>> ${q}\n[${r.source} ${r.model || ""} ${Date.now() - t1} ms, ${r.inputTokens || 0}+${r.outputTokens || 0} tok]\n${r.answer}`);
  }
  const pub = await vera.answer({ message: "Are my answers anonymous?", realm: "public", settings: cfg });
  console.log(`\n>>> (public) Are my answers anonymous?\n[${pub.source}]\n${pub.answer}`);
}
await mongoose.disconnect();
