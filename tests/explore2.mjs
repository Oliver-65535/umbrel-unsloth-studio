import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";

async function describe(page, label) {
  const info = await page.evaluate(() => {
    const pick = (sel) =>
      [...document.querySelectorAll(sel)].slice(0, 40).map((e) => ({
        aria: e.getAttribute("aria-label"),
        href: e.href || null,
        text: (e.innerText || "").trim().replace(/\n+/g, " | ").slice(0, 80),
      }));
    return {
      url: location.href,
      buttons: pick("button"),
      links: pick("a"),
      bodyText: document.body.innerText.slice(0, 1200),
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: `screens/${label}.png`, fullPage: true });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(3000);

for (const path of ["/app-store", "/apps"]) {
  const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => null);
  console.log(`path ${path} ->`, resp && resp.status());
  await page.waitForTimeout(2500);
  await describe(page, "nav" + path.replace("/", "-"));
}

await browser.close();
