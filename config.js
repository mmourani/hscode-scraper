// Configuration for HS Code Scraper

module.exports = {
  TARGET_URL: 'https://www.dubaicustoms.gov.ae/en/eServices/Pages/HScodesearch.aspx',
  OUTPUT_FILE: 'uae_hscodes_full.json',
  DEBUG_FILE: 'debug.html',
  SELECTORS: {
    iframe: 'iframe',
    tableRow: 'table#hscodeResult tbody tr',
    tableCell: 'table#hscodeResult tbody tr td',
    nextButton: 'ul.pagination li.next',
    backButton: 'text=Back',
    longDescLabel: 'text=Long Description:'
  }
};
