# HS Code Lookup & Tariff Comparison Tool

## Project Overview
This project provides a CLI-based tool for searching and comparing Harmonized System (HS) codes and import duties between the UAE and the US. It is designed to help importers/exporters, customs brokers, and researchers quickly identify the correct HS code and tariff for a given product in both countries.

## Current Features
- **Intelligence-based brand/product HS code matching**: Uses a structured knowledge base to map brands (e.g., Quantum Systems, Silvus) and their products to the correct HS codes for multiple countries.
- **Smart fallback and related keyword logic**: If no direct match is found, the tool suggests the closest alternative HS codes using synonyms and related product categories (e.g., for "drone": "UAV", "unmanned", "aircraft").
- **Definition-based fallback**: For generic terms (e.g., "cloths", "chair"), the tool uses a mapping of product types to broader categories (e.g., "cloths" ��� "textile", "fabric", "apparel") and suggests plausible HS code categories, prompting the user to refine their search.
- **Cross-country code recommendation**: If no logical UAE code is found, the tool searches the US dataset and recommends the US code if it is more valid and closer to reality for the product.
- **Direct HS code lookup**: Enter an HS code to get the official description and duty from both UAE and US datasets.
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

## Plan & Next Steps
- **Expand brand intelligence:** Add more brands, products, and HS code mappings to `brand_products.json`.
- **Enhance related keyword and definition mapping:** Add more synonyms, related categories, and definitions to `related_keywords.json` and `definition_map.json` for smarter fallback.
- **International HS code mapping:** Integrate official correlation tables for more accurate cross-country code suggestions (including EU dataset).
- **Web interface:** Build a user-friendly web app for search and comparison.
- **Datasheet/product scraping:** (Optional) Integrate datasheet or product scraping for even more accurate matching.
- **Testing and validation:** Continue to test with real-world queries and edge cases, and refine the intelligence and fallback logic.

## How to Contribute
- Fork the repo, create a branch, and submit a pull request.
- Open issues for bugs, feature requests, or data updates.

## License
MIT
