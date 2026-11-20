// Сборка сайта для GitHub Pages: docs/index.html + манифест + офлайн-режим + иконки.
// Цены приложение берёт из docs/prices.json (его каждый день обновляет сборщик цен).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const rd = f => { const p = path.join(root, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const out = path.join(root, 'docs');
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });

const shell = rd('src/shell.html');
const cut = shell.indexOf('<div id="app">');
if (cut < 0) throw new Error('В shell.html нет <div id="app">');
const headPart = shell.slice(0, cut)
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '')
  .replace('/*@CSS@*/', () => rd('src/progress.css'));
const bodyPart = shell.slice(cut)
  .replace('/*@DATA@*/', () => [rd('src/data.js'), rd('src/prices.js')].join('\n'))
  .replace('/*@APP@*/', () => [rd('src/app.js'), rd('src/progress.js'), ';render();'].join('\n'));

const live = `<script>
// Свежие цены из prices.json (обновляются автоматически раз в день).
(function(){
  fetch('prices.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).then(p => {
    if (p && typeof applyLivePrices === 'function') applyLivePrices(p);
  }).catch(() => {});
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
</script>`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
${headPart.trim()}
</head>
<body>
${bodyPart.trim()}
${live}
</body>
</html>
`;
const version = crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'sw.js'), rd('web/sw.js').replace('__BUILD__', version));
fs.copyFileSync(path.join(root, 'web/manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
for (const f of fs.readdirSync(path.join(root, 'web/icons'))) fs.copyFileSync(path.join(root, 'web/icons', f), path.join(out, 'icons', f));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('docs/ собран, версия', version, '·', Math.round(html.length / 1024), 'КБ');
