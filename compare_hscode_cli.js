const fs = require('fs');
const path = require('path');
const { parseQuery } = require('./query_parser');

// Load brand intelligence
let brandProducts = {};
try {
  brandProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'brand_products.json'), 'utf8'));
} catch (e) {
  brandProducts = {};
}

function searchHSCode(query, data, parsed, maxResults = 5, debug = false, defaultDuty = null) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const brand = parsed.brand;
  const category = parsed.category;
  const results = data
    .map(item => {
      const desc = (item.description || '').toLowerCase();
      let score = 0;
      if (desc === q) score = 3;
      else if (desc.includes(q)) score = 2;
      else if (tokens.some(word => desc.includes(word))) score = 1;
      // Boost score if brand or category matches in description
      if (brand && desc.includes(brand)) score += 2;
      if (category && desc.includes(category.toLowerCase())) score += 1;
      // Always show duty, default if missing
      let duty = (item.duty !== undefined && item.duty !== null && item.duty !== '') ? item.duty : defaultDuty;
      return { ...item, score, duty, debug: { desc, tokens, brand, category } };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  if (debug) {
    console.log('\n[DEBUG] Query tokens:', tokens);
    console.log('[DEBUG] Parsed:', parsed);
    results.forEach((item, idx) => {
      console.log(`[DEBUG] Match #${idx + 1}: Score=${item.score} | HS=${item.hs_code} | Duty=${item.duty}`);
      console.log(`[DEBUG] Description: ${item.description}`);
      console.log(`[DEBUG] Matched tokens:`, tokens.filter(word => item.debug.desc.includes(word)));
      if (brand) console.log(`[DEBUG] Brand match:`, item.debug.desc.includes(brand));
      if (category) console.log(`[DEBUG] Category match:`, item.debug.desc.includes(category.toLowerCase()));
    });
  }
  return results;
}

function printComparison(query, parsed, uaeResults, usResults) {
  console.log(`\nResults for: "${query}"`);
  if (parsed) {
    console.log('[PARSED]', parsed);
  }
  console.log('='.repeat(60));
  console.log('UAE HS Code'.padEnd(15) + 'UAE Duty'.padEnd(12) + 'UAE Description');
  uaeResults.forEach(item => {
    console.log(
      (item.hs_code || '').padEnd(15) +
      (item.duty !== undefined && item.duty !== null ? String(item.duty) : '').padEnd(12) +
      (item.description || '').slice(0, 60)
    );
  });
  console.log('-'.repeat(60));
  console.log('US HS Code'.padEnd(15) + 'US Duty'.padEnd(12) + 'US Description');
  usResults.forEach(item => {
    console.log(
      (item.hs_code || '').padEnd(15) +
      (item.duty !== undefined && item.duty !== null ? String(item.duty) : '').padEnd(12) +
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
    console.log('Usage: node compare_hscode_cli.js <search terms|HS code> [--debug]');
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

  // If the query is a valid HS code (all digits, length 6-8), do direct lookup
  const hsCodePattern = /^\d{6,8}$/;
  if (hsCodePattern.test(query)) {
    const uaeMatch = uaeData.find(item => item.hs_code === query);
    const usMatch = usData.find(item => item.hs_code === query);
    console.log(`\nHS Code Lookup: ${query}`);
    console.log('='.repeat(60));
    if (uaeMatch) {
      console.log(`[UAE] Description: ${uaeMatch.description}`);
      console.log(`[UAE] Duty: ${uaeMatch.duty || '5%'}`);
    } else {
      console.log('[UAE] Not found');
    }
    console.log('-'.repeat(60));
    if (usMatch) {
      console.log(`[US] Description: ${usMatch.description}`);
      console.log(`[US] Duty: ${usMatch.duty || ''}`);
    } else {
      console.log('[US] Not found');
    }
    console.log('='.repeat(60));
    return;
  }

  // Otherwise, do normal keyword/category search
  const parsed = parseQuery(query);

  // Brand intelligence debug/info
  let intelligenceResults = null;
  if (parsed.brand && brandProducts[parsed.brand]) {
    const brandInfo = brandProducts[parsed.brand];
    console.log(`[INFO] Brand intelligence for '${parsed.brand}' (${brandInfo.country}):`);
    brandInfo.products.forEach(prod => {
      console.log(`  - ${prod.name}:`);
      Object.entries(prod.hs_codes).forEach(([country, code]) => {
        console.log(`      [${country.toUpperCase()}] HS Code: ${code}`);
      });
    });
    // If a product type is detected, suggest the best HS code
    let match = null;
    if (parsed.model || parsed.type) {
      match = brandInfo.products.find(prod =>
        (parsed.model && prod.type && prod.type.includes(parsed.model)) ||
        (parsed.type && prod.type && prod.type.includes(parsed.type)) ||
        (parsed.model && prod.keywords && prod.keywords.includes(parsed.model)) ||
        (parsed.type && prod.keywords && prod.keywords.includes(parsed.type))
      );
      if (match) {
        console.log(`[SUGGEST] Best match for '${parsed.model || parsed.type}': ${match.name}`);
        Object.entries(match.hs_codes).forEach(([country, code]) => {
          console.log(`      [${country.toUpperCase()}] HS Code: ${code}`);
        });
        // Fetch and display the mapped HS code(s) and their descriptions/duties from the datasets
        intelligenceResults = {
          uae: uaeData.find(item => item.hs_code === match.hs_codes.uae),
          us: usData.find(item => item.hs_code === match.hs_codes.us)
        };
      }
    }
    console.log('-'.repeat(60));
  }

  if (intelligenceResults && (intelligenceResults.uae || intelligenceResults.us)) {
    console.log('[RESULT] Intelligence-based HS Code Match:');
    if (intelligenceResults.uae) {
      console.log(`[UAE] HS Code: ${intelligenceResults.uae.hs_code}`);
      console.log(`[UAE] Description: ${intelligenceResults.uae.description}`);
      console.log(`[UAE] Duty: ${intelligenceResults.uae.duty || '5%'}`);
    } else {
      console.log('[UAE] Not found');
    }
    console.log('-'.repeat(60));
    if (intelligenceResults.us) {
      console.log(`[US] HS Code: ${intelligenceResults.us.hs_code}`);
      console.log(`[US] Description: ${intelligenceResults.us.description}`);
      console.log(`[US] Duty: ${intelligenceResults.us.duty || ''}`);
    } else {
      console.log('[US] Not found');
    }
    console.log('='.repeat(60));
    process.exit(0); // Hard exit to prevent any further output
  }

  // Only do fallback search if no intelligence match
  // If a brand is detected and has known product types, restrict fallback to relevant keywords
  let fallbackKeywords = [];
  if (parsed.brand && brandProducts[parsed.brand]) {
    fallbackKeywords = brandProducts[parsed.brand].products
      .map(p => p.keywords)
      .flat();
  }

  function smartFilter(results) {
    if (fallbackKeywords.length === 0) return [];
    // Only keep results whose description contains a high-priority related term (not just any keyword)
    // Use related_keywords.json for strict fallback
    let relatedKeywords = [];
    try {
      const relatedMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'related_keywords.json'), 'utf8'));
      if (parsed.model && relatedMap[parsed.model]) {
        relatedKeywords = relatedMap[parsed.model];
      } else if (parsed.type && relatedMap[parsed.type]) {
        relatedKeywords = relatedMap[parsed.type];
      }
    } catch (e) {}
    // If we have related keywords, require at least one of them to be present
    if (relatedKeywords.length > 0) {
      return results.filter(item => {
        const desc = (item.description || '').toLowerCase();
        return relatedKeywords.some(kw => desc.includes(kw));
      });
    }
    // Otherwise, fallback to original fallbackKeywords
    return results.filter(item => {
      const desc = (item.description || '').toLowerCase();
      return fallbackKeywords.some(kw => desc.includes(kw));
    });
  }

  let uaeResults = searchHSCode(query, uaeData, parsed, 5, debug, '5%');
  let usResults = searchHSCode(query, usData, parsed, 5, debug, '');
  uaeResults = smartFilter(uaeResults);
  usResults = smartFilter(usResults);

  if (uaeResults.length === 0 && usResults.length === 0) {
    console.log('No logical fallback HS code found for this brand/product.');
    // Try related/synonym keywords for the product type/model
    let relatedKeywords = [];
    try {
      const relatedMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'related_keywords.json'), 'utf8'));
      if (parsed.model && relatedMap[parsed.model]) {
        relatedKeywords = relatedMap[parsed.model];
      } else if (parsed.type && relatedMap[parsed.type]) {
        relatedKeywords = relatedMap[parsed.type];
      }
    } catch (e) {}
    if (relatedKeywords.length > 0) {
      // Search for related keywords in the dataset
      function relatedFilter(results) {
        return results.filter(item => {
          const desc = (item.description || '').toLowerCase();
          return relatedKeywords.some(kw => desc.includes(kw));
        });
      }
      let uaeRelated = relatedFilter(searchHSCode(query, uaeData, parsed, 20, false, '5%'));
      let usRelated = relatedFilter(searchHSCode(query, usData, parsed, 20, false, ''));
      if (uaeRelated.length > 0 || usRelated.length > 0) {
        console.log('Closest alternative(s) based on related category/keywords:');
        printComparison(query, parsed, uaeRelated.slice(0, 5), usRelated.slice(0, 5));
        return;
      }
    }
    // Try definition-based mapping for generic product types
    let definitionKeywords = [];
    try {
      const defMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'definition_map.json'), 'utf8'));
      if (parsed.type && defMap[parsed.type]) {
        definitionKeywords = defMap[parsed.type];
      } else if (parsed.model && defMap[parsed.model]) {
        definitionKeywords = defMap[parsed.model];
      } else if (query && defMap[query.toLowerCase()]) {
        definitionKeywords = defMap[query.toLowerCase()];
      }
    } catch (e) {}
    if (definitionKeywords.length > 0) {
      function defFilter(results) {
        return results.filter(item => {
          const desc = (item.description || '').toLowerCase();
          return definitionKeywords.some(kw => desc.includes(kw));
        });
      }
      let uaeDef = defFilter(searchHSCode(query, uaeData, parsed, 30, false, '5%'));
      let usDef = defFilter(searchHSCode(query, usData, parsed, 30, false, ''));
      // If UAE fallback is empty but US fallback is plausible, recommend US code
      if (uaeDef.length === 0 && usDef.length > 0) {
        console.log('No logical UAE HS code found. The US code(s) below are more valid and closer to reality for this product:');
        printComparison(query, parsed, [], usDef.slice(0, 5));
        console.log('Consider using the US code as a reference for your product.');
        return;
      }
      // If both UAE and US codes are found, show both and recommend the more plausible one
      if (uaeDef.length > 0 || usDef.length > 0) {
        console.log('No direct match for this term. Based on definition, possible categories:');
        printComparison(query, parsed, uaeDef.slice(0, 5), usDef.slice(0, 5));
        if (usDef.length > 0 && (uaeDef.length === 0 || usDef[0].score > (uaeDef[0]?.score || 0))) {
          console.log('The US code(s) may be more valid for this product.');
        }
        console.log('Please refine your search (e.g., more specific product type or material).');
        return;
      }
    }
    return;
  }

  printComparison(query, parsed, uaeResults, usResults);
}

main();
