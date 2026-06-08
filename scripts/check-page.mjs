import { chromium } from "playwright";

const url = process.argv[2] ?? "https://dsc-infoverifyid.com/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`PAGE: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`CONSOLE: ${msg.text()}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(3000);
const rootText = await page.locator("#root").innerText().catch(() => "");
const title = await page.title();
console.log(JSON.stringify({ url, title, rootLen: rootText.length, rootPreview: rootText.slice(0, 200), errors }, null, 2));
await browser.close();
