require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { syncHumaans } = require('./humaans');
const { findPeople } = require('./search');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const WORKSPACE = process.env.SLACK_WORKSPACE || 'manychat';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function send(res, status, body, contentType = 'application/json') {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

function handleSearch(url, res) {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return send(res, 200, JSON.stringify({ query: q, count: 0, results: [] }));

  const { matches, nicknames } = findPeople(q);
  const results = matches.map(({ emp, score }) => ({
    id: emp.id,
    firstName: emp.firstName,
    surname: emp.surname,
    fullName: [emp.firstName, emp.surname].filter(Boolean).join(' '),
    position: emp.position,
    department: emp.department,
    location: emp.location,
    timezone: emp.timezone,
    email: emp.email,
    slackId: emp.slackHandle || null,
    slackProfileUrl: emp.slackHandle ? `https://${WORKSPACE}.slack.com/team/${emp.slackHandle}` : null,
    nicknames: nicknames[emp.firstName] || [],
    score,
  }));

  send(res, 200, JSON.stringify({ query: q, count: results.length, results }));
}

function handleStatic(req, res) {
  const filename = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
  const filePath = path.join(PUBLIC_DIR, filename);
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    return send(res, 404, JSON.stringify({ error: 'Not found' }));
  }
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  send(res, 200, fs.readFileSync(filePath), types[ext] || 'text/plain');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/search') return handleSearch(url, res);
  if (req.method === 'GET') return handleStatic(req, res);
  send(res, 405, JSON.stringify({ error: 'Method not allowed' }));
});

(async () => {
  await syncHumaans();
  server.listen(PORT, () => {
    console.log(`🌐 aka search UI: http://localhost:${PORT}`);
  });
})();
