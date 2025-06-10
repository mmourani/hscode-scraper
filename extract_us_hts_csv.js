const fs = require('fs');
const readline = require('readline');

function parseCSVLine(line) {
  // Basic CSV split (does not handle quoted commas)
  return line.split(',').map(x => x.trim().replace(/^"|"$/g, ''));
}

async function extractUSHTS(csvPath, outputPath) {
  const input = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let headers = [];
  const results = [];
  let lineNum = 0;
  for await (const line of rl) {
    if (lineNum === 0) {
      headers = parseCSVLine(line);
    } else {
      const cols = parseCSVLine(line);
      // Find relevant columns (code, description, duty)
      const code = cols[0] || '';
      const description = cols[1] || '';
      // Try to find a column with 'General' or 'Duty' in the header
      let duty = '';
      for (let i = 0; i < headers.length; i++) {
        if (/general|duty/i.test(headers[i])) {
          duty = cols[i];
          break;
        }
      }
      if (code && description) {
        results.push({
          hs_code: code.replace(/\D/g, ''),
          description,
          duty: duty || ''
        });
      }
    }
    lineNum++;
  }
  // Deduplicate by hs_code
  const seen = new Set();
  const deduped = results.filter(item => {
    if (seen.has(item.hs_code)) return false;
    seen.add(item.hs_code);
    return true;
  });
  fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
  console.log(`Extracted ${deduped.length} US HTS codes to ${outputPath}`);
}

extractUSHTS('hts_2024_basic_edition_csv.csv', 'hs_codes_us.json');
