const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const storage = require('./storage');

const PORT = 4321;
const SRC_DIR = path.join(__dirname, 'src');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Obsługa API do trwałego zapisu i odczytu quizów
  if (req.url === '/api/quizzes' && req.method === 'GET') {
    const quizzes = storage.getQuizzes();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(quizzes));
  }

  if (req.url === '/api/quizzes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const quizzes = JSON.parse(body);
        storage.saveQuizzes(quizzes);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Nieprawidłowy format danych' }));
      }
    });
    return;
  }

  // Serwowanie plików statycznych z katalogu src
  let safePath = req.url.split('?')[0];
  if (safePath === '/' || safePath === '') safePath = '/index.html';
  const filePath = path.join(SRC_DIR, safePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Nie znaleziono pliku');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  const appUrl = `http://localhost:${PORT}`;
  console.log(`\n======================================================`);
  console.log(` QuizApp Desktop - Serwer lokalny aktywny na porcie ${PORT}`);
  console.log(` Trwałe dane: ${storage.DATA_FILE}`);
  console.log(` Uruchamianie dedykowanego okna aplikacji desktopowej...`);
  console.log(`======================================================\n`);

  // Uruchomienie dedykowanego okna aplikacji desktopowej w trybie aplikacji bez pasków przeglądarki
  // Tryb --app tworzy czyste, samodzielne okno aplikacji w systemie Windows (Edge lub Chrome)
  const edgeCmd = `start msedge --app="${appUrl}" --window-size=1120,820 --user-data-dir="%TEMP%\\QuizAppProfile"`;
  const chromeCmd = `start chrome --app="${appUrl}" --window-size=1120,820 --user-data-dir="%TEMP%\\QuizAppProfile"`;

  exec(edgeCmd, (err) => {
    if (err) {
      // Jeśli Edge nie jest dostępny, spróbuj z Google Chrome
      exec(chromeCmd, (errChrome) => {
        if (errChrome) {
          // Ostateczny fallback - domyślna przeglądarka
          exec(`start ${appUrl}`);
        }
      });
    }
  });
});
