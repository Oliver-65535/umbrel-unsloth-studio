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

const gear = page.locator('button[aria-label="Community App Stores"]');
await gear.click({ force: true });
await page.waitForTimeout(800);
const item = page.locator('[role="menuitem"]').filter({ hasText: "Community App Stores" });
console.log("items before click:", await item.count());
await item.first().click({ timeout: 5000 }).catch((e) => console.log("click err", e.message));

for (const ms of [500, 1500, 3000, 6000]) {
  await page.waitForTimeout(ms);
  const snap = await page.evaluate(() => ({
    url: location.href,
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.innerText.slice(0, 120).replace(/\n+/g, " | ")),
    httpInputs: [...document.querySelectorAll("input")].map((e) => e.placeholder || e.type),
    headings: [...document.querySelectorAll("h1,h2,h3")].map((e) => e.innerText.trim().slice(0, 60)).filter(Boolean).slice(0, 10),
  }));
  console.log(ms + "ms:", JSON.stringify(snap));
}

await browser.close();
