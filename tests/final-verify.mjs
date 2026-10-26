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

log("1) home has Unsloth Studio:", await page.evaluate(() => document.body.innerText.includes("Unsloth Studio")));

await page.goto(BASE + "/app-store", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const listed = await page.evaluate(() => !!document.querySelector('a[href="/app-store/oliver-unsloth-studio"], a[href*="oliver-unsloth-studio"]'));
log("2) store catalog lists app:", listed);

if (!listed) {
  const allBtn = page.locator('text=Все приложения').first();
  if (await allBtn.count()) { await allBtn.click(); await page.waitForTimeout(3000); }
  log("   after Все приложения:", await page.evaluate(() => !!document.querySelector('a[href*="oliver-unsloth-studio"]')));
}

await page.goto(BASE + "/app-store/oliver-unsloth-studio", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const detail = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean);
  return { text: document.body.innerText.slice(0, 250).replace(/\n+/g, " | "), buttons: btns.slice(0, 12) };
});
log("3) detail page:", JSON.stringify(detail));

const action = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /Открыть|Open|Установить/i.test(b.innerText));
  if (btn) { btn.click(); return btn.innerText.trim(); }
  return null;
});
log("4) clicked:", action);
await page.waitForTimeout(8000);
const pages = ctx.pages();
const target = pages[pages.length - 1];
await target.waitForLoadState("domcontentloaded").catch(() => {});
await target.waitForTimeout(5000);
const opened = await target.evaluate(() => ({ url: location.href, title: document.title, hasUnsloth: (document.body.innerHTML + " " + document.body.innerText).toLowerCase().includes("unsloth") }));
log("5) opened app:", JSON.stringify(opened));

await browser.close();
