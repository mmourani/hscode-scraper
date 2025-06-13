/**
 * Universal Smart Crawler
 *
 * Features:
 * - Site Map, PDF Discovery/Download/AI Analysis, Debug Levels, LLM Integration, Brute-Force Modal Handling, Step-by-Step Debug, Modal Timeout
 * - LLaVA Vision API Integration: After each page navigation, the crawler takes a screenshot and sends it to a self-hosted LLaVA Flask API (running on AWS GPU server).
 *   The API analyzes the screenshot and returns an answer (e.g., which button to click to accept cookies/privacy).
 *   The answer is logged and can be used to guide automation.
 *
 * LLaVA API Setup:
 * - The LLaVA Flask API must be running on an accessible server (see setup instructions in project README).
 * - The API endpoint is hardcoded as http://ec2-3-214-184-34.compute-1.amazonaws.com:5000/vision (update as needed).
 *
 * Usage:
 * - The crawler will automatically send screenshots to the LLaVA API and log the model's answer after each navigation.
 * - Integrate the answer into your modal handling logic as needed.
 *
 * Requirements:
 * - Node.js, Puppeteer, node-fetch, and access to the LLaVA API endpoint.
 */
// Universal Smart Crawler: Site Map, PDF Discovery/Download/AI Analysis, Debug Levels, LLM Integration, Brute-Force Modal Handling, Step-by-Step Debug, Modal Timeout
// Usage: node smart_crawler.js <startUrl> [debugLevel]

console.log('--- Smart Crawler Script Starting ---');
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection:', reason);
});

// Load environment variables from .env if present
try {
  require('dotenv').config();
  console.log('[INFO] Loaded environment variables from .env');
} catch (e) {
  console.log('[INFO] dotenv not installed or failed to load.');
}

// Debug setup verification block
const requiredModules = [
  { name: 'puppeteer', loader: () => require('puppeteer') },
  { name: 'cheerio', loader: () => require('cheerio') },
  { name: 'compromise', loader: () => require('compromise') },
  { name: 'pdf-parse', loader: () => require('pdf-parse') },
  { name: 'node-fetch', loader: () => require('node-fetch') },
  { name: 'dotenv', loader: () => require('dotenv') },
];
const debugLevelsList = ['none', 'basic', 'verbose', 'trace'];
let DEBUG = 'basic';
function setDebugLevel(level) {
  if (debugLevelsList.includes(level)) DEBUG = level;
}
function debug(msg, level = 'basic') {
  if (debugLevelsList.indexOf(level) <= debugLevelsList.indexOf(DEBUG)) {
    console.log(`[DEBUG][${level}] ${msg}`);
  }
}

// Run setup checks if debug is not 'none'
(function setupDebugChecks() {
  const debugEnv = process.argv[3] || 'basic';
  setDebugLevel(debugEnv);
  if (DEBUG === 'none') return;
  debug('--- Debug Setup Verification ---', 'basic');
  // Check modules
  for (const mod of requiredModules) {
    try {
      mod.loader();
      debug(`Module '${mod.name}' loaded successfully.`, 'basic');
    } catch (e) {
      debug(`Module '${mod.name}' FAILED to load: ${e.message}`, 'basic');
    }
  }
  // Check API keys
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const HF_KEY = process.env.HF_KEY;
  debug(`OPENAI_KEY: ${OPENAI_KEY}`, 'basic');
  debug(`HF_KEY: ${HF_KEY}`, 'basic');
  // Check debug levels and function
  debug(`Debug levels: ${JSON.stringify(debugLevelsList)}`, 'trace');
  debug(`Debug function is set up.`, 'trace');
})();

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const nlp = require('compromise');
const pdfParse = require('pdf-parse');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const fetch = require('node-fetch');

// LLaVA Vision API integration
async function queryLlavaVisionAPI(imagePath, question) {
  const imgB64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  const payload = {
    image: imgB64,
    question: question
  };
  const url = 'http://ec2-3-214-184-34.compute-1.amazonaws.com:5000/vision';
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`LLaVA API error: ${response.statusText}`);
  }
  const data = await response.json();
  return data.answer;
}

const OPENAI_KEY = process.env.OPENAI_KEY;
const HF_KEY = process.env.HF_KEY;

const DEBUG_LEVELS = ['none', 'basic', 'verbose', 'trace'];
// DEBUG, setDebugLevel, and debug() already defined above

function saveScreenshot(page, label) {
  return page.screenshot({ path: `debug_${label}.png` }).catch(() => {});
}

function normalizeUrl(url) {
  try {
    let u = new URL(url);
    u.hash = '';
    u.search = '';
    let s = u.toString();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return url;
  }
}

async function extractProductsCheerio(html) {
  const $ = cheerio.load(html);
  const found = new Set();
  $('h1, h2, h3, .product-title, .service-title, .card-title, .product, .service, .solution, .item, .product-card, .product-list, .product-grid, .product-block, .product-item, .product-name, .product-description').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 2) found.add(text);
  });
  $('li, td, th').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && /[A-Za-z]/.test(text)) found.add(text);
  });
  $('a, button').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && /[A-Za-z]/.test(text)) found.add(text);
  });
  return Array.from(found);
}

function aiFilterProductNames(strings) {
  return strings.filter(str => {
    if (str.length < 3 || str.length > 80) return false;
    if (/\?$|\bselect|choose|enter|describe|how did you|who referred|comments|newsletter|validation|support|contact|privacy|terms|about|blog|news|event|video|download|portal|training|team|management|careers|request|demo|faq|login|sign in|register|email|phone|name|organization|country|state|branch|platform|industry|application|customer|response|hidden|field|purpose|should be left unchanged/i.test(str)) return false;
    if (/\bmore\b|learn|view|library|program|describe|describe|left unchanged/i.test(str)) return false;
    if (str.split(' ').length > 10) return false;
    const doc = nlp(str);
    if (doc.has('#Question')) return false;
    if (doc.has('#Verb') && !doc.has('#Noun')) return false;
    if (doc.has('#Noun')) return true;
    if (/^[A-Z][a-z]+( [A-Z][a-z]+)+$/.test(str) || /^[A-Z0-9\- ]+$/.test(str)) return true;
    return false;
  });
}

function downloadPDF(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, response => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('pdf')) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`Not a PDF file, got content-type: ${contentType}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function analyzePDFWithAI(text, pdfPath, debugLevel) {
  debug(`[PDF][${pdfPath}] Analyzing with AI...`, 'basic');
  if (text.length < 2000) {
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 2);
    const filtered = aiFilterProductNames(lines);
    debug(`[PDF][${pdfPath}] Used compromise.js for AI filtering.`, 'verbose');
    return { products: filtered, llm: 'compromise.js' };
  } else if (text.length < 10000) {
    debug(`[PDF][${pdfPath}] Using HuggingFace LLM.`, 'basic');
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text.slice(0, 4096) })
      });
      const result = await response.json();
      debug(`[PDF][${pdfPath}] HuggingFace response: ${JSON.stringify(result).slice(0, 300)}`, 'trace');
      return { products: [], llm: 'huggingface' };
    } catch (e) {
      debug(`[PDF][${pdfPath}] HuggingFace error: ${e.message}`, 'basic');
      return { products: [], llm: 'huggingface' };
    }
  } else {
    debug(`[PDF][${pdfPath}] Using OpenAI GPT-3/4.`, 'basic');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Extract a list of product or service names from the following PDF text. Only output the list.' },
            { role: 'user', content: text.slice(0, 12000) }
          ],
          max_tokens: 512
        })
      });
      const result = await response.json();
      debug(`[PDF][${pdfPath}] OpenAI response: ${JSON.stringify(result).slice(0, 300)}`, 'trace');
      let products = [];
      if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
        products = result.choices[0].message.content.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 2);
      }
      return { products, llm: 'openai-gpt' };
    } catch (e) {
      debug(`[PDF][${pdfPath}] OpenAI error: ${e.message}`, 'basic');
      return { products: [], llm: 'openai-gpt' };
    }
  }
}

async function crawlSiteMapPuppeteerWithPDFs(startUrl, maxPages = 50) {
  debug('Building site map and crawling with Puppeteer (PDF aware)...', 'basic');
  debug('Launching browser...', 'basic');
  let browser, page;
  try {
    debug('Before puppeteer.launch', 'trace');
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    debug('Browser launched.', 'basic');
    debug('Before browser.newPage', 'trace');
    page = await browser.newPage();
    debug('New page created.', 'basic');
  } catch (err) {
    debug(`[ERROR] Browser launch failed: ${err.message}`, 'basic');
    throw err;
  }
  const base = new URL(startUrl).origin;
  const toVisit = [normalizeUrl(startUrl)];
  const visited = new Set();
  const failed = new Set();
  const productsByPage = {};
  const pdfLinks = new Set();
  let pagesCrawled = 0;
  debug(`Initial toVisit length: ${toVisit.length}, maxPages: ${maxPages}`, 'basic');
  // --- Site map discovery phase ---
  debug(`[SITEMAP] Initial discovery queue: ${JSON.stringify(toVisit)}`, 'verbose');
  debug(`[SITEMAP] Number of unique pages discovered (initial): ${toVisit.length}`, 'verbose');
  debug(`[SITEMAP] Max pages to crawl: ${maxPages}`, 'verbose');
  debug(`[SITEMAP] Stats will be updated as crawling progresses.`, 'verbose');

  while (toVisit.length > 0 && pagesCrawled < maxPages) {
    debug(`toVisit length: ${toVisit.length}, pagesCrawled: ${pagesCrawled}`, 'trace');
    const url = toVisit.shift();
    debug(`Shifted url: ${url}`, 'trace');
    if (visited.has(url) || failed.has(url)) {
      debug(`Skipping already visited/failed url: ${url}`, 'trace');
      continue;
    }
    debug(`Crawling: ${url}`, 'basic');
    try {
      debug(`Navigating to ${url}...`, 'basic');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      debug(`Navigation to ${url} complete.`, 'basic');
      await saveScreenshot(page, `after_navigation_${pagesCrawled}`);
      // LLaVA Vision API integration example
      try {
        const screenshotPath = `debug_llava_${pagesCrawled}.png`;
        await page.screenshot({ path: screenshotPath });
        const llavaAnswer = await queryLlavaVisionAPI(screenshotPath, 'What button should I click to accept cookies or privacy on this page?');
        debug(`[LLaVA][VISION] API answer: ${llavaAnswer}`, 'basic');
      } catch (e) {
        debug(`[LLaVA][VISION] API error: ${e.message}`, 'basic');
      }
      // Log all visible button/link text
      const allBtns = await page.$eval('button, input[type=button], input[type=submit], a', els => els.map(e => (e.textContent || e.value || '').trim()));
      debug(`[DEBUG] Visible buttons/links: ${JSON.stringify(allBtns)}`, 'verbose');
      // Step-by-step: log before/after every click attempt, add modal timeout
      let modalHandled = false;
      let modalTimeout = false;
      const modalStart = Date.now();
      
      // --- Vision LLM-powered smart modal handler (Hugging Face LLaVA) ---
      try {
      // Take screenshot
      const screenshotPath = `debug_modal_${pagesCrawled}.png`;
      await page.screenshot({ path: screenshotPath });
      debug(`[VISION][MODAL] Screenshot saved: ${screenshotPath}`, 'verbose');
      // Read screenshot as base64
      const imgB64 = fs.readFileSync(screenshotPath, { encoding: 'base64' });
      // Send to Hugging Face LLaVA
      const visionPrompt = 'What button or link should be clicked to accept cookies, privacy, or consent and proceed? Reply ONLY with the exact button or link text.';
      const hfResponse = await fetch('https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf', {
      method: 'POST',
      headers: {
      'Authorization': `Bearer ${HF_KEY}`,
      'Content-Type': 'application/json'
      },
      body: JSON.stringify({
      inputs: {
      image: imgB64,
      question: visionPrompt
      }
      })
      });
      const hfResult = await hfResponse.json();
      debug(`[VISION][MODAL] Hugging Face LLaVA response: ${JSON.stringify(hfResult)}`, 'verbose');
      if (hfResult && hfResult.answer) {
      const visionBtn = hfResult.answer.trim().replace(/^"|"$/g, '');
      debug(`[VISION][MODAL] Vision LLM suggests clicking: "${visionBtn}"`, 'basic');
      const btns = await page.$$('button, input[type=button], input[type=submit], a');
      let found = false;
      for (const btn of btns) {
      const txt = await page.evaluate(el => (el.textContent || el.value || '').trim(), btn);
      if (txt && txt.toLowerCase() === visionBtn.toLowerCase()) {
      debug(`[VISION][MODAL] Clicking button: ${txt}`, 'basic');
      await btn.click();
      await new Promise(r => setTimeout(r, 1500));
      modalHandled = true;
      found = true;
      break;
      }
      }
      if (!found) debug(`[VISION][MODAL] Vision LLM-suggested button not found.`, 'basic');
      }
      } catch (e) {
      debug(`[VISION][MODAL] Vision LLM modal handler error: ${e.message}`, 'basic');
      }
      // --- End Vision LLM handler ---
      
      // --- LLM-powered smart modal handler ---
      try {
      // Extract all visible modal/dialog text and button labels
      const modalInfo = await page.evaluate(() => {
      const modals = [];
      const selectors = [
      '[class*="modal"]', '[class*="cookie"]', '[class*="consent"]', '[class*="privacy"]', '[class*="overlay"]',
      '[id*="modal"]', '[id*="cookie"]', '[id*="consent"]', '[id*="privacy"]', '[id*="overlay"]',
      '[role="dialog"]', '[aria-modal="true"]'
      ];
      selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
      const text = el.innerText || el.textContent || '';
      if (text.trim().length > 0) modals.push(text.trim());
      });
      });
      // Get all visible button/link text
      const btns = Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], a'))
      .map(e => (e.textContent || e.value || '').trim())
      .filter(Boolean);
      return { modals, btns };
      });
        debug(`[LLM][MODAL] Modal/dialog text: ${JSON.stringify(modalInfo.modals)}`, 'verbose');
        debug(`[LLM][MODAL] Button/link options: ${JSON.stringify(modalInfo.btns)}`, 'verbose');
        if (modalInfo.modals.length > 0 && modalInfo.btns.length > 0 && OPENAI_KEY) {
          // Query OpenAI for the best button to click
          const prompt = `You are a web automation agent. Given the following modal/dialog text(s):\n${modalInfo.modals.join('\n---\n')}\nAnd the following button/link options:\n${modalInfo.btns.join(', ')}\nWhich button or link should be clicked to accept privacy/cookie/consent and proceed?\nAlways prefer buttons with text like 'Accept', 'Accept All', 'Consent', 'Agree', 'Allow', or similar. Only choose another option if none of those are present.\nReply ONLY with the exact button/link text to click, and nothing else.`;
          debug(`[LLM][MODAL] Sending prompt to OpenAI: ${prompt}`, 'trace');
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'You are a web automation agent.' },
                { role: 'user', content: prompt }
              ],
              max_tokens: 32
            })
          });
          const result = await response.json();
          debug(`[LLM][MODAL] OpenAI response: ${JSON.stringify(result)}`, 'verbose');
          let llmBtn = '';
          if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
            llmBtn = result.choices[0].message.content.trim().replace(/^"|"$/g, '');
          }
          if (llmBtn) {
          debug(`[LLM][MODAL] LLM suggests clicking: "${llmBtn}"`, 'basic');
          // Try to click the suggested button
          const btns = await page.$$('button, input[type=button], input[type=submit], a');
          let found = false;
          for (const btn of btns) {
          const txt = await page.evaluate(el => (el.textContent || el.value || '').trim(), btn);
          if (txt && txt.toLowerCase() === llmBtn.toLowerCase()) {
          debug(`[LLM][MODAL] Clicking button: ${txt}`, 'basic');
          await btn.click();
          await new Promise(r => setTimeout(r, 1500));
          modalHandled = true;
          found = true;
          break;
          }
          }
          // Fallback: if LLM suggestion not found, try to click any button with accept/consent/agree/allow
          if (!found) {
          debug(`[LLM][MODAL] LLM-suggested button not found. Trying fallback for accept/consent/agree/allow...`, 'basic');
          for (const btn of btns) {
          const txt = await page.evaluate(el => (el.textContent || el.value || '').trim().toLowerCase(), btn);
          if (txt && ['accept', 'accept all', 'consent', 'agree', 'allow'].some(pat => txt.includes(pat))) {
          debug(`[LLM][MODAL] Fallback: Clicking button: ${txt}`, 'basic');
          await btn.click();
          await new Promise(r => setTimeout(r, 1500));
          modalHandled = true;
          found = true;
          break;
          }
          }
          if (!found) debug(`[LLM][MODAL] No accept/consent/agree/allow button found in fallback.`, 'basic');
          }
          }
        }
      } catch (e) {
        debug(`[LLM][MODAL] LLM modal handler error: ${e.message}`, 'basic');
      }
      // --- End LLM-powered handler ---
      if (!modalHandled) {
        const modalStart = Date.now();
        for (let i = 0; i < 5; i++) {
          if (Date.now() - modalStart > 30000) { // 30s timeout
            debug('[DEBUG] Modal handling timeout reached.', 'basic');
            modalTimeout = true;
            break;
          }
          const btns = await page.$$('button, input[type=button], input[type=submit], a');
          debug(`[DEBUG] Found ${btns.length} buttons/links to check.`, 'trace');
          let clicked = false;
          for (const btn of btns) {
            const txt = await page.evaluate(el => (el.textContent || el.value || '').toLowerCase(), btn);
            debug(`[DEBUG] Checking button: ${txt}`, 'trace');
            if (txt && ['accept', 'consent', 'agree', 'continue', 'allow', 'yes', 'close'].some(pat => txt.includes(pat))) {
              debug(`Clicking button: ${txt}`, 'basic');
              await btn.click();
              await new Promise(r => setTimeout(r, 1500));
              clicked = true;
              modalHandled = true;
              break;
            }
          }
          if (clicked) break;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      if (!modalHandled) {
        debug('Brute-force: clicking every visible button/link...', 'basic');
        const btns = await page.$$('button, input[type=button], input[type=submit], a');
        for (const btn of btns) {
          const txt = await page.evaluate(el => (el.textContent || el.value || '').toLowerCase(), btn);
          debug(`[DEBUG] Checking button: ${txt}`, 'trace');
          if (
            (txt && ['accept', 'consent', 'agree', 'continue', 'allow', 'yes', 'close', '╳', '×'].some(pat => txt.includes(pat))) ||
            txt.trim() === '' // Click empty buttons/links as fallback
          ) {
            debug(`Clicking button: ${txt || '[empty]'}`, 'basic');
            await btn.click();
            await new Promise(r => setTimeout(r, 1500));
            modalHandled = true;
            break;
          }
        }
        // Try keyboard navigation
        for (let i = 0; i < 5; i++) {
          debug('[DEBUG] Keyboard Tab+Enter for modal handling.', 'trace');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Enter');
          await new Promise(r => setTimeout(r, 500));
        }
      }
      if (modalTimeout) debug('[DEBUG] Modal handling forcibly ended after timeout.', 'basic');
      // Try to remove overlays/modals from DOM
      await page.evaluate(() => {
        const selectors = [
          '[class*="modal"]', '[class*="cookie"]', '[class*="consent"]', '[class*="privacy"]', '[class*="overlay"]',
          '[id*="modal"]', '[id*="cookie"]', '[id*="consent"]', '[id*="privacy"]', '[id*="overlay"]',
          '[role="dialog"]', '[aria-modal="true"]'
        ];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => el.remove());
        });
      });
      await saveScreenshot(page, `after_modal_${pagesCrawled}`);
      try {
        await page.waitForSelector('.product, .products, .product-list, .product-grid, main, #main, .content', { timeout: 10000 });
        debug('Main content selector found.', 'verbose');
      } catch (e) {
        debug('Main content selector not found.', 'basic');
      }
      const html = await page.content();
      debug('Extracting products with Cheerio...', 'verbose');
      const productsRaw = await extractProductsCheerio(html);
      debug(`Raw extracted: ${productsRaw.length} items. Filtering with AI...`, 'verbose');
      const products = aiFilterProductNames(productsRaw);
      productsByPage[url] = products;
      const links = await page.evaluate((base) => {
        const found = [];
        const pdfs = [];
        document.querySelectorAll('a').forEach(el => {
          const href = el.getAttribute('href');
          if (!href) return;
          let absUrl = href.startsWith('http') ? href : base + (href.startsWith('/') ? href : '/' + href);
          if (absUrl.endsWith('.pdf')) pdfs.push(absUrl);
          else if (absUrl.startsWith(base) && !absUrl.includes('#')) found.push(absUrl);
        });
        return { found, pdfs };
      }, base);
      for (const link of links.found.map(normalizeUrl)) {
        if (!visited.has(link) && !toVisit.includes(link) && !failed.has(link)) {
          toVisit.push(link);
        }
      }
      for (const pdf of links.pdfs.map(normalizeUrl)) {
        pdfLinks.add(pdf);
      }
      visited.add(url);
      pagesCrawled++;
    } catch (e) {
      debug(`Error crawling ${url}: ${e.message}`, 'basic');
      failed.add(url);
    }
  }
  await browser.close();
  return { siteMap: Array.from(visited), failed: Array.from(failed), productsByPage, pdfLinks: Array.from(pdfLinks) };
}

// Dummy implementation to prevent crash
async function downloadAndAnalyzePDFs(pdfLinks, debugLevel) {
  return { pdfResults: [], downloaded: 0, parsed: 0, analyzed: 0 };
}

async function smartCrawlWithCoverageAndPDFs(url) {
  debug('Starting smart crawl with site map, coverage, and PDF analysis...', 'basic');
  debug('Calling crawlSiteMapPuppeteerWithPDFs...', 'basic');
  const { siteMap, failed, productsByPage, pdfLinks } = await crawlSiteMapPuppeteerWithPDFs(url, 50);
  debug('crawlSiteMapPuppeteerWithPDFs finished.', 'basic');
  const totalPages = siteMap.length + failed.length;
  const crawledPages = siteMap.length;
  const coverage = totalPages > 0 ? Math.round((crawledPages / totalPages) * 100) : 0;
  let allProducts = [];
  for (const pageUrl of siteMap) {
    allProducts.push(...(productsByPage[pageUrl] || []));
  }
  allProducts = Array.from(new Set(allProducts));
  const { pdfResults, downloaded, parsed, analyzed } = await downloadAndAnalyzePDFs(pdfLinks, DEBUG);
  debug(`Site map built. Total pages discovered: ${totalPages}`, 'basic');
  debug(`Pages crawled: ${crawledPages}`, 'basic');
  debug(`Coverage: ${coverage}%`, 'basic');
  debug(`PDFs found: ${pdfLinks.length}, downloaded: ${downloaded}, parsed: ${parsed}, analyzed: ${analyzed}`, 'basic');
  return {
    siteMap,
    failed,
    crawledPages,
    totalPages,
    coverage,
    products: allProducts,
    productsByPage,
    pdfLinks,
    pdfResults,
    pdfStats: { found: pdfLinks.length, downloaded, parsed, analyzed }
  };
}

if (require.main === module) {
  console.log('[MAIN] Script entry');
  const url = process.argv[2];
  const debugLevel = process.argv[3] || 'basic';
  setDebugLevel(debugLevel);
  console.log(`[MAIN] url: ${url}, debugLevel: ${debugLevel}`);
  if (!url) {
    console.log('Usage: node smart_crawler.js <startUrl> [debugLevel]');
    process.exit(1);
  }
  (async () => {
    try {
      console.log('[MAIN] Calling smartCrawlWithCoverageAndPDFs...');
      const result = await smartCrawlWithCoverageAndPDFs(url);
      console.log('--- Crawl Report ---');
      console.log(`Total pages discovered: ${result.totalPages}`);
      console.log(`Pages crawled: ${result.crawledPages}`);
      console.log(`Coverage: ${result.coverage}%`);
      console.log(`Failed pages: ${result.failed.length}`);
      console.log(`Products found: ${result.products.length}`);
      console.log(`PDFs found: ${result.pdfStats.found}, downloaded: ${result.pdfStats.downloaded}, parsed: ${result.pdfStats.parsed}, analyzed: ${result.pdfStats.analyzed}`);
      if (DEBUG_LEVELS.indexOf(debugLevel) >= DEBUG_LEVELS.indexOf('verbose')) {
        console.log('Site map:', result.siteMap);
        console.log('Failed:', result.failed);
        console.log('Products:', result.products);
        console.log('PDF Results:', result.pdfResults);
      }
    } catch (err) {
      console.error('[MAIN][ERROR]', err);
    }
  })();
}
