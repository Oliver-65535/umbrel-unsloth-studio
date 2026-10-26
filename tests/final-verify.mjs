import { chromium } from "playwright-core";

const BASE = "http://umbrel.local";
const PASSWORD = process.env.UMBREL_PASSWORD || "Qwe123qwe";
const log = (...a) => console.log(new Date().toISOString(), ...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
await page.locator('input[type="password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(BASE + "/", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);

const homeInfo = await page.evaluate(() => {
  const links = [...document.querySelectorAll("a")].filter((a) => (a.innerText || "").includes("Unsloth Studio"));
  return { present: document.body.innerText.includes("Unsloth Studio"), hrefs: links.map((a) => a.getAttribute("href")) };
});
log("1) home:", JSON.stringify(homeInfo));

if (homeInfo.hrefs.length) {
  const [newPage] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 20000 }).catch(() => null),
    page.click(`a[href="${homeInfo.hrefs[0]}"]`),
  ]);
  const target = newPage || page;
  await target.waitForLoadState("domcontentloaded").catch(() => {});
  await target.waitForTimeout(6000);
  const opened = await target.evaluate(() => ({ url: location.href, title: document.title, hasUnsloth: (document.body.innerHTML + " " + document.body.innerText).toLowerCase().includes("unsloth") }));
  log("2) launched from home:", JSON.stringify(opened));
}

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
let listed = await page.evaluate(() => !!document.querySelector('a[href*="oliver-unsloth-studio"]'));
if (!listed) {
  const allBtn = page.locator('text=Все приложения').first();
  if (await allBtn.count()) { await allBtn.click(); await page.waitForTimeout(3000); }
  listed = await page.evaluate(() => !!document.querySelector('a[href*="oliver-unsloth-studio"]'));
}
log("3) store lists app:", listed);

if (listed) {
  await page.goto(BASE + "/app-store/oliver-unsloth-studio", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const detail = await page.evaluate(() => ({
    hasName: document.body.innerText.includes("Unsloth Studio"),
    buttons: [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter((t) => /Открыть|Установить|Open/.test(t)),
  }));
  log("4) store detail:", JSON.stringify(detail));
}

await browser.close();
