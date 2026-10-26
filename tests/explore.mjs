import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";

async function describe(page, label) {
  const info = await page.evaluate(() => {
    const pick = (els) =>
      [...els].slice(0, 30).map((e) => ({
        tag: e.tagName.toLowerCase(),
        type: e.type || null,
        placeholder: e.placeholder || null,
        aria: e.getAttribute("aria-label"),
        text: (e.innerText || "").trim().slice(0, 60),
      }));
    return {
      url: location.href,
      title: document.title,
      inputs: pick(document.querySelectorAll("input")),
      buttons: pick(document.querySelectorAll("button")),
      links: pick(document.querySelectorAll("a")).slice(0, 20),
      bodyText: document.body.innerText.slice(0, 800),
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: `screens/${label}.png`, fullPage: true });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(BASE, { waitUntil: "networkidle" });
await describe(page, "01-root");

const pwd = page.locator('input[type="password"]');
if (await pwd.count()) {
  await pwd.fill(PASSWORD);
  const btn = page.locator('button:has-text("Log in"), button:has-text("Sign in"), button[type="submit"]').first();
  if (await btn.count()) {
    await btn.click();
  } else {
    await pwd.press("Enter");
  }
  await page.waitForTimeout(5000);
  await describe(page, "02-after-login");
}

await browser.close();
