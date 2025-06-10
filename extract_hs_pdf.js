const fs = require('fs');
const pdf = require('pdf-parse');

async function extractHSData(pdfPath, outputPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  const lines = data.text.split(/\r?\n/);

  // Heuristic: look for lines with HS code patterns (e.g., 01 01 21 10 or 01012110)
  const hsPattern = /\b(\d{2}(?:\s?\d{2}){0,3})\b/;
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(hsPattern);
    if (match) {
      // Try to extract code, description, and duty
      const code = match[1].replace(/\s/g, '');
      // Look for duty rate (e.g., 5% VALUE, Free VALUE, ممنوع استيراده PROHIBITED)
      let duty = null;
      let desc = line.replace(match[1], '').trim();
      // Duty may be on the same line or previous/next line
      if (/\b(\d+%|Free|ممنوع استيراده|PROHIBITED)\b/i.test(line)) {
        duty = line.match(/(\d+%|Free|ممنوع استيراده|PROHIBITED)/i)[1];
      } else if (i > 0 && /\b(\d+%|Free|ممنوع استيراده|PROHIBITED)\b/i.test(lines[i-1])) {
        duty = lines[i-1].match(/(\d+%|Free|ممنوع استيراده|PROHIBITED)/i)[1];
      } else if (i < lines.length-1 && /\b(\d+%|Free|ممنوع استيراده|PROHIBITED)\b/i.test(lines[i+1])) {
        duty = lines[i+1].match(/(\d+%|Free|ممنوع استيراده|PROHIBITED)/i)[1];
      }
      // Description may be on the same line or next line
      if (!desc || desc.length < 5) {
        if (i < lines.length-1) desc = lines[i+1].trim();
      }
      results.push({
        hs_code: code,
        description: desc,
        duty: duty || ''
      });
    }
  }

  // Deduplicate by hs_code
  const seen = new Set();
  const deduped = results.filter(item => {
    if (seen.has(item.hs_code)) return false;
    seen.add(item.hs_code);
    return true;
  });

  fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
  console.log(`Extracted ${deduped.length} HS codes to ${outputPath}`);
}

extractHSData('HS Code.pdf', 'hs_codes_uae.json');
