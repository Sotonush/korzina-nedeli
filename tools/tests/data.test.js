// Данные: флаги здоровья, needs/batch, быстрые перекусы, салаты к супу, цены магазинов (@chilled, порог 50–200%),
// и правила сборщика цен. Запуск: node tools/tests/data.test.js
const path = require('path'), cp = require('child_process');
const { load, check, done, root } = require('./harness');
const A = load();
const ING = A.ev('ING'), RECIPES = A.ev('RECIPES'), ITEMS = A.ev('STORE_ITEMS');
const flags = r => r.flags || [];

// 1. 'salty' и 'whiteflour'
const SALTY_ING = ['sauerkraut', 'soy_sauce', 'tuna', 'ayran', 'pelmeni', 'chuchvara'];
for (const r of RECIPES) {
  const s = SALTY_ING.filter(i => r.ing[i]);
  if (s.length) check(`${r.id}: salty (${s.join(',')})`, flags(r).includes('salty'));
}
for (const id of ['shchi', 'kvashenaya_kurica', 'vinegret', 'teriyaki', 'fried_rice', 'wok_noodles', 'pelmeni', 'chuchvara'])
  check(`${id} помечено salty`, RECIPES.find(r => r.id === id) && flags(RECIPES.find(r => r.id === id)).includes('salty'));
const WF = ['bread', 'lepeshka', 'lavash', 'pasta', 'noodles', 'kesme', 'flour', 'semolina', 'pelmeni', 'chuchvara'];
for (const r of RECIPES) {
  const g = WF.reduce((a, i) => a + (r.ing[i] || 0), 0);
  if (g >= 15) check(`${r.id}: whiteflour (${g} г)`, flags(r).includes('whiteflour'));
}
for (const id of ['syrniki', 'oladyi_kefir', 'shakshuka', 'sup_lapsha', 'kesme', 'kabachk_oladyi'])
  check(`${id} помечено whiteflour`, flags(RECIPES.find(r => r.id === id) || {}).includes('whiteflour'));

// 1b. ржаной хлеб в магазинах и салаты к супу
check('bread_rye есть в ING', !!ING.bread_rye);
const ryeStores = Object.keys(ITEMS).filter(s => ITEMS[s].bread_rye && ITEMS[s].bread_rye.price > 0);
check('bread_rye продаётся минимум в 2 магазинах', ryeStores.length >= 2, ryeStores);
const sides = RECIPES.filter(r => r.side === true && !flags(r).includes('salty') && !flags(r).includes('whiteflour') && !r.soup);
check('≥2 овощных салата к супу без salty/whiteflour', sides.length >= 2, sides.map(r => r.id));

// 4. needs / batch
const NEEDS = new Set(['blender', 'oven']);
for (const r of RECIPES) {
  if (r.needs !== undefined) check(`${r.id}: needs — массив blender|oven`, Array.isArray(r.needs) && r.needs.length > 0 && r.needs.every(n => NEEDS.has(n)), r.needs);
  if (r.batch !== undefined) check(`${r.id}: batch — строка`, typeof r.batch === 'string' && r.batch.length >= 10);
  const st = r.steps.join(' ');
  if (/\d\s*°C/.test(st)) check(`${r.id}: духовка → needs oven`, (r.needs || []).includes('oven'));
}
for (const id of ['hummus', 'lentil_soup']) check(`${id}: needs blender`, (RECIPES.find(r => r.id === id).needs || []).includes('blender'));
check('kefir_banana не требует блендер', !(RECIPES.find(r => r.id === 'kefir_banana').needs || []).length);
check('batch-советы у плова и жаркопа', ['plov', 'zharkop', 'kuurdak'].every(id => RECIPES.find(r => r.id === id).batch));

// 5. быстрые перекусы
const quick = RECIPES.filter(r => r.types.includes('s') && r.time <= 15 && !r.prep);
check('≥10 быстрых перекусов без подготовки', quick.length >= 10, quick.length);
check('≥3 сладких быстрых перекуса', quick.filter(r => flags(r).includes('sweet')).length >= 3);
check('≥3 несладких быстрых перекуса', quick.filter(r => !flags(r).includes('sweet')).length >= 3);
const hum = RECIPES.find(r => r.id === 'hummus');
check('хумус сохраняет своё время и prep', hum.time >= 60 && !!hum.prep);

// 2–3. цены магазинов
const perKg = (size, price) => size === 'w' ? price : price / size * 1000;
for (const [st, items] of Object.entries(ITEMS)) for (const [id, it] of Object.entries(items)) {
  const [base, v] = id.split('@');
  check(`${st}/${id}: база в ING`, !!ING[base]);
  if (!ING[base]) continue;
  if (v !== undefined) check(`${st}/${id}: только @chilled для мяса с «охл» в названии`, v === 'chilled' && ING[base].cat === 'meat' && /охл/i.test(it.name), it.name);
  const r = perKg(it.size, it.price) / perKg(ING[base].sale, ING[base].price);
  check(`${st}/${id}: цена в 50–200% от ING`, r >= .5 && r <= 2, Math.round(r * 100) + '%');
}
check('нет баранины за 325 в Азии', !(ITEMS.asia && ITEMS.asia.mutton && ITEMS.asia.mutton.price < 500));
check('йогурт SPAR не питьевой', !(ITEMS.spar && ITEMS.spar.yogurt && /питьев/i.test(ITEMS.spar.yogurt.name)));
for (const st of Object.keys(ITEMS)) if (ITEMS[st].butter) check(`${st}: масло 72,5% как в ING`, !/82[,.]5/.test(ITEMS[st].butter.name) || !/72[,.]5/.test(ING.butter.n), ITEMS[st].butter.name);
const chilled = Object.entries(ITEMS).flatMap(([s, v]) => Object.keys(v).filter(k => /@chilled$/.test(k)).map(k => s + '/' + k));
check('есть охлаждённая курица хотя бы в одном магазине', chilled.length >= 1, chilled);
check('у приложения storeItem отдаёт @chilled', !!A.ev(`storeItem('globus','chicken_breast@chilled')`) || !ITEMS.globus['chicken_breast@chilled']);

// сборщик цен: порог по справочной цене и сверка с src/prices.js
const S = require(path.join(root, 'tools', 'scraper', 'scrape.js'));
check('сборщик: 325 сом/кг баранины — подозрительно', !!S.refProblem('asia/mutton', 1000, 324.99));
check('сборщик: обычная цена — ок', S.refProblem('globus/chicken_breast', 'w', 400) === null);
check('сборщик: @chilled сверяется с базовым продуктом', S.refProblem('globus/chicken_breast@chilled', 'w', 554) === null && !!S.refProblem('globus/chicken_breast@chilled', 'w', 2000));
check('сборщик: пачка пересчитывается в кг', S.refProblem('spar/nuts', 120, 226) !== null);
{
  const log = { changed: [], miss: [], suspicious: [], sync: [] };
  const item = { name: 'x', size: 'w', price: 750 };
  S.accept(item, 330, log, 'asia/mutton');
  check('accept: подозрительная цена не записывается', item.price === 750 && log.suspicious.length === 1, log);
  const item2 = { name: 'x', size: 'w', price: 450 };
  S.accept(item2, 470, log, 'globus/chicken_breast');
  check('accept: нормальная цена записывается', item2.price === 470);
  const data = { items: { globus: { butter: { name: 'старое масло', url: 'u', size: 200, price: 1 }, gone: { name: 'g', url: 'g', size: 'w', price: 1 } } } };
  S.syncFromSource(data, log);
  check('сверка: @chilled попадает в prices.json', !!data.items.globus['chicken_breast@chilled'] || !ITEMS.globus['chicken_breast@chilled']);
  check('сверка: заменённый товар заменён', data.items.globus.butter.name === ITEMS.globus.butter.name);
  check('сверка: убранный товар удалён', !data.items.globus.gone);
}

// валидатор целиком
const v = cp.spawnSync(process.execPath, [path.join(root, 'tools', 'validate-data.js')], { encoding: 'utf8' });
check('validate-data: ALL CHECKS PASSED', v.status === 0 && /ALL CHECKS PASSED/.test(v.stdout), (v.stdout || '').split('\n').filter(l => /^ - /.test(l)).slice(0, 5));

done('data');
