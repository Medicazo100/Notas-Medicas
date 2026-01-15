const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.tsx': 'text/javascript',
  '.ts': 'text/javascript'
};

const server = http.createServer((req, res) => {
  // Manejo básico de rutas para SPA (Single Page Application)
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Si no tiene extensión, asumimos que es una ruta de React y servimos index.html
  if (!path.extname(filePath)) {
     filePath = path.join(__dirname, 'index.html');
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback final a index.html
        fs.readFile(path.join(__dirname, 'index.html'), (error, baseContent) => {
            if (error) {
                res.writeHead(500);
                res.end('Error interno del servidor: No se encuentra index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(baseContent, 'utf-8');
            }
        });
      } else {
        res.writeHead(500);
        res.end(`Error del servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});