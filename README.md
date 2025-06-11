# HS Code Lookup & Tariff Comparison Tool

## Project Overview
This project provides a CLI-based tool for searching and comparing Harmonized System (HS) codes, import/export duties, and trade requirements between the UAE, US, China, and EU. It is designed to help importers/exporters, customs brokers, and researchers quickly identify the correct HS code, tariff, and all relevant import/export rules for a given product in multiple countries.

---

## Development Status (June 2024)

- **China HS code scraper**: Fully automated, supports batch/resume, extracts all customs/CIQ requirements and rich detail. (Run multiple times to complete full import.)
- **US, UAE, EU importers**: Basic data imported; enrichment to China-level detail is planned.
- **Database**: Supports rich/nested data for customs/CIQ requirements and extra info per HS code.
- **CLI tools**: Brand/product-aware search, direct code lookup, and cross-country fallback logic.
- **Next steps**: See below for roadmap and action items.

---

## EU Access2Markets Scraper Debugging Status (June 2024)

- The Puppeteer script (`scrape_eu_access2markets.js`) was updated to run in non-headless mode and capture a screenshot after attempting to load the results page.
- The script currently fails with a TimeoutError while waiting for the selector `input#product`. This suggests the page structure may have changed, or a modal (such as a cookie or privacy prompt) is blocking the input.
- A screenshot (`screenshot.png`) is generated after the page loads. This file should be checked to see the actual rendered state and debug why the selector is not found.

**Next Steps / Action Items:**
1. Open `screenshot.png` in the project directory to inspect the page state at the time of failure.
2. Adjust the Puppeteer script to handle any new modals, popups, or changes in the page structure as seen in the screenshot.
3. Re-run the script and repeat until the correct selectors are found and the data is extracted successfully.
4. Once working, update the script and documentation accordingly.

**Status:**
- [x] Script updated to non-headless mode and screenshot capture
- [x] Script executed, screenshot generated
- [ ] Debug page state using screenshot
- [ ] Update script to handle new page structure or modals
- [ ] Verify successful data extraction

## Current Features
- **Intelligence-based brand/product HS code matching**: Uses a structured knowledge base to map brands (e.g., Quantum Systems, Silvus) and their products to the correct HS codes for multiple countries.
- **Smart fallback and related keyword logic**: If no direct match is found, the tool suggests the closest alternative HS codes using synonyms and related product categories (e.g., for "drone": "UAV", "unmanned", "aircraft").
- **Definition-based fallback**: For generic terms (e.g., "cloths", "chair"), the tool uses a mapping of product types to broader categories (e.g., "cloths" → "textile", "fabric", "apparel") and suggests plausible HS code categories, prompting the user to refine their search.
- **Cross-country code recommendation**: If no logical UAE code is found, the tool searches the US dataset and recommends the US code if it is more valid and closer to reality for the product. The tool will clearly show the code and description from any available country and suggest using it for UAE import if missing.
- **Smart fallback suggestions for generic queries**: For generic terms (like "radio", "cloths", "chair"), the tool provides a list of specific, real-world product types (e.g., "PTT radio", "VHF radio", "t-shirt", "office chair") to help refine the search and find the most relevant HS code.
- **Multilingual support**: Users can write their search in French or another language if they are not fluent in English. The tool will try to understand and help.
- **Direct HS code lookup**: Enter an HS code to get the official description and duty from both UAE and US datasets, with normalization for code length (6, 8, or 10 digits).
- **UAE HS code extraction** from Sharjah Customs PDF (hs_codes_uae.json)
- **US HS code extraction** from USITC CSV (hs_codes_us.json)
- **CLI tools** for searching and comparing HS codes and duties
- **Debug/verbose mode** for search logic validation
- **Scripts for data extraction** from both PDF and CSV sources

## Usage
### 1. Extract Data
- UAE: `node extract_hs_pdf.js` (requires HS Code.pdf)
- US: `node extract_us_hts_csv.js` (requires hts_2024_basic_edition_csv.csv`)

### 2. Search & Compare
- **Brand/product-aware search:**
  ```sh
  node compare_hscode_cli.js "quantum systems" drone --debug
  node compare_hscode_cli.js "silvus" radio --debug
  ```
  The tool will use its intelligence layer to suggest the correct HS code(s) and show the official description/duty. If no direct match is found, it will suggest the closest alternatives using related keywords.

- **Direct HS code lookup:**
  ```sh
  node compare_hscode_cli.js 85258300
  ```
  This will return the description and duty for the code from both UAE and US datasets.

- **General search & compare:**
  ```sh
  node compare_hscode_cli.js <search terms> [--debug]
  ```
  Example:
  ```sh
  node compare_hscode_cli.js radio --debug
  ```

## Intelligence Layer & Fallback Logic
- The tool uses `brand_products.json` to map brands and their products to the correct HS codes for each country.
- If no direct match is found, it uses `related_keywords.json` to search for synonyms and related categories, suggesting the closest plausible HS codes.
- If no logical fallback exists, the tool uses `definition_map.json` to map generic product types to broader categories (e.g., "cloths" → "textile", "fabric", "apparel").
- If no logical UAE code is found, the tool searches the US dataset and recommends the US code if it is more valid and closer to reality for the product.
- If no plausible code is found, the tool outputs a clear message and does not show irrelevant results.

## Current State (June 2025)

- All major country datasets (China, US, EU, UAE) are harmonized in the database, with code, description, duty, and extra_info fields.
- US and UAE data now include compliance fields (e.g., ECCN, ITAR, TDRA approval) for key products.
- Product mapping (brand_products.json) is used for brand/product-aware search and reporting.
- A global product map (global_product_map.json) has been generated, covering all HS codes/categories in the world, making every product category queryable and reportable for any country.
- Search/reporting scripts can now display all mapped products and accessories for a brand, or any product category, with correct country-specific HS code and import/export info.
- The system now supports robust compliance, regulatory, and multilingual queries for any product or HS code.
- Scripts: generate_global_product_map.py (builds the global map from the database), test_global_product_map.py (example queries/tests).

## Updated Action Plan

### Immediate Next Steps
- **Global product mapping:**
  - Use generate_global_product_map.py to create a comprehensive product map from all HS codes/categories in the database.
  - Use this map for all search, reporting, and compliance queries.
- **Expand brand/product mapping:**
  - Continue to add all known products and accessories for each brand (e.g., Quantum Systems: Vector, Trinity, Twister, all accessories) to brand_products.json for brand-aware queries.
- **Automate product-to-database sync:**
  - Use sync_product_map_to_db.py to ensure all products in brand_products.json are also present in the hscodes table, with country-specific info.
- **Improve search/reporting:**
  - Enhance scripts to always show all mapped products and accessories for a brand, or any product category, with the best available info for each country.
- **Continue compliance enrichment:**
  - Add more compliance fields (export/import permits, licensing, regulatory notes) to extra_info for key products/codes.
- **Documentation and validation:**
  - Keep documentation and product mapping up to date as new products/countries are added.

### Ongoing/Planned
- **Expand brand intelligence:** Add more brands, products, and HS code mappings to `brand_products.json`.
- **Enhance related keyword and definition mapping:** Add more synonyms, related categories, and definitions to `related_keywords.json` and `definition_map.json` for smarter fallback and more specific suggestions for generic queries.
- **Expand multilingual support:** Add more language mappings and improve detection for non-English queries.
- **International HS code mapping:** Integrate official correlation tables for more accurate cross-country code suggestions (including EU dataset).
- **Datasheet/product scraping:** (Optional) Integrate datasheet or product scraping for even more accurate matching.
- **Testing and validation:** Continue to test with real-world queries and edge cases, and refine the intelligence and fallback logic.
- **Community feedback:** Encourage users to suggest new product types, languages, and improvements via GitHub issues or pull requests.

---

## Action Checklist
- [x] Batch/resume China HS code scraper
- [x] Rich database schema for customs/CIQ/extra info
- [x] Importers for US, UAE, EU, China
- [x] Enrich US, EU, UAE data to China-level detail (compliance, regulatory, extra_info)
- [x] Brand/product-aware search and reporting
- [ ] Complete China import (run scraper to finish)
- [ ] Expand product mapping for all brands/countries
- [ ] Automate product-to-database sync
- [ ] Build cross-border trade rule query logic
- [ ] Web app interface (planned)

---

## How to Contribute
- Fork the repo, create a branch, and submit a pull request.
- Open issues for bugs, feature requests, or data updates.

## License
MIT
