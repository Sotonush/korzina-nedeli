// Сборка: shell.html + data.js + prices.js + src/js/*.js (+ progress.js/css, если есть) -> dist/korzina-nedeli.html
// Для проверки с тестовыми ценами: PRICES=tools/fixtures/prices.sample.js node tools/build.js
//   -> dist/korzina-nedeli.fixture.html (основной файл при этом не трогается, тестовые цены в него не попадают).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => { const p = path.isAbsolute(f) ? f : path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const fixture = process.env.PRICES;
const data = [rd('src/data.js'), fixture ? rd(fixture) : rd('src/prices.js')].join('\n');
const app = [require('./sources').appSource(), ';render();'].join('\n');
const out = rd('src/shell.html')
  .replace('/*@CSS@*/', () => rd('src/progress.css'))
  .replace('/*@DATA@*/', () => data)
  .replace('/*@APP@*/', () => app);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const file = fixture ? 'dist/korzina-nedeli.fixture.html' : 'dist/korzina-nedeli.html';
fs.writeFileSync(path.join(root, file), out);
console.log('built', file, out.length, 'bytes');
