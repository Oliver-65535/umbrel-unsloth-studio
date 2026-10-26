import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const results = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!url.includes("/trpc/")) return;
  let text = "";
  try { text = await res.text(); } catch { return; }
  const proc = url.split("/trpc/")[1].split("?")[0];
  results.push({ proc, len: text.length, hasOliverStore: text.includes('"oliver"'), hasAppId: text.includes("oliver-unsloth-studio") });
});

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
console.log("AFTER LOAD:", JSON.stringify(results.filter(r=>r.proc.startsWith("appStore")||r.hasAppId), null, 1));

results.length = 0;
const allBtn = page.locator('text=Все приложения').first();
if (await allBtn.count()) { await allBtn.click(); await page.waitForTimeout(4000); }
console.log("AFTER ALLAPPS:", JSON.stringify(results.filter(r=>r.proc.startsWith("appStore")||r.hasAppId), null, 1));

await browser.close();
