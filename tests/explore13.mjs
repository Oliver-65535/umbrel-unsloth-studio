import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000);

for (const url of ["/app-store/oliver-unsloth-studio", "/app-store/app/oliver-unsloth-studio"]) {
  const r = await page.goto(BASE + url, { waitUntil: "domcontentloaded" }).catch(() => null);
  console.log(url, "->", r && r.status());
  await page.waitForTimeout(2500);
  const has = await page.evaluate(() => document.body.innerText.includes("Unsloth"));
  console.log("  contains Unsloth:", has);
}

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const allBtn = page.locator('text=Все приложения').first();
if (await allBtn.count()) {
  await allBtn.click();
  await page.waitForTimeout(2500);
}
const aiCat = page.locator('text=AI').first();
if (await aiCat.count()) {
  await aiCat.click();
  await page.waitForTimeout(3000);
}
const names = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("[role='dialog'] h3, [role='dialog'] h4, [role='dialog'] p").forEach((e) => {
    const t = (e.textContent || "").trim();
    if (t && t.length < 60) out.push(t);
  });
  return out.filter((v, i) => out.indexOf(v) === i).slice(0, 40);
});
console.log("AI category names:", JSON.stringify(names));

await browser.close();
