const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns');

/**
 * Checks DNS resolution for a given hostname.
 * @param {string} hostname
 * @returns {Promise<{ok: boolean, addresses?: string[], error?: string}>}
 */
async function checkDNS(hostname) {
  return new Promise((resolve) => {
    dns.resolve(hostname, (err, addresses) => {
      if (err) {
        resolve({ ok: false, error: err.message });
      } else {
        resolve({ ok: true, addresses });
      }
    });
  });
}

/**
 * Checks connectivity to a given URL and returns status and troubleshooting info.
 * @param {string} targetUrl
 * @returns {Promise<{ok: boolean, status?: number, error?: string, stack?: string}>}
 */
async function checkServerConnection(targetUrl) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(targetUrl);
      const lib = urlObj.protocol === 'https:' ? https : http;
      const req = lib.get(targetUrl, (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
        res.resume();
      });
      req.on('error', (err) => {
        resolve({ ok: false, error: err.message, stack: err.stack });
      });
      req.setTimeout(10000, () => {
        req.abort();
        resolve({ ok: false, error: 'Connection timed out' });
      });
    } catch (err) {
      resolve({ ok: false, error: err.message, stack: err.stack });
    }
  });
}

module.exports = { checkServerConnection, checkDNS };
