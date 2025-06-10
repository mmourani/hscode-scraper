const config = require('./config');
const { checkServerConnection, checkDNS } = require('./utils');
const { scrapeHSCodes } = require('./scraper');

// Generate search prefixes "01" to "99" (can be customized)
const searchTerms = Array.from({ length: 99 }, (_, i) => (i + 1).toString().padStart(2, '0'));

(async () => {
  // Check server connection before launching browser
  console.log(`\n🌐 Checking connection to: ${config.TARGET_URL}`);
  const urlObj = new URL(config.TARGET_URL);
  const hostname = urlObj.hostname;
  // Step 1: DNS resolution
  const dnsResult = await checkDNS(hostname);
  if (!dnsResult.ok) {
    console.error(`\n❌ DNS resolution failed for ${hostname}`);
    console.error(`Error: ${dnsResult.error}`);
    console.error('Check your internet connection or DNS settings.');
    process.exit(1);
  } else {
    console.log(`✅ DNS resolved: ${hostname} → ${dnsResult.addresses.join(', ')}`);
  }
  // Step 2: HTTP(S) connection
  const connResult = await checkServerConnection(config.TARGET_URL);
  if (!connResult.ok) {
    console.error(`\n❌ Cannot connect to server: ${config.TARGET_URL}`);
    if (connResult.status) {
      console.error(`HTTP status code: ${connResult.status}`);
      if (connResult.status >= 400 && connResult.status < 500) {
        console.error('Client error: The page may not exist or you may be blocked.');
      } else if (connResult.status >= 500) {
        console.error('Server error: The website may be down.');
      }
    }
    if (connResult.error) {
      console.error(`Error: ${connResult.error}`);
      if (connResult.stack) {
        console.error(`Stack: ${connResult.stack}`);
      }
      if (connResult.error.includes('ENOTFOUND')) {
        console.error('DNS error: Check your internet connection or the URL.');
      } else if (connResult.error.includes('ECONNREFUSED')) {
        console.error('Connection refused: The server may be blocking requests.');
      } else if (connResult.error.includes('timed out')) {
        console.error('Timeout: The server is not responding.');
      }
    }
    // Step 3: Try curl for further diagnosis
    console.log('\n🔍 Running curl for further diagnosis...');
    const { execSync } = require('child_process');
    try {
      const curlOut = execSync(`curl -I --max-time 10 ${config.TARGET_URL}`, { encoding: 'utf8' });
      console.log('curl output:\n' + curlOut);
    } catch (curlErr) {
      console.error('curl error:\n' + curlErr.message);
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful. Proceeding with scraping...');
  }

  await scrapeHSCodes(searchTerms);
})();