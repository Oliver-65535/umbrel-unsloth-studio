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
await gear.scrollIntoViewIfNeeded();
await gear.click({ force: true });
await page.waitForTimeout(1500);

const menu = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  if (!m) return { hasMenu: false };
  return {
    hasMenu: true,
    items: [...m.querySelectorAll('[role="menuitem"]')].map((e) =>
      (e.innerText || "").trim().replace(/\n+/g, " | ")
    ),
  };
});
console.log("MENU:", JSON.stringify(menu, null, 1));

const item = page.locator('[role="menuitem"]').filter({ hasText: /Community|app store|Добав|store/i }).first();
if (await item.count()) {
  console.log("CLICK ITEM:", await item.innerText());
  await item.click();
  await page.waitForTimeout(2000);
  const dlg = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return { hasDialog: false };
    return {
      hasDialog: true,
      text: d.innerText.slice(0, 800),
      inputs: [...d.querySelectorAll("input")].map((e) => ({ ph: e.placeholder, val: e.value })),
      buttons: [...d.querySelectorAll("button")].map((e) => (e.innerText || "").trim().replace(/\n+/g, " | ").slice(0, 60)).filter(Boolean),
    };
  });
  console.log("DIALOG:", JSON.stringify(dlg, null, 1));
}

await browser.close();
