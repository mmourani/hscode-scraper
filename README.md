# HS Code Lookup & Tariff Comparison Tool

## Project Overview
This project provides a CLI-based tool for searching and comparing Harmonized System (HS) codes and import duties between the UAE and the US. It is designed to help importers/exporters, customs brokers, and researchers quickly identify the correct HS code and tariff for a given product in both countries.

## Current Features
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
- Compare HS codes and duties:
  ```sh
  node compare_hscode_cli.js <search terms> [--debug]
  ```
  Example:
  ```sh
  node compare_hscode_cli.js radio --debug
  ```

## What’s Next
- **Product/brand-aware search:** Parse queries for brand/model/type, identify country of origin, and match to the closest HS code in both countries.
- **Country of origin lookup:** Static map or web search for brand origin.
- **Datasheet integration:** (Optional) Scrape or fetch product datasheets for more accurate matching.
- **Customs/tariff calculator:** Estimate UAE customs fees based on duty and declared value.
- **Multi-country expansion:** Add EU/other country HS code/tariff datasets.
- **Web interface:** Build a user-friendly web app for search and comparison.
- **Testing and validation:** More real-world queries and edge cases.

## How to Contribute
- Fork the repo, create a branch, and submit a pull request.
- Open issues for bugs, feature requests, or data updates.

## License
MIT
