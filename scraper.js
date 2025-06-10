const fs = require('fs');
const { chromium } = require('playwright');
const config = require('./config');

async function waitForEnter(promptText = '✅ Press ENTER to continue...') {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    readline.question(`\n${promptText}\n`, () => {
      readline.close();
      resolve();
    });
  });
}

// Helper to deduplicate by hsCode
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(item => {
    if (seen.has(item.hsCode)) return false;
    seen.add(item.hsCode);
    return true;
  });
}

async function scrapeHSCodes(searchTerms = []) {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  process.on('SIGINT', async () => {
    console.log('\n🛑 Gracefully shutting down...');
    await browser?.close();
    process.exit(0);
  });

  await page.goto(config.TARGET_URL);
  console.log("🕒 Please enter the CAPTCHA and submit your search manually.");
  await waitForEnter("✅ Press ENTER when you have submitted the search and the first page is fully loaded...");

  let allResults = [];
  let scrapedCodes = new Set();

  // If no search terms provided, do a single scrape (legacy behavior)
  if (searchTerms.length === 0) searchTerms = [''];

  for (const term of searchTerms) {
    console.log(`\n🔎 Starting search for: '${term}'`);
    let frameElementHandle = await page.waitForSelector(config.SELECTORS.iframe);
    let frame = await frameElementHandle.contentFrame();

    // Fill the search box and submit
    if (term) {
      // Try to find the correct input and button inside the iframe
      try {
        // Wait for the form to be present
        await frame.waitForSelector('form.form-horizontal', { timeout: 10000 });
        // Try to fill the first input inside the form (likely HS code or description)
        const inputSelector = 'form.form-horizontal input[type="text"]';
        await frame.waitForSelector(inputSelector, { timeout: 10000 });
        await frame.fill(inputSelector, term);
        // Click the <a> button with class btn btn-sm btn-primary
        const buttonSelector = 'form.form-horizontal a.btn.btn-sm.btn-primary';
        await frame.waitForSelector(buttonSelector, { timeout: 10000 });
        await frame.click(buttonSelector);
        await frame.waitForTimeout(2000); // Wait for results to load
      } catch (err) {
        console.warn(`⚠️ Could not submit search for '${term}': ${err.message}`);
        continue;
      }
    }

    let pageNum = 1;
    while (true) {
      console.log(`\n📄 Scraping visible page ${pageNum} for search '${term}'...`);
      try {
        await frame.waitForSelector(config.SELECTORS.tableCell, { timeout: 20000 });
      } catch (err) {
        console.warn(`⚠️ No results table found for search '${term}' on page ${pageNum}.`);
        break;
      }
      const rowCount = await frame.locator(config.SELECTORS.tableRow).count();
      console.log(`→ Found ${rowCount} HS Code rows on page ${pageNum}`);
      const rowData = [];
      for (let i = 0; i < rowCount; i++) {
        const row = frame.locator(config.SELECTORS.tableRow).nth(i);
        const tds = row.locator('td');
        if (await tds.count() < 2) continue;
        const hsCode = await tds.nth(0).innerText();
        const shortDesc = await tds.nth(1).innerText();
        if (scrapedCodes.has(hsCode)) continue;
        rowData.push({ hsCode, shortDesc, rowIndex: i });
      }
      for (const { hsCode, shortDesc, rowIndex } of rowData) {
        try {
          const row = frame.locator(config.SELECTORS.tableRow).nth(rowIndex);
          const linkLocator = row.locator('td').nth(0).locator('a');
          if (await linkLocator.count() === 0) continue;
          await linkLocator.first().click();
          await frame.waitForTimeout(1500);
          let longDesc = '';
          try {
            const label = await frame.locator(config.SELECTORS.longDescLabel).first();
            if (await label.count() > 0) {
              const container = await label.evaluateHandle(el => el.parentElement);
              const fullText = await container.evaluate(el => el.innerText.trim());
              longDesc = fullText.replace(/^.*Long Description:\s*/i, '').trim();
            }
          } catch {}
          allResults.push({
            hsCode,
            shortDesc,
            longDesc: longDesc || null,
            description: longDesc || shortDesc || '❌ Description not found'
          });
          scrapedCodes.add(hsCode);
          console.log(`✅ ${hsCode}: ${longDesc ? longDesc.substring(0, 60) : shortDesc.substring(0, 60)}...`);
          const backBtn = frame.locator(config.SELECTORS.backButton);
          for (let j = 0; j < await backBtn.count(); j++) {
            try {
              await backBtn.nth(j).click({ timeout: 3000 });
              break;
            } catch {}
          }
          frameElementHandle = await page.waitForSelector(config.SELECTORS.iframe, { timeout: 10000 });
          frame = await frameElementHandle.contentFrame();
          await frame.waitForSelector(config.SELECTORS.tableCell, { timeout: 10000 });
        } catch (err) {
          try {
            const html = await frame.content();
            fs.writeFileSync(config.DEBUG_FILE, html);
          } catch {}
          console.warn(`⚠️ Error on ${hsCode}: ${err.message}`);
          try {
            frameElementHandle = await page.waitForSelector(config.SELECTORS.iframe, { timeout: 10000 });
            frame = await frameElementHandle.contentFrame();
          } catch {}
        }
      }
      const nextLi = frame.locator(config.SELECTORS.nextButton);
      if (await nextLi.count() > 0) {
        const isDisabled = await nextLi.first().evaluate(el => el.classList.contains('disabled'));
        if (!isDisabled) {
          await nextLi.first().locator('a').click();
          await frame.waitForTimeout(2000);
          frameElementHandle = await page.waitForSelector(config.SELECTORS.iframe, { timeout: 10000 });
          frame = await frameElementHandle.contentFrame();
          await frame.waitForSelector(config.SELECTORS.tableCell, { timeout: 10000 });
          pageNum++;
          continue;
        }
      }
      console.log(`✅ No more pages for search '${term}'.`);
      break;
    }
  }

  // Deduplicate and save
  const deduped = deduplicateResults(allResults);
  fs.writeFileSync(config.OUTPUT_FILE, JSON.stringify(deduped, null, 2));
  console.log(`\n✅ All results written to ${config.OUTPUT_FILE}`);
  await browser.close();
}

module.exports = { scrapeHSCodes };
