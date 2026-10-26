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

const ariaButtons = await page.evaluate(() =>
  [...document.querySelectorAll("button[aria-label]")]
    .map((e) => ({
      aria: e.getAttribute("aria-label"),
      rect: e.getBoundingClientRect().toJSON(),
      outer: e.outerHTML.slice(0, 200),
    }))
);
console.log(JSON.stringify(ariaButtons, null, 1));

const gear = page.locator('button[aria-label="Community App Stores"]');
await gear.click({ force: true });
await page.waitForTimeout(3000);

const after = await page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]');
  if (!dlg) return { hasDialog: false };
  return {
    hasDialog: true,
    inputs: [...dlg.querySelectorAll("input")].map((e) => ({ ph: e.placeholder, val: e.value })),
    buttons: [...dlg.querySelectorAll("button")].map((e) => (e.innerText || "").trim().replace(/\n+/g, " | ").slice(0, 50)).filter(Boolean),
    text: dlg.innerText.slice(0, 600),
  };
});
console.log("\n=== after gear click ===");
console.log(JSON.stringify(after, null, 1));

await browser.close();
