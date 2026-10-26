import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";

async function dumpDialog(page, label) {
  const info = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper], .modal');
    const scope = dlg || document.body;
    return {
      hasDialog: !!dlg,
      text: (dlg ? dlg.innerText : "").slice(0, 1200),
      inputs: [...scope.querySelectorAll("input")].map((e) => ({
        placeholder: e.placeholder, type: e.type, value: e.value,
      })),
      buttons: [...scope.querySelectorAll("button")].map((e) =>
        (e.innerText || "").trim().replace(/\n+/g, " | ").slice(0, 60)
      ).filter(Boolean),
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(info, null, 1));
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
await page.waitForTimeout(3000);

await page.click('button[aria-label="Community App Stores"]');
await page.waitForTimeout(2500);
await dumpDialog(page, "after-gear-click");

const addBtn = page.locator('button:has-text("Добавить"), button:has-text("Add")').first();
if (await addBtn.count()) {
  await addBtn.click();
  await page.waitForTimeout(1500);
  await dumpDialog(page, "after-add-click");
}

await browser.close();
