// Локальный просмотр: оборачивает dist в такой же каркас, как при публикации.
// /fixture — сборка с тестовыми ценами (dist/korzina-nedeli.fixture.html), только для проверки.
const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((q,r)=>{const f=q.url.startsWith('/fixture')&&fs.existsSync(path.join(__dirname,'../dist/korzina-nedeli.fixture.html'))?'korzina-nedeli.fixture.html':'korzina-nedeli.html';
const body=fs.readFileSync(path.join(__dirname,'../dist',f),'utf8');
r.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
r.end('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'+body+'</body></html>');}).listen(5178);
