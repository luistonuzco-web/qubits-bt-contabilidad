const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const allowed = new Set(['index.html', 'app.js', 'styles.css', 'auth.css', 'income.js', 'suppliers.js']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const port = Number(process.env.PORT || 4173);

http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (!allowed.has(name)) { res.writeHead(404).end('Not found'); return; }
  const file = path.join(root, name);
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`QUBITS-BT lista en http://localhost:${port}`));
