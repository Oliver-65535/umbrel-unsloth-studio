import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";
const APP_NAME = "Unsloth Studio";

const log = (...a) => console.log(new Date().toISOString(), ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
log("logged in");

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const search = page.locator('input[placeholder*="Поиск"], input[type="search"]').first();
await search.fill("unsloth");
await page.waitForTimeout(3000);

const cardTexts = await page.evaluate(() => {
  const els = [...document.querySelectorAll('[role="dialog"] a, [role="dialog"] button')];
  return els.map((e) => (e.innerText || "").trim().replace(/\n+/g, " | ")).filter((t) => /unsloth/i.test(t));
});
log("search results:", JSON.stringify(cardTexts));

if (!cardTexts.length) {
  log("FAIL: Unsloth Studio not visible in app store search");
  await browser.close();
  process.exit(1);
}

const card = page.locator('[role="dialog"]').locator("text=Unsloth Studio").first();
await card.click({ force: true });
await page.waitForTimeout(3000);

const detail = await page.evaluate(() => {
  const ds = [...document.querySelectorAll('[role="dialog"]')];
  return ds.map((d) => d.innerText.slice(0, 500).replace(/\n+/g, " | "));
});
log("detail dialogs:", JSON.stringify(detail));

const installBtn = page.locator('button:has-text("Установить"), button:has-text("Install")').last();
if (await installBtn.count()) {
  log("clicking Install");
  await installBtn.click({ force: true });
} else {
  log("no install button found in detail view");
  await browser.close();
  process.exit(1);
}

const deadline = Date.now() + 90 * 60 * 1000;
let done = false;
while (Date.now() < deadline && !done) {
  await page.waitForTimeout(20000);
  const state = await page.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/Unsloth Studio[\s\S]{0,120}/g);
    return { snippet: (m || []).slice(0, 4).map((s) => s.replace(/\n+/g, " | ").slice(0, 150)), len: t.length };
  });
  log("poll:", JSON.stringify(state));
  const text = state.snippet.join(" ");
  if (/Открыть|Open|Установлено|Installed/i.test(text)) done = true;
  if (/ошибк|error|не удалось|failed/i.test(text)) {
    log("ERROR detected in UI");
    break;
  }
}
log(done ? "INSTALL COMPLETE (UI shows open/installed)" : "INSTALL TIMEOUT/ERROR");

await page.screenshot({ path: "screens/final.png", fullPage: true });
await browser.close();
