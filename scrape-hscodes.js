const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

async function waitForEnter(promptText = '✅ Press ENTER to continue...') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`\n${promptText}\n`, () => {
      rl.close();
      resolve();
    });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  process.on('SIGINT', async () => {
    console.log('\n🛑 Gracefully shutting down...');
    await browser?.close();
    process.exit(0);
  });

  await page.goto('https://www.dubaicustoms.gov.ae/en/eServices/Pages/HScodesearch.aspx');
  console.log("🕒 Please enter the CAPTCHA and submit your search manually.");
  await waitForEnter("✅ Press ENTER when you have submitted the search and the first page is fully loaded...");

  let frameElementHandle = await page.waitForSelector('iframe');
  let frame = await frameElementHandle.contentFrame();

  const scrapedCodes = new Set();
  const results = [];
  let pageNum = 1;
  const outputFile = 'uae_hscodes_full.json';

  while (true) {
    console.log(`\n📄 Scraping visible page ${pageNum}...`);

    await frame.waitForSelector('table#hscodeResult tbody tr td', { timeout: 20000 });

    const rowCount = await frame.locator('table#hscodeResult tbody tr').count();
    console.log(`→ Found ${rowCount} HS Code rows on page ${pageNum}`);

    const rowData = [];

    for (let i = 0; i < rowCount; i++) {
      const row = frame.locator('table#hscodeResult tbody tr').nth(i);
      const tds = row.locator('td');
      if (await tds.count() < 2) continue; // Defensive: skip incomplete rows
      const hsCode = await tds.nth(0).innerText();
      const shortDesc = await tds.nth(1).innerText();
      if (scrapedCodes.has(hsCode)) continue;
      rowData.push({ hsCode, shortDesc, rowIndex: i });
    }

    for (const { hsCode, shortDesc, rowIndex } of rowData) {
      try {
        // Re-acquire locator for the link just before clicking
        const row = frame.locator('table#hscodeResult tbody tr').nth(rowIndex);
        const linkLocator = row.locator('td').nth(0).locator('a');
        if (await linkLocator.count() === 0) continue;
        await linkLocator.first().click();
        await frame.waitForTimeout(1500);

        let longDesc = '';
        try {
          const label = await frame.locator('text=Long Description:').first();
          if (await label.count() > 0) {
            const container = await label.evaluateHandle(el => el.parentElement);
            const fullText = await container.evaluate(el => el.innerText.trim());
            longDesc = fullText.replace(/^.*Long Description:\\s*/i, '').trim();
          }
        } catch {}

        // Store both short and long description
        results.push({
          hsCode,
          shortDesc,
          longDesc: longDesc || null,
          description: longDesc || shortDesc || '❌ Description not found'
        });
        scrapedCodes.add(hsCode);
        console.log(`✅ ${hsCode}: ${longDesc ? longDesc.substring(0, 60) : shortDesc.substring(0, 60)}...`);

        const backBtn = frame.locator('text=Back');
        for (let j = 0; j < await backBtn.count(); j++) {
          try {
            await backBtn.nth(j).click({ timeout: 3000 });
            break;
          } catch {}
        }

        // Reacquire iframe after back
        frameElementHandle = await page.waitForSelector('iframe', { timeout: 10000 });
        frame = await frameElementHandle.contentFrame();
        await frame.waitForSelector('table#hscodeResult tbody tr td', { timeout: 10000 });
      } catch (err) {
        // Write debug HTML for inspection
        try {
          const html = await frame.content();
          fs.writeFileSync('debug.html', html);
        } catch {}
        console.warn(`⚠️ Error on ${hsCode}: ${err.message}`);
        // Defensive: reacquire frame after error
        try {
          frameElementHandle = await page.waitForSelector('iframe', { timeout: 10000 });
          frame = await frameElementHandle.contentFrame();
        } catch {}
      }
    }

    // Try to click the "Next" button in the iframe
    const nextLi = frame.locator('ul.pagination li.next');
    if (await nextLi.count() > 0) {
      const isDisabled = await nextLi.first().evaluate(el => el.classList.contains('disabled'));
      if (!isDisabled) {
        await nextLi.first().locator('a').click();
        await frame.waitForTimeout(2000); // Wait for page to load
        // Reacquire iframe after navigation
        frameElementHandle = await page.waitForSelector('iframe', { timeout: 10000 });
        frame = await frameElementHandle.contentFrame();
        await frame.waitForSelector('table#hscodeResult tbody tr td', { timeout: 10000 });
        pageNum++;
        continue;
      }
    }
    console.log('✅ No more pages. Scraping complete.');
    break;
  }

  // Write all results to JSON array file
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ All results written to ${outputFile}`);

  await browser.close();
})();