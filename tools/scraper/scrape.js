// Ежедневная проверка цен (без ИИ). Запускается GitHub Actions каждое утро.
// Берёт прошлые цены из docs/prices.json, перепроверяет каждый товар на странице магазина
// и записывает обновлённый файл. Если товар не найден или цена выглядит ошибкой —
// оставляет прошлую цену и помечает её датой последней удачной проверки.
//
//   node tools/scraper/scrape.js            — все магазины
//   node tools/scraper/scrape.js globus     — только указанные
//   node tools/scraper/scrape.js --init     — создать docs/prices.json из src/prices.js
//   node tools/scraper/scrape.js --sync     — только перенести в docs/prices.json правки из src/prices.js, без проверки цен
//
// Перед каждой проверкой список товаров сверяется с src/prices.js (ручной подбор): новые товары добавляются,
// заменённые (другое название, ссылка или фасовка) — заменяются, убранные — удаляются; цены тех же товаров сохраняются.
// Ключи вида <ingId>@chilled (охлаждённая курица) проверяются как все остальные.
// Цена считается подозрительной (остаётся прошлая, причина пишется в лог), если за день она изменилась больше чем на 60%
// или если за кг (упаковка пересчитывается в кг) она ниже 50% или выше 200% справочной цены продукта из src/data.js —
// так отсекаются чужие товары, цены «за 0,5 кг» и ошибки разбора. Тот же порог проверяет tools/validate-data.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const OUT = path.join(root, 'docs', 'prices.json');
const today = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10); // время Бишкека (UTC+6)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MAX_JUMP = 0.6; // изменение больше чем на 60% за день считаем ошибкой разбора
const REF_LO = 0.5, REF_HI = 2; // допустимая цена за кг относительно справочной цены ING (как в validate-data.js)

function fromSource() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'src', 'prices.js'), 'utf8') + ';this.P={date:PRICES_DATE,stores:STORE_INFO,items:STORE_ITEMS};', ctx);
  const p = JSON.parse(JSON.stringify(ctx.P));
  for (const s in p.items) for (const id in p.items[s]) p.items[s][id].checked = p.date;
  return p;
}

// Справочные цены продуктов из src/data.js: сом за кг (упаковки пересчитаны).
function loadRefs() {
  try {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(root, 'src', 'data.js'), 'utf8') + ';this.I=ING;', ctx);
    const out = {};
    for (const [id, x] of Object.entries(ctx.I)) if (x && x.price > 0) out[id] = x.sale === 'w' ? x.price : x.price / x.sale * 1000;
    return out;
  } catch (e) { console.log('src/data.js не прочитан — проверка по справочной цене отключена: ' + e.message); return {}; }
}
const REFS = loadRefs();
const perKg = (size, price) => size === 'w' ? price : price / size * 1000;
// key — «магазин/ingId» или «магазин/ingId@chilled». null — цена правдоподобна, иначе текст причины.
function refProblem(key, size, price) {
  const ref = REFS[String(key).split('/').pop().split('@')[0]];
  if (!ref || !(size === 'w' || size > 0)) return null;
  const kg = perKg(size, price), r = kg / ref;
  return r < REF_LO || r > REF_HI ? `${Math.round(kg)} сом/кг = ${Math.round(r * 100)}% от справочной ${Math.round(ref)}` : null;
}

const norm = s => String(s || '').toLowerCase().replace(/­/g, '').replace(/ё/g, 'е').replace(/[«»"'.,()]/g, ' ').replace(/\s+/g, ' ').trim();
// Слова названия без мелочей: «5 Морей» и «5Морей», «зам.» и «зам» считаются одним и тем же.
const tokens = s => norm(s).replace(/(\d)\s*(г|гр|мл|л|кг)\b/g, '$1$2').replace(/(\d)\s+(?=[а-яa-z])/g, '$1').split(' ')
  .map(w => w.replace(/^собств.*/, 'собств')).filter(w => (w.length >= 3 || /\d/.test(w)) && !STOP.has(w));
const STOP = new Set(['вес', 'весовой', 'весовая', 'шт', 'упак', 'импорт', 'т/п', 'ж/б']);
const near = (w, list) => list.some(x => x === w || (x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x))));
// Доля совпавших слов минус штраф за лишние слова у товара (маринад, копчёное и т.п.).
function similarity(a, b) { if (!a.length || !b.length) return 0; return a.filter(w => near(w, b)).length / a.length - .5 * b.filter(w => !near(w, a)).length / b.length; }
const num = s => { const m = String(s).replace(/ | /g, ' ').match(/(\d[\d ]*(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(/ /g, '').replace(',', '.')) : NaN; };
function accept(item, price, log, key) {
  if (!(price > 0)) { log.miss.push(key); return; }
  const jump = Math.abs(price - item.price) / item.price;
  if (jump > MAX_JUMP) { log.suspicious.push(`${key}: ${item.price} → ${price} (скачок больше 60%)`); return; }
  const bad = refProblem(key, item.size, price);
  if (bad) { log.suspicious.push(`${key}: ${item.price} → ${price} (${bad}; оставлена прошлая цена)`); return; }
  if (price !== item.price) log.changed.push(`${key}: ${item.price} → ${price}`);
  item.price = price; item.checked = today; delete item.stale;
}

/* ---------- Глобус: страница товара отдаётся сразу с ценой ---------- */
async function scrapeGlobus(items, log) {
  for (const [id, item] of Object.entries(items)) {
    try {
      const r = await fetch(item.url, { headers: { 'user-agent': UA, 'accept-language': 'ru' } });
      if (!r.ok) { log.miss.push(`globus/${id} (HTTP ${r.status})`); continue; }
      const html = await r.text();
      // Цена самого товара стоит до первой карточки «похожих товаров»; если её там нет — товара нет в наличии.
      const cut = html.indexOf('data-testid="product-card"');
      const m = (cut > 0 ? html.slice(0, cut) : html).match(/data-testid="price-text"[^>]*>([\s\S]*?)<\/span><\/span>/);
      if (!m) { log.miss.push(`globus/${id} (нет в наличии)`); continue; }
      accept(item, num(m[1].replace(/<[^>]+>/g, '')), log, `globus/${id}`);
    } catch (e) { log.miss.push(`globus/${id} (${e.message})`); }
    await new Promise(r => setTimeout(r, 400)); // бережно к сайту
  }
}

/* ---------- Азия и SPAR: магазины в Glovo, нужен браузер ---------- */
// Glovo отвечает серверам GitHub медленно, поэтому: долгое ожидание, повтор и второй проход
// по всему, что не загрузилось, с паузой и новой вкладкой.
const firstLine = m => String(m).split(/\r?\n/)[0];
async function glovoItem(page, item, id) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[class*=ItemRow_itemRowBody]', { timeout: 30000 });
      break;
    } catch (e) { if (attempt >= 1) return { err: firstLine(e.message) }; await page.waitForTimeout(5000); }
  }
  await page.waitForTimeout(2000);
  const rows = await page.$$eval('[class*=ItemRow_itemRowBody]', els => els.map(e => e.innerText));
  const chilled = /@chilled$/.test(id || '');
  const cands = rows.map(t => { const lines = t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const pl = lines.find(s => /KGS|сом/i.test(s) && !s.startsWith('-')); return { title: lines[0], price: pl ? num(pl) : NaN }; })
    .filter(c => c.price > 0)
    // охлаждённый товар (@chilled) ищем только среди «охл…», обычный — только среди не охлаждённых
    .filter(c => chilled === /охл/i.test(c.title || ''));
  // Сначала точное название с сайта (запоминается после первой удачной проверки), затем похожее.
  let hit = item.match && cands.find(c => c.title === item.match);
  if (!hit) {
    const want = tokens(item.name);
    const scored = cands.map(c => ({ c, s: similarity(want, tokens(c.title)) - Math.min(.5, Math.abs(c.price - item.price) / item.price) }))
      .sort((a, b) => b.s - a.s);
    if (scored[0] && scored[0].s >= .55) hit = scored[0].c;
  }
  return hit ? { hit } : { err: 'нет в выдаче' };
}
async function scrapeGlovo(storeKey, items, log, browser) {
  let todo = Object.entries(items).slice(0, +process.env.LIMIT || undefined); // LIMIT=5 — для пробного запуска
  for (let pass = 1; pass <= 2 && todo.length; pass++) {
    if (pass > 1) await new Promise(r => setTimeout(r, 20000));
    const page = await browser.newPage({ userAgent: UA, locale: 'ru-RU' });
    const failed = [];
    for (const [id, item] of todo) {
      let res; try { res = await glovoItem(page, item, id); } catch (e) { res = { err: firstLine(e.message) }; }
      if (res.hit) {
        accept(item, res.hit.price, log, `${storeKey}/${id}`);
        if (item.price === res.hit.price) item.match = res.hit.title;
      } else if (pass < 2) failed.push([id, item]);
      else log.miss.push(`${storeKey}/${id} (${res.err})`);
      await page.waitForTimeout(1200);
    }
    await page.close();
    todo = failed;
  }
}

// Переносит ручные правки из src/prices.js в docs/prices.json, сохраняя свежие цены тех же товаров.
function syncFromSource(data, log) {
  const src = fromSource();
  data.stores = src.stores;
  data.items = data.items || {};
  for (const s of Object.keys(data.items)) if (!src.items[s]) { delete data.items[s]; log.sync.push(`${s}: магазин убран`); }
  for (const [s, items] of Object.entries(src.items)) {
    const cur = data.items[s] || (data.items[s] = {});
    for (const id of Object.keys(cur)) if (!items[id]) { delete cur[id]; log.sync.push(`${s}/${id}: убран`); }
    for (const [id, it] of Object.entries(items)) {
      const old = cur[id];
      if (!old) { cur[id] = it; log.sync.push(`${s}/${id}: добавлен «${it.name}» — ${it.price}`); }
      else if (old.name !== it.name || old.url !== it.url || old.size !== it.size) { cur[id] = it; log.sync.push(`${s}/${id}: «${old.name}» → «${it.name}» — ${it.price}`); }
    }
  }
}

module.exports = { refProblem, accept, syncFromSource, REF_LO, REF_HI };
if (require.main === module) (async () => {
  const args = process.argv.slice(2);
  if (args.includes('--init') || !fs.existsSync(OUT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(fromSource(), null, 1));
    console.log('docs/prices.json создан из src/prices.js');
    if (args.includes('--init')) return;
  }
  const data = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const log = { changed: [], miss: [], suspicious: [], sync: [] };
  syncFromSource(data, log);
  if (args.includes('--sync')) {
    fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
    console.log(`docs/prices.json сверен с src/prices.js: изменений ${log.sync.length}` + (log.sync.length ? '\n  ' + log.sync.join('\n  ') : ''));
    return;
  }
  const only = args.filter(a => !a.startsWith('--'));
  const stores = Object.keys(data.items).filter(s => !only.length || only.includes(s));

  if (stores.includes('globus')) await scrapeGlobus(data.items.globus, log);
  const glovo = stores.filter(s => s !== 'globus');
  if (glovo.length) {
    let chromium;
    try { ({ chromium } = require('playwright')); } catch { console.log('playwright не установлен — Азия/SPAR пропущены'); }
    if (chromium) {
      const browser = await chromium.launch();
      for (const s of glovo) await scrapeGlovo(s, data.items[s], log, browser);
      await browser.close();
    }
  }
  // Цены, которые давно не удавалось проверить, помечаем — приложение покажет дату.
  for (const s in data.items) for (const it of Object.values(data.items[s])) if (it.checked !== today) it.stale = true;
  data.date = today;
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1));

  const total = stores.reduce((n, s) => n + Object.keys(data.items[s]).length, 0);
  console.log(`Проверено ${total} товаров. Изменилось: ${log.changed.length}. Не найдено: ${log.miss.length}. Подозрительных: ${log.suspicious.length}. Сверка с src/prices.js: ${log.sync.length}.`);
  for (const k of ['sync', 'changed', 'suspicious', 'miss']) if (log[k].length) console.log(`\n${k}:\n  ` + log[k].join('\n  '));
})().catch(e => { console.error(e); process.exit(1); });
