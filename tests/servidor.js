// Serve o app por HTTP local: origem estável (no file:// o Chromium às vezes recarrega com o localStorage vazio)
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const TIPOS = { '.html':'text/html; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon',
  '.webmanifest':'application/manifest+json', '.json':'application/json', '.js':'application/javascript', '.css':'text/css' };
module.exports = () => new Promise(ok => {
  const srv = http.createServer((q, s) => {
    const f = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
    if(!f.startsWith(RAIZ)) { s.writeHead(403); return s.end(); }
    fs.readFile(f, (e, b) => {
      if(e){ s.writeHead(404); return s.end(); }
      s.writeHead(200, { 'content-type':TIPOS[path.extname(f)] || 'application/octet-stream' }); s.end(b);
    });
  });
  srv.listen(0, '127.0.0.1', () => ok({ url:`http://127.0.0.1:${srv.address().port}/index.html`, fechar:() => srv.close() }));
});
