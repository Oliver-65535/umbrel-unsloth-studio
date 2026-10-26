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

const parent = page.locator('[role="menuitem"]').filter({ hasText: "Community App Stores" }).first();
const bb = await parent.boundingBox();
await page.mouse.move(bb.x + 10, bb.y + bb.height / 2);
await page.waitForTimeout(1500);

const menus = await page.evaluate(() =>
  [...document.querySelectorAll('[role="menu"]')].map((m) => ({
    text: m.innerText.replace(/\n+/g, " | ").slice(0, 400),
    items: [...m.querySelectorAll('[role="menuitem"]')].map((e) => (e.innerText || "").trim().replace(/\n+/g, " | ")),
  }))
);
console.log(JSON.stringify(menus, null, 1));

await browser.close();
