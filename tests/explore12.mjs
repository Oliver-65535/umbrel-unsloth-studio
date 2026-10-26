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

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);

const unslothAnywhere = await page.evaluate(() =>
  document.body.innerText.includes("Unsloth")
);
console.log("unsloth present without search:", unslothAnywhere);

const search = page.locator('input[placeholder*="Поиск"]').first();
await search.click();
await page.waitForTimeout(500);
await search.pressSequentially("unsloth", { delay: 120 });
await page.waitForTimeout(5000);

const dump = await page.evaluate(() => {
  const matches = [];
  document.querySelectorAll("*").forEach((e) => {
    if (e.children.length === 0 && /unsloth/i.test(e.textContent || "")) {
      matches.push({ tag: e.tagName, cls: (e.className || "").toString().slice(0, 30), text: e.textContent.trim().slice(0, 80) });
    }
  });
  return matches.slice(0, 20);
});
console.log("search matches:", JSON.stringify(dump, null, 1));

const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, " | "));
console.log("body:", bodySnippet);

await browser.close();
