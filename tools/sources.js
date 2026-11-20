// Общий список исходников для сборок и тестов.
// Логика приложения разбита на части в src/js/ (склеиваются по порядку имён), чтобы над разными частями
// могли одновременно работать несколько разработчиков.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rd = f => { const p = path.isAbsolute(f) ? f : path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const appSource = () => fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).sort()
  .map(f => rd('src/js/' + f)).join('\n') + '\n' + rd('src/progress.js');
module.exports = { root, rd, appSource };
