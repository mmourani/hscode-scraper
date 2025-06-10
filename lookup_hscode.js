const fs = require('fs');
const path = require('path');

function searchHSCode(query, data, maxResults = 10) {
  const q = query.toLowerCase();
  // Score: exact match > partial match > fuzzy
  const results = data
    .map(item => {
      const desc = (item.description || '').toLowerCase();
      let score = 0;
      if (desc === q) score = 3;
      else if (desc.includes(q)) score = 2;
      else if (q.split(' ').some(word => desc.includes(word))) score = 1;
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node lookup_hscode.js <search terms>');
    process.exit(1);
  }
  const query = args.join(' ');
  const dataPath = path.join(__dirname, 'hs_codes_uae.json');
  if (!fs.existsSync(dataPath)) {
    console.error('hs_codes_uae.json not found. Please run the extraction script first.');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const results = searchHSCode(query, data);
  if (results.length === 0) {
    console.log('No results found for:', query);
  } else {
    console.log(`Results for: "${query}"`);
    results.forEach(item => {
      console.log(`HS Code: ${item.hs_code} | Duty: ${item.duty}\nDescription: ${item.description}\n---`);
    });
  }
}

main();
