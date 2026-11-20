// Перепроверка товаров Глобуса из src/prices.js: заголовок и цена прямо со страницы товара.
//   node tools/research/globus_check.js            — все товары globus
//   node tools/research/globus_check.js <goodId>…  — отдельные страницы /ru-kg/good/<id>
const fs = require('fs'), path = require('path'), vm = require('vm');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const strip = x => x.replace(/<[^>]+>/g, '').replace(/&nbsp;| /g, ' ').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
async function read(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ru' } });
  const html = await r.text();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  // цена самого товара стоит до первой карточки «похожих товаров»; если её там нет — товара нет в наличии
  const cut = html.indexOf('data-testid="product-card"');
  const pr = (cut > 0 ? html.slice(0, cut) : html).match(/data-testid="price-text"[^>]*>([\s\S]*?)<\/span><\/span>/);
  return { status: r.status, title: h1 ? strip(h1[1]) : '', price: pr ? strip(pr[1]) : 'НЕТ В НАЛИЧИИ' };
}
(async () => {
  const args = process.argv.slice(2);
  let list;
  if (args.length) list = args.map(id => [id, { url: 'https://globus-online.kg/ru-kg/good/' + id }]);
  else {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'prices.js'), 'utf8') + ';this.I=STORE_ITEMS;', ctx);
    list = Object.entries(ctx.I.globus);
  }
  for (const [id, it] of list) {
    try {
      const p = await read(it.url);
      const same = it.name ? (p.title === it.name ? 'OK ' : 'NAME') : '';
      console.log(`${id.padEnd(15)} ${same} ${String(it.price || '').padEnd(8)} page: ${p.price.padEnd(14)} | ${p.title}${it.name && p.title !== it.name ? '   [stored: ' + it.name + ']' : ''}`);
    } catch (e) { console.log(`${id}: ERROR ${e.message}`); }
    await new Promise(r => setTimeout(r, 300));
  }
})();
