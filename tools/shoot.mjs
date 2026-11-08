// Takes a desktop screenshot of each site and saves it as images/<name>.jpg.
// Usage: node tools/shoot.mjs "name=https://site.co.uk,other=https://other.com"
import { chromium } from "playwright";

const list = (process.argv[2] || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.split("="));
const browser = await chromium.launch();
for (const [name, url] of list) {
  if (!/^[a-z0-9-]+$/.test(name) || !/^https?:\/\//.test(url)) { console.log(`skip ${name}`); continue; }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(3000);
    // Close common cookie and newsletter pop-ups so the store itself shows.
    for (const t of ["Accept", "Accept all", "Accept All", "I agree", "Got it", "OK", "Close", "No thanks"]) {
      const b = page.getByRole("button", { name: t, exact: true }).first();
      if (await b.isVisible().catch(() => false)) await b.click({ timeout: 2000 }).catch(() => {});
    }
    for (const t of ["No thanks", "No, thanks", "Maybe later", "Continue shopping"]) {
      const l = page.getByText(t, { exact: false }).first();
      if (await l.isVisible().catch(() => false)) await l.click({ timeout: 2000 }).catch(() => {});
    }
    const x = page.locator('[aria-label="Close"], [aria-label="close"], [aria-label="Close dialog"], button.modal__close, .klaviyo-close-form').first();
    if (await x.isVisible().catch(() => false)) await x.click({ timeout: 2000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `images/${name}.jpg`, type: "jpeg", quality: 80 });
    console.log(`saved images/${name}.jpg (${url})`);
  } catch (err) {
    console.log(`failed ${name}: ${err.message.split("\n")[0]}`);
  }
  await page.close();
}
await browser.close();
