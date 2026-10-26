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
const item = page.locator('[role="menuitem"]').first();
console.log("menuitem html:", await item.evaluate((e) => e.outerHTML));

// use mouse up/down sequence on the item
const bb = await item.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.waitForTimeout(150);
await page.mouse.up();
await page.waitForTimeout(3000);

const roles = await page.evaluate(() => {
  const counts = {};
  document.querySelectorAll("[role]").forEach((e) => {
    counts[e.getAttribute("role")] = (counts[e.getAttribute("role")] || 0) + 1;
  });
  return counts;
});
console.log("roles:", JSON.stringify(roles));

const bodyTail = await page.evaluate(() => {
  const kids = [...document.body.children].map((c) => ({ tag: c.tagName, cls: (c.className || "").toString().slice(0, 40), text: (c.innerText || "").slice(0, 80).replace(/\n+/g, " | ") }));
  return kids;
});
console.log("body children:", JSON.stringify(bodyTail, null, 1));

await browser.close();
