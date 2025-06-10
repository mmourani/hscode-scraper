# Dubai Customs HS Code Scraper

A Node.js script using Playwright to scrape HS code data from the Dubai Customs website. The script automates data extraction, handles pagination, and saves results to a JSON file. Manual CAPTCHA solving is required.

---

## Features
- Automated scraping of HS codes, short and long descriptions
- Handles pagination and errors robustly
- Saves results to a JSON file
- Progress persistence and resume support (planned)
- Configurable via CLI and config file (planned)
- Structured logging (planned)

---

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/hscode-scraper.git
   cd hscode-scraper
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Install Playwright browsers:**
   ```sh
   npx playwright install
   ```

---

## Usage

Run the scraper:
```sh
node scrape-hscodes.js
```

- The browser will open. Manually solve the CAPTCHA and submit the search.
- Press ENTER in the terminal when the first page is fully loaded.
- The script will scrape all pages and save results to `uae_hscodes_full.json`.

### Planned CLI Options
- `--output <file>`: Specify output file name
- `--headless`: Run browser in headless mode
- `--start-page <n>`: Resume from a specific page

---

## Troubleshooting
- If the script fails, check `debug.html` for the last page state.
- Ensure you have a stable internet connection.
- For Playwright issues, see [Playwright docs](https://playwright.dev/).

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
MIT
