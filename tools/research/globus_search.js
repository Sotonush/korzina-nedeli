// Поиск товаров на globus-online.kg (для ручного подбора).
//   node tools/research/globus_search.js "печень говяжья" "рис девзира" ...
// Печатает: цена | цена за кг (если указан вес) | название | id (для ссылки /ru-kg/good/<id>)
const parse = require('./parse_lavka.js');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const num = s => parseFloat(String(s).replace(/\s| /g, '').replace(',', '.'));
function perKg(name, price, unit) {
  if (/\/кг/.test(price)) return num(price);
  const m = name.match(/(\d+(?:[.,]\d+)?)\s*(кг|г|гр|мл|л)\b/i);
  if (!m) return NaN;
  let g = num(m[1]); const u = m[2].toLowerCase();
  if (u === 'кг' || u === 'л') g *= 1000;
  return num(price) / g * 1000;
}
(async () => {
  for (const q of process.argv.slice(2)) {
    const r = await fetch('https://globus-online.kg/ru-kg/search?text=' + encodeURIComponent(q), { headers: { 'user-agent': UA, 'accept-language': 'ru' } });
    const items = parse(await r.text());
    console.log(`\n=== ${q} (${items.length})`);
    for (const p of items) {
      const k = perKg(p.name, p.price, p.unit);
      console.log(`${p.price.padEnd(14)} ${isNaN(k) ? '' : ('~' + Math.round(k) + '/кг').padEnd(9)} ${p.name}${p.old ? ' [было ' + p.old + ']' : ''} | ${p.id}`);
    }
    await new Promise(r => setTimeout(r, 400));
  }
})();
