// Query parser for extracting brand, model, and type from product search queries
// and mapping brands to countries of origin and sector/category (static map for now)
//
// Sources: Wikipedia 'List of electronics brands', 'List of mobile phone brands by country',
//          and other public brand/country lists. Additions: defense/communications brands, manufacturing, furniture, etc.

const BRAND_INFO_MAP = {
  // Defense & Security
  'silvus': { country: 'US', category: 'Defense & Security' },
  'l3harris': { country: 'US', category: 'Defense & Security' },
  'elbit': { country: 'Israel', category: 'Defense & Security' },
  'rafael': { country: 'Israel', category: 'Defense & Security' },
  'israel aerospace': { country: 'Israel', category: 'Defense & Security' },
  'bae': { country: 'UK', category: 'Defense & Security' },
  'leonardo': { country: 'Italy', category: 'Defense & Security' },
  'mbda': { country: 'France', category: 'Defense & Security' },
  'saab': { country: 'Sweden', category: 'Defense & Security' },
  'indra': { country: 'Spain', category: 'Defense & Security' },
  'cobham': { country: 'UK', category: 'Defense & Security' },
  'rohde': { country: 'Germany', category: 'Defense & Security' },
  'schwarz': { country: 'Germany', category: 'Defense & Security' },
  'harris': { country: 'US', category: 'Defense & Security' },
  'teledyne': { country: 'US', category: 'Defense & Security' },
  'flir': { country: 'US', category: 'Defense & Security' },
  'drs': { country: 'US', category: 'Defense & Security' },
  'quantum systems': { country: 'Germany', category: 'Defense & Security' },
  'centum': { country: 'India', category: 'Defense & Security' },
  // Communications
  'motorola': { country: 'US', category: 'Communications' },
  'cisco': { country: 'US', category: 'Communications' },
  'juniper': { country: 'US', category: 'Communications' },
  'nokia': { country: 'Finland', category: 'Communications' },
  'ericsson': { country: 'Sweden', category: 'Communications' },
  'huawei': { country: 'China', category: 'Communications' },
  'zte': { country: 'China', category: 'Communications' },
  'qualcomm': { country: 'US', category: 'Communications' },
  'garmin': { country: 'US', category: 'Communications' },
  // Manufacturing/Industrial
  'bosch': { country: 'Germany', category: 'Manufacturing' },
  'siemens': { country: 'Germany', category: 'Manufacturing' },
  'abb': { country: 'Switzerland', category: 'Manufacturing' },
  'schneider': { country: 'France', category: 'Manufacturing' },
  'mitsubishi': { country: 'Japan', category: 'Manufacturing' },
  'honeywell': { country: 'US', category: 'Manufacturing' },
  // Antennas & RF
  'rohde': { country: 'Germany', category: 'Antennas & RF' },
  'schwarz': { country: 'Germany', category: 'Antennas & RF' },
  'cobham': { country: 'UK', category: 'Antennas & RF' },
  // Vehicles (including drones, UGV, USV, etc.)
  'tesla': { country: 'US', category: 'Vehicles' },
  'boeing': { country: 'US', category: 'Vehicles' },
  'airbus': { country: 'France', category: 'Vehicles' },
  'lockheed': { country: 'US', category: 'Vehicles' },
  'northrop': { country: 'US', category: 'Vehicles' },
  'general dynamics': { country: 'US', category: 'Vehicles' },
  'ford': { country: 'US', category: 'Vehicles' },
  'toyota': { country: 'Japan', category: 'Vehicles' },
  'honda': { country: 'Japan', category: 'Vehicles' },
  'dji': { country: 'China', category: 'Drones' },
  'quantum systems': { country: 'Germany', category: 'Drones' },
  'ugv': { country: 'Various', category: 'Unmanned Ground Vehicle' },
  'usv': { country: 'Various', category: 'Unmanned Surface Vehicle' },
  'uav': { country: 'Various', category: 'Unmanned Aerial Vehicle' },
  // Furniture
  'ikea': { country: 'Sweden', category: 'Furniture' },
  'herman miller': { country: 'US', category: 'Furniture' },
  'steelcase': { country: 'US', category: 'Furniture' },
  'ashley': { country: 'US', category: 'Furniture' },
  'tables': { country: 'Various', category: 'Furniture' },
  'chairs': { country: 'Various', category: 'Furniture' },
  // Clothing
  'nike': { country: 'US', category: 'Clothing' },
  'adidas': { country: 'Germany', category: 'Clothing' },
  'uniqlo': { country: 'Japan', category: 'Clothing' },
  'zara': { country: 'Spain', category: 'Clothing' },
  'h&m': { country: 'Sweden', category: 'Clothing' },
  // Electronics/Tech (general)
  'apple': { country: 'US', category: 'Electronics' },
  'dell': { country: 'US', category: 'Electronics' },
  'hp': { country: 'US', category: 'Electronics' },
  'ibm': { country: 'US', category: 'Electronics' },
  'microsoft': { country: 'US', category: 'Electronics' },
  'google': { country: 'US', category: 'Electronics' },
  'sony': { country: 'Japan', category: 'Electronics' },
  'panasonic': { country: 'Japan', category: 'Electronics' },
  'sharp': { country: 'Japan', category: 'Electronics' },
  'nec': { country: 'Japan', category: 'Electronics' },
  'fujitsu': { country: 'Japan', category: 'Electronics' },
  'casio': { country: 'Japan', category: 'Electronics' },
  'hitachi': { country: 'Japan', category: 'Electronics' },
  'kyocera': { country: 'Japan', category: 'Electronics' },
  'jvc': { country: 'Japan', category: 'Electronics' },
  'olympus': { country: 'Japan', category: 'Electronics' },
  'sanyo': { country: 'Japan', category: 'Electronics' },
  'yamaha': { country: 'Japan', category: 'Electronics' },
  'asus': { country: 'Taiwan', category: 'Electronics' },
  'htc': { country: 'Taiwan', category: 'Electronics' },
  'acer': { country: 'Taiwan', category: 'Electronics' },
  'msi': { country: 'Taiwan', category: 'Electronics' },
  'gigabyte': { country: 'Taiwan', category: 'Electronics' },
  'benq': { country: 'Taiwan', category: 'Electronics' },
  'xiaomi': { country: 'China', category: 'Electronics' },
  'lenovo': { country: 'China', category: 'Electronics' },
  'oppo': { country: 'China', category: 'Electronics' },
  'vivo': { country: 'China', category: 'Electronics' },
  'oneplus': { country: 'China', category: 'Electronics' },
  'meizu': { country: 'China', category: 'Electronics' },
  'coolpad': { country: 'China', category: 'Electronics' },
  'tcl': { country: 'China', category: 'Electronics' },
  'hisense': { country: 'China', category: 'Electronics' },
  // Add more as needed
};

function parseQuery(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let brand = null;
  let model = null;
  let type = null;
  let category = null;
  let country = null;

  // Multi-word brand support: check all possible consecutive token combinations (longest first)
  for (let len = Math.min(tokens.length, 4); len > 0; len--) { // up to 4-word brands
    for (let i = 0; i <= tokens.length - len; i++) {
      const candidate = tokens.slice(i, i + len).join(' ');
      if (BRAND_INFO_MAP[candidate]) {
        brand = candidate;
        country = BRAND_INFO_MAP[candidate].country;
        category = BRAND_INFO_MAP[candidate].category;
        // Model is next token after brand, if present
        if (i + len < tokens.length) {
          model = tokens[i + len];
        }
        // Type is next token after model, if present
        if (model && i + len + 1 < tokens.length) {
          type = tokens[i + len + 1];
        }
        return { brand, model, type, country, category };
      }
    }
  }

  // If no brand, assume first token is type
  type = tokens[0];
  return { brand, model, type, country, category };
}

module.exports = { parseQuery, BRAND_INFO_MAP };
