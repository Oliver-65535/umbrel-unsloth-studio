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
await gear.hover();
await page.waitForTimeout(600);
console.log("menu open state:", await gear.getAttribute("data-state"));
const items = await page.locator('[role="menuitem"]').allInnerTexts();
console.log("menuitems:", JSON.stringify(items));

const item = page.locator('[role="menuitem"]').filter({ hasText: "Community App Stores" });
await item.click({ force: true });
await page.waitForTimeout(3000);
console.log("url after:", page.url());

const found = await page.evaluate(() => {
  const res = [];
  document.querySelectorAll('h1,h2,h3,h4,[role="heading"],button,a,input,label,p').forEach((e) => {
    const t = (e.innerText || e.placeholder || "").trim().replace(/\n+/g, " | ");
    if (/community|github|добав/i.test(t)) res.push({ tag: e.tagName, text: t.slice(0, 80) });
  });
  return res;
});
console.log("matches:", JSON.stringify(found, null, 1));
await page.screenshot({ path: "screens/community-view.png", fullPage: true });

await browser.close();
