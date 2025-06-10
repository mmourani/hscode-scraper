const fs = require('fs');
const path = require('path');

function searchHSCode(query, data, maxResults = 5, debug = false) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = data
    .map(item => {
      const desc = (item.description || '').toLowerCase();
      let score = 0;
      if (desc === q) score = 3;
      else if (desc.includes(q)) score = 2;
      else if (tokens.some(word => desc.includes(word))) score = 1;
      return { ...item, score, debug: { desc, tokens } };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  if (debug) {
    console.log('\n[DEBUG] Query tokens:', tokens);
    results.forEach((item, idx) => {
      console.log(`[DEBUG] Match #${idx + 1}: Score=${item.score} | HS=${item.hs_code} | Duty=${item.duty}`);
      console.log(`[DEBUG] Description: ${item.description}`);
      console.log(`[DEBUG] Matched tokens:`, tokens.filter(word => item.debug.desc.includes(word)));
    });
  }
  return results;
}

function printComparison(query, uaeResults, usResults) {
  console.log(`\nResults for: "${query}"`);
  console.log('='.repeat(60));
  console.log('UAE HS Code'.padEnd(15) + 'UAE Duty'.padEnd(12) + 'UAE Description');
  uaeResults.forEach(item => {
    console.log(
      (item.hs_code || '').padEnd(15) +
      (item.duty || '').padEnd(12) +
      (item.description || '').slice(0, 60)
    );
  });
  console.log('-'.repeat(60));
  console.log('US HS Code'.padEnd(15) + 'US Duty'.padEnd(12) + 'US Description');
  usResults.forEach(item => {
    console.log(
      (item.hs_code || '').padEnd(15) +
      (item.duty || '').padEnd(12) +
      (item.description || '').slice(0, 60)
    );
  });
  console.log('='.repeat(60));
}

function main() {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const filteredArgs = args.filter(arg => arg !== '--debug');
  if (filteredArgs.length === 0) {
    console.log('Usage: node compare_hscode_cli.js <search terms> [--debug]');
    process.exit(1);
  }
  const query = filteredArgs.join(' ');
  const uaePath = path.join(__dirname, 'hs_codes_uae.json');
  const usPath = path.join(__dirname, 'hs_codes_us.json');
  if (!fs.existsSync(uaePath) || !fs.existsSync(usPath)) {
    console.error('Required data files not found. Please run the extraction scripts first.');
    process.exit(1);
  }
  const uaeData = JSON.parse(fs.readFileSync(uaePath, 'utf8'));
  const usData = JSON.parse(fs.readFileSync(usPath, 'utf8'));
  const uaeResults = searchHSCode(query, uaeData, 5, debug);
  const usResults = searchHSCode(query, usData, 5, debug);
  printComparison(query, uaeResults, usResults);
}

main();
