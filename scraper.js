const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Output file for China HS codes
const OUTPUT_FILE = path.join(__dirname, 'hs_codes_cn.json');
const CHECKPOINT_FILE = path.join(__dirname, 'scraped_chapters.json');

/**
 * Scrape all HS codes and descriptions from https://www.htshub.com/cn-hs
 * @param {string[]} searchTerms - Array of search prefixes (e.g., ["01", "02", ...])
 */
async function scrapeHSCodes(searchTerms) {
  // Load checkpoint
  let scrapedChapters = {};
  if (fs.existsSync(CHECKPOINT_FILE)) {
    scrapedChapters = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
  }
  // Load existing codes if resuming
  let allCodes = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      allCodes = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (e) { allCodes = []; }
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const baseUrl = 'https://www.htshub.com/cn-hs';
  for (const prefix of searchTerms) {
    let pageNum = 1;
    while (true) {
      const chapterKey = `${prefix}-${pageNum}`;
      if (scrapedChapters[chapterKey]) {
        console.log(`[RESUME] Skipping already scraped ${chapterKey}`);
        pageNum++;
        continue;
      }
      const url = pageNum === 1 ? `${baseUrl}/chapter/${prefix}` : `${baseUrl}/chapter/${prefix}-${pageNum}`;
      console.log(`Scraping: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      // Wait for table or results to load
      const tableFound = await page.waitForSelector('table', { timeout: 15000 }).catch(() => false);
      if (!tableFound) {
        console.log(`[DEBUG] No table found on ${url}, ending pagination for this chapter.`);
        break;
      }
      // Extract HS code links from the table
      const codeLinks = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tr'));
        if (rows.length === 0) return [];
        // Assume first row is header
        return rows.slice(1).map(row => {
          const cells = row.querySelectorAll('td');
          const link = cells[0]?.querySelector('a');
          if (!link) return null;
          return {
            hs_code: cells[0].innerText.trim(),
            description: cells[1].innerText.trim(),
            detail_url: link.href
          };
        }).filter(Boolean);
      });
      console.log(`[DEBUG] Found ${codeLinks.length} code links in ${url}`);
      if (codeLinks.length > 0) {
        console.log(`[DEBUG] Sample link:`, codeLinks[0]);
      }
      if (codeLinks.length === 0) {
        console.log(`[DEBUG] No code links found on ${url}, ending pagination for this chapter.`);
        break;
      }
      // Visit each detail page and extract more info
      for (const codeObj of codeLinks) {
        try {
          await page.goto(codeObj.detail_url, { waitUntil: 'networkidle2', timeout: 60000 });
          const detail = await page.evaluate(() => {
            // Find the first .hts_card_list .detail-hts table (main info)
            const mainTable = document.querySelector('.hts_card_list .detail-hts table');
            let result = {};
            if (mainTable) {
              const rows = Array.from(mainTable.querySelectorAll('tr'));
              for (const row of rows) {
                const tds = row.querySelectorAll('td');
                if (tds.length < 2) continue;
                let key = tds[0].innerText.replace(/\s+/g, ' ').replace(/\:$/, '').replace(/\(.*\)/, '').replace(/<[^>]+>/g, '').trim();
                let value = tds[1].innerText.trim();
                result[key] = value;
              }
            }
            // Customs Clearance Requirements table
            let customs = [];
            const customsTable = Array.from(document.querySelectorAll('.hts_card_list .detail-more'))
              .find(el => el.textContent.includes('Customs Clearance Requirements'))?.parentElement?.querySelector('table');
            if (customsTable) {
              const rows = Array.from(customsTable.querySelectorAll('tr'));
              const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.innerText.trim());
              for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td')).map(td => td.innerText.trim());
                if (cells.length === headers.length) {
                  let entry = {};
                  headers.forEach((h, idx) => entry[h] = cells[idx]);
                  customs.push(entry);
                }
              }
            }
            if (customs.length) result['Customs Clearance Requirements'] = customs;
            // CIQ Inspection and Quarantine Requirements table
            let ciq = [];
            const ciqTable = Array.from(document.querySelectorAll('.hts_card_list .detail-more'))
              .find(el => el.textContent.includes('CIQ Inspection and Quarantine Requirements'))?.parentElement?.querySelector('table');
            if (ciqTable) {
              const rows = Array.from(ciqTable.querySelectorAll('tr'));
              const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.innerText.trim());
              for (let i = 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td')).map(td => td.innerText.trim());
                if (cells.length === headers.length) {
                  let entry = {};
                  headers.forEach((h, idx) => entry[h] = cells[idx]);
                  ciq.push(entry);
                }
              }
            }
            if (ciq.length) result['CIQ Inspection and Quarantine Requirements'] = ciq;
            return result;
          });
          if (detail && detail['HTS Code']) {
            allCodes.push(detail);
            console.log(`[DEBUG] Scraped detail:`, detail);
          } else {
            allCodes.push({
              hs_code: codeObj.hs_code,
              description: codeObj.description,
              duty: null
            });
            console.log(`[DEBUG] Fallback for ${codeObj.hs_code}`);
          }
        } catch (err) {
          console.log(`[ERROR] Failed to scrape detail for ${codeObj.hs_code}: ${err}`);
        }
      }
      // Mark this chapter section as scraped and save checkpoint/results
      scrapedChapters[chapterKey] = true;
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(scrapedChapters, null, 2), 'utf-8');
      // Save results incrementally
      const uniqueCodes = Object.values(
        allCodes.reduce((acc, item) => {
          acc[item.hs_code] = item;
          return acc;
        }, {})
      );
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueCodes, null, 2), 'utf-8');
      pageNum++;
    }
  }
  await browser.close();
  console.log(`Scraping complete. Saved to ${OUTPUT_FILE}`);
}

module.exports = { scrapeHSCodes };
