// Takes a screenshot of each site and saves it as images/<name>.jpg: the page
// at 1440px wide, from the top down to 2700px, so cards can scroll the image.
// Usage: node tools/shoot.mjs "name=https://site.co.uk,other=https://other.com"
import { chromium } from "playwright";

const list = (process.argv[2] || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.split("="));
const browser = await chromium.launch();

async function closePopups(page) {
  for (const t of ["Accept", "Accept all", "Accept All", "Allow all", "I agree", "Got it", "OK", "Close", "No thanks"]) {
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
}

for (const [name, url] of list) {
  if (!/^[a-z0-9-]+$/.test(name) || !/^https?:\/\//.test(url)) {
    console.log(`skip ${name}`);
    continue;
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(3000);
    await closePopups(page);
    // Scroll down and back so lazy images and scroll animations load.
    for (let y = 0; y <= 2700; y += 450) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    await closePopups(page);
    const height = await page.evaluate(() => Math.min(document.documentElement.scrollHeight, 2700));
    await page.screenshot({ path: `images/${name}.jpg`, type: "jpeg", quality: 78, clip: { x: 0, y: 0, width: 1440, height }, fullPage: true });
    console.log(`saved images/${name}.jpg (${url}, ${height}px)`);
  } catch (err) {
    console.log(`failed ${name}: ${err.message.split("\n")[0]}`);
  }
  await page.close();
}
await browser.close();
