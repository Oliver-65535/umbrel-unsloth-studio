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
await page.waitForTimeout(4000);

const dumpDialogs = async (label) => {
  const list = await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"]')].map((d, i) => ({
      i,
      text: d.innerText.slice(0, 300).replace(/\n+/g, " | "),
      inputs: [...d.querySelectorAll("input")].map((e) => e.placeholder || e.type),
      buttons: [...d.querySelectorAll("button")].map((e) => (e.innerText || "").trim().slice(0, 40)).filter(Boolean).slice(0, 15),
    }))
  );
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(list, null, 1));
};

await dumpDialogs("before");

const gear = page.locator('button[aria-label="Community App Stores"]');
await gear.click({ force: true });
await page.waitForTimeout(1200);
await page.locator('[role="menuitem"]', { hasText: "Community App Stores" }).click();
await page.waitForTimeout(2500);

await dumpDialogs("after-open");

await browser.close();
