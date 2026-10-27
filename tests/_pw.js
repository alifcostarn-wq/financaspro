// Playwright do projeto, ou o instalado globalmente no ambiente (ex.: /opt/node22)
try { module.exports = require('playwright'); }
catch(_){ module.exports = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'); }
