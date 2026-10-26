import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";
const REPO = "https://github.com/Oliver-65535/umbrel-unsloth-studio";

async function describe(page, label) {
  const info = await page.evaluate(() => {
    const pick = (sel) =>
      [...document.querySelectorAll(sel)].slice(0, 40).map((e) => ({
        aria: e.getAttribute("aria-label"),
        placeholder: e.placeholder || null,
        href: e.href || null,
        disabled: !!e.disabled,
        text: (e.innerText || "").trim().replace(/\n+/g, " | ").slice(0, 90),
      }));
    return {
      url: location.href,
      inputs: pick("input"),
      buttons: pick("button"),
      bodyText: document.body.innerText.slice(0, 1500),
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: `screens/${label}.png`, fullPage: true });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000);

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

await page.click('button[aria-label="Community App Stores"]');
await page.waitForTimeout(1500);
await describe(page, "community-dialog");

await browser.close();
