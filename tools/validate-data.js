// Validates src/data.js and src/prices.js. Run: node tools/validate-data.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__ING = ING; globalThis.__RECIPES = RECIPES;', ctx);
const ING = ctx.__ING, RECIPES = ctx.__RECIPES;
const pctx = {};
vm.createContext(pctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'prices.js'), 'utf8') + '\n;globalThis.__P = {date: PRICES_DATE, info: STORE_INFO, items: STORE_ITEMS};', pctx);
const PRICES = pctx.__P;

const errors = [];
const err = (m) => errors.push(m);

const REQUIRED = 'chicken_breast chicken_thigh beef mince mutton turkey fish tuna eggs milk kefir tvorog yogurt cheese smetana butter rice rice_long buckwheat oats pasta noodles bulgur lentils chickpeas beans flour bread lepeshka lavash potato onion carrot cabbage sauerkraut tomato cucumber pepper zucchini pumpkin broccoli mushrooms garlic greens apple banana berries lemon dried_fruit nuts oil tomato_paste soy_sauce honey peanut_butter bread_rye'.split(' ');
// Health rules shared with tools/tests/data.test.js
const SALTY_ING = ['sauerkraut','soy_sauce','tuna','ayran','pelmeni','chuchvara']; // рассол, соевый соус, консервы, солёные молочные, готовые полуфабрикаты
const WHITEFLOUR_ING = ['bread','lepeshka','lavash','pasta','noodles','kesme','flour','semolina','pelmeni','chuchvara'];
const WHITEFLOUR_MIN_G = 15;
const NEEDS = new Set(['blender','oven']);
// Цена магазина за кг (или за упаковку, приведённую к кг) должна быть в 50–200% от ING — иначе это, скорее всего, не тот товар
// (тот же порог использует ежедневный сборщик цен tools/scraper/scrape.js).
const PRICE_LO = 0.5, PRICE_HI = 2;
const VARIANTS = new Set(['chilled']); // STORE_ITEMS: ключи вида <ingId>@chilled — охлаждённая версия того же продукта
const TAGS = new Set('meat chicken beef mutton turkey fish dairy egg gluten legume nuts peanut honey soy citrus mushroom'.split(' '));
const CATS = new Set(['meat','dairy','grain','bread','veg','fruit','pantry']);
const TYPES = new Set(['b','m','d','s']);
const CUS = new Set(['kg','home','eu','asia','zoh','snack']);
const DIFFS = new Set(['easy','medium','hard']);
const FLAGS = new Set(['heavy','fried','sweet','salty','fatty','whiteflour']);
const BASES = new Set('lentils chickpeas beans buckwheat rice pasta noodles dough potato bulgur oats millet semolina bread tvorog eggs fish chicken beef mutton liver veg fruit dairy'.split(' '));
const SEASONS = new Set(['summer','winter','all']);
// [[число|единица]] — число целое или с точкой, единица без скобок и «|»
const TOKEN = /\[\[(\d+(?:\.\d+)?)\|([^\[\]|]+)\]\]/g;
const warn = (m) => console.warn('  warn ' + m);

for (const id of REQUIRED) if (!ING[id]) err(`missing required ING: ${id}`);
for (const [id, x] of Object.entries(ING)) {
  if (typeof x.n !== 'string' || !x.n) err(`${id}: n`);
  if (!CATS.has(x.cat)) err(`${id}: cat ${x.cat}`);
  if (!(x.sale === 'w' || (typeof x.sale === 'number' && x.sale > 0))) err(`${id}: sale`);
  if (x.sale !== 'w' && (typeof x.label !== 'string' || !x.label)) err(`${id}: pack without label`);
  for (const k of ['price','k','p','f','c']) if (typeof x[k] !== 'number' || x[k] < 0) err(`${id}: ${k}`);
  if (Math.abs(x.p*4 + x.f*9 + x.c*4 - x.k) > Math.max(25, x.k*0.2)) console.warn(`  warn ${id}: kcal ${x.k} vs macros ${(x.p*4+x.f*9+x.c*4).toFixed(0)}`);
  if (!Array.isArray(x.t)) err(`${id}: t`); else for (const t of x.t) if (!TAGS.has(t)) err(`${id}: bad tag ${t}`);
  if (x.t && x.t.some(t => ['chicken','beef','mutton','turkey'].includes(t)) && !x.t.includes('meat')) err(`${id}: meat kind w/o meat`);
  if ((x.pc !== undefined) !== (x.pcName !== undefined)) err(`${id}: pc/pcName pair`);
  if (x.unit !== undefined && x.unit !== 'ml') err(`${id}: unit ${x.unit} (only 'ml' allowed)`);
  if (x.season !== undefined && !SEASONS.has(x.season)) err(`${id}: season ${x.season}`);
  if ((x.cat === 'veg' || x.cat === 'fruit') && x.season === undefined) err(`${id}: veg/fruit without season`);
  if (x.cat !== 'veg' && x.cat !== 'fruit' && x.season !== undefined) err(`${id}: season only for veg/fruit`);
}
for (const id of ['tomato','cucumber','pepper','zucchini','eggplant']) if (ING[id] && ING[id].season !== 'summer') err(`${id}: greenhouse produce must be season:'summer'`);
for (const id of ['cabbage','carrot','beet','potato','onion','pumpkin','radish','sauerkraut']) if (ING[id] && ING[id].season === 'summer') err(`${id}: winter vegetable marked summer`);
if (ING.eggs && (ING.eggs.sale !== 550 || ING.eggs.pc !== 55)) err('eggs: must be a 10-pc pack (sale 550, pc 55)');
for (const id of ['milk','kefir','oil','soy_sauce','ayran']) if (ING[id] && ING[id].unit !== 'ml') err(`${id}: liquid without unit:'ml'`);

const ids = new Set();
const used = new Set();
const kcal = (r) => Object.entries(r.ing).reduce((s,[i,g]) => s + (ING[i] ? ING[i].k*g/100 : 0), 0);
const tagsOf = (r) => new Set(Object.keys(r.ing).flatMap(i => ING[i] ? ING[i].t : []));
for (const r of RECIPES) {
  if (ids.has(r.id)) err(`dup recipe id ${r.id}`); ids.add(r.id);
  if (typeof r.n !== 'string' || !r.n) err(`${r.id}: n`);
  if (!Array.isArray(r.types) || !r.types.length || r.types.some(t => !TYPES.has(t))) err(`${r.id}: types`);
  if (!CUS.has(r.cu)) err(`${r.id}: cu ${r.cu}`);
  if (r.cu === 'snack' && !r.types.every(t => t === 's')) err(`${r.id}: snack cu on non-snack`);
  if (typeof r.time !== 'number' || r.time <= 0) err(`${r.id}: time`);
  for (const [i,g] of Object.entries(r.ing)) {
    used.add(i);
    if (!ING[i]) err(`${r.id}: unknown ing ${i}`);
    if (typeof g !== 'number' || g <= 0) err(`${r.id}: grams ${i}`);
  }
  if ((r.ing.oil || 0) > 20) err(`${r.id}: oil > 20`);
  if (!Array.isArray(r.steps) || r.steps.length < 1 || r.steps.length > 4) err(`${r.id}: steps count ${r.steps && r.steps.length}`);
  if (!DIFFS.has(r.diff)) err(`${r.id}: diff ${r.diff}`);
  if (!Number.isInteger(r.yield) || r.yield <= 0) err(`${r.id}: yield ${r.yield}`);
  if (!Number.isInteger(r.keeps) || r.keeps < 0 || r.keeps > 3) err(`${r.id}: keeps ${r.keeps}`);
  if (r.prep !== undefined && (typeof r.prep !== 'string' || !r.prep.trim())) err(`${r.id}: prep must be non-empty string`);
  if (r.needs !== undefined && (!Array.isArray(r.needs) || !r.needs.length || r.needs.some(n => !NEEDS.has(n)) || new Set(r.needs).size !== r.needs.length)) err(`${r.id}: needs must be a non-empty array of 'blender'|'oven'`);
  if (r.batch !== undefined && (typeof r.batch !== 'string' || r.batch.trim().length < 10)) err(`${r.id}: batch must be a non-empty tip string`);
  if (r.side !== undefined && r.side !== true) err(`${r.id}: side must be true or absent`);
  if (Array.isArray(r.flags)) {
    const salt = SALTY_ING.filter(i => r.ing[i]);
    if (salt.length && !r.flags.includes('salty')) err(`${r.id}: contains ${salt.join(', ')} but no 'salty' flag`);
    const wf = WHITEFLOUR_ING.reduce((a, i) => a + (r.ing[i] || 0), 0);
    if (wf >= WHITEFLOUR_MIN_G && !r.flags.includes('whiteflour')) err(`${r.id}: ${wf} g of white flour products but no 'whiteflour' flag`);
    if (r.side && (r.flags.includes('salty') || r.flags.includes('whiteflour'))) err(`${r.id}: side salad must not be salty/whiteflour`);
  }
  const allSteps = (r.steps || []).join(' ');
  const needs = r.needs || [];
  if (/ds*°C/.test(allSteps) && !needs.includes('oven')) err(`${r.id}: bakes at °C but needs has no 'oven'`);
  if (needs.includes('oven') && !/°C|духовк/.test(allSteps)) err(`${r.id}: needs 'oven' but steps never use the oven`);
  if (/пробейте блендером|пюрируйте/i.test(allSteps) && !needs.includes('blender')) err(`${r.id}: purée step but needs has no 'blender'`);
  if (needs.includes('blender') && !/блендер/i.test(allSteps)) err(`${r.id}: needs 'blender' but steps never use it`);
  if (!Array.isArray(r.flags)) err(`${r.id}: flags missing`);
  else {
    for (const f of r.flags) if (!FLAGS.has(f)) err(`${r.id}: bad flag ${f}`);
    if (new Set(r.flags).size !== r.flags.length) err(`${r.id}: duplicate flags`);
  }
  // sanity: raw weight vs cooked yield (soups/grains may grow, but not absurdly)
  const raw = Object.values(r.ing).reduce((a,b) => a+b, 0);
  if (Number.isInteger(r.yield) && (r.yield < raw*0.4 || r.yield > raw*4)) console.warn(`  warn ${r.id}: yield ${r.yield} vs raw ${raw}`);
  // base / soup
  if (!BASES.has(r.base)) err(`${r.id}: base ${r.base}`);
  if (r.soup !== undefined && r.soup !== true) err(`${r.id}: soup must be true or absent`);
  if (/сол[её]н/i.test(r.n)) err(`${r.id}: name scares people with high blood pressure: ${r.n}`);
  // step tokens [[n|unit]]
  let water = 0;
  for (const st of r.steps || []) {
    if (typeof st !== 'string') { err(`${r.id}: step not a string`); continue; }
    const rest = st.replace(TOKEN, (m, n, u) => { if (!(parseFloat(n) > 0)) err(`${r.id}: token number ${m}`); if (u !== u.trim() || !u) err(`${r.id}: token unit ${m}`); return '§'; });
    if (/\[\[|\]\]|\|/.test(rest)) err(`${r.id}: malformed token in step: ${st.slice(0, 80)}`);
    if (/\d+\s*(мл|ст\. л\.|ч\. л\.)(?![а-я])/.test(rest)) err(`${r.id}: per-serving amount not tokenized: ${rest.match(/\S*\s*\d+\s*(мл|ст\. л\.|ч\. л\.)/)[0]}`);
    if (/на порцию/.test(rest) && /\d/.test(rest)) err(`${r.id}: «на порцию» amount — use a [[n|unit]] token instead`);
    for (const m of st.matchAll(TOKEN)) if (m[2] === 'мл' && /вод|кипят|бульон/.test(st.slice(m.index, m.index + m[0].length + 30))) water += parseFloat(m[1]);
  }
  if (r.soup) {
    if (r.yield < 350 || r.yield > 480) err(`${r.id}: soup yield ${r.yield} (expected 350–480 g per adult bowl)`);
    if (water < 200 || water > 400) err(`${r.id}: soup water ${water} ml per serving (expected 200–400)`);
    const tot = raw + water;
    if (tot < r.yield * 0.95 || tot > r.yield * 1.55) warn(`${r.id}: soup raw ${raw} + water ${water} = ${tot} vs yield ${r.yield}`);
  }
  for (const g of ['buckwheat','bulgur','rice','rice_long']) if (r.ing[g] && !r.soup) {
    // grains: if water is given, expect about 2× the dry weight
    const grainStep = (r.steps || []).find(t => /греч|рис|булгур/i.test(t) && /\[\[\d+\|мл\]\] (?:подсоленной )?(?:воды|кипятка)/.test(t));
    const w = grainStep && grainStep.match(/\[\[(\d+)\|мл\]\] (?:подсоленной )?(?:воды|кипятка)/);
    if (w && Object.keys(r.ing).filter(i => ['buckwheat','bulgur','rice','rice_long','millet'].includes(i)).length === 1) {
      const ratio = +w[1] / r.ing[g];
      if (ratio < 1.4 || ratio > 4.5) warn(`${r.id}: water ${w[1]} ml for ${r.ing[g]} g ${g} (ratio ${ratio.toFixed(1)})`);
    }
  }
}

const unused = Object.keys(ING).filter(i => !used.has(i));
const extras = Object.keys(ING).filter(i => !REQUIRED.includes(i));

// kcal per type
const groups = {b:[], m:[], d:[], s:[]};
for (const r of RECIPES) for (const t of r.types) groups[t].push([r.id, Math.round(kcal(r)), !!r.soup]);
console.log(`ING: ${Object.keys(ING).length}, RECIPES: ${RECIPES.length}`);
console.log('extras:', extras.join(', '));
if (unused.length) console.log('unused ING:', unused.join(', '));
const RANGE = {b:[300,500], m:[450,750], d:[380,600], s:[150,300]};
const SOUP_RANGE = [280, 650]; // тарелка супа ~400–450 г
for (const [t, arr] of Object.entries(groups)) {
  arr.sort((a,b) => a[1]-b[1]);
  const lo = arr[0], hi = arr[arr.length-1];
  console.log(`type ${t}: n=${arr.length}  min ${lo[1]} (${lo[0]})  max ${hi[1]} (${hi[0]})`);
  for (const [id,k,soup] of arr) { const rg = soup ? SOUP_RANGE : RANGE[t]; if (k < rg[0] || k > rg[1]) console.log(`  out of range ${t}${soup ? ' (soup)' : ''}: ${id} ${k}`); }
}

// coverage
const isVeg = (r) => { const t = tagsOf(r); return !t.has('meat') && !t.has('fish'); };
const isGF = (r) => !tagsOf(r).has('gluten');
const isDF = (r) => !tagsOf(r).has('dairy');
const isEF = (r) => !tagsOf(r).has('egg');
const isV3 = (r) => isVeg(r) && isGF(r) && isDF(r);
const has = (r, ts) => r.types.some(t => ts.includes(t));
const G = {B: r => has(r,['b']), M: r => has(r,['m','d']), S: r => has(r,['s'])};
const NEED = {veg:[3,6,3], gf:[3,8,3], df:[3,8,3], ef:[3,8,0], v_gf_df:[2,4,2]};
const FN = {veg:isVeg, gf:isGF, df:isDF, ef:isEF, v_gf_df:isV3};
console.log('coverage (breakfast / main / snack):');
for (const [name, fn] of Object.entries(FN)) {
  const c = ['B','M','S'].map(g => RECIPES.filter(r => G[g](r) && fn(r)).length);
  const ok = c.every((v,i) => v >= NEED[name][i]);
  if (!ok) err(`coverage ${name} ${c} < ${NEED[name]}`);
  console.log(`  ${name.padEnd(8)} ${c.join(' / ')}  need ${NEED[name].join(' / ')} ${ok ? 'OK' : 'FAIL'}`);
}
const cuCount = {}; for (const r of RECIPES) cuCount[r.cu] = (cuCount[r.cu]||0)+1;
console.log('cuisines:', JSON.stringify(cuCount));

// cost per serving
const cost = (r) => Object.entries(r.ing).reduce((s,[i,g]) => { const x = ING[i]; return s + (x.sale === 'w' ? x.price*g/1000 : x.price*g/x.sale); }, 0);
const costs = RECIPES.map(r => [r.id, Math.round(cost(r))]).sort((a,b)=>a[1]-b[1]);
console.log(`cost/serving: min ${costs[0][1]} (${costs[0][0]}), max ${costs[costs.length-1][1]} (${costs[costs.length-1][0]})`);

// difficulty / protein / health stats
const prot = (r) => Object.entries(r.ing).reduce((s,[i,g]) => s + (ING[i] ? ING[i].p*g/100 : 0), 0);
const BAD = ['sweet','fried','salty','fatty'];
const healthy = (r) => Array.isArray(r.flags) && !r.flags.some(f => BAD.includes(f));
const perType = (fn) => ['b','m','d','s'].map(t => `${t}:${RECIPES.filter(r => r.types.includes(t) && fn(r)).length}`).join(' ');
const diffCount = {}; for (const r of RECIPES) diffCount[r.diff] = (diffCount[r.diff]||0)+1;
console.log('difficulty:', JSON.stringify(diffCount), ` easy & ≤30 min: ${RECIPES.filter(r => r.diff === 'easy' && r.time <= 30).length}`);
console.log('protein ≥30 g/serving per type:', perType(r => prot(r) >= 30));
console.log('health-friendly (no sweet/fried/salty/fatty) per type:', perType(healthy));
const nonSweetSnacks = RECIPES.filter(r => r.types.includes('s') && !(r.flags||[]).includes('sweet'));
console.log(`non-sweet snacks: ${nonSweetSnacks.length} (${nonSweetSnacks.map(r => r.id).join(', ')})`);
console.log(`with prep: ${RECIPES.filter(r => r.prep).length}; keeps ≥2: ${RECIPES.filter(r => r.keeps >= 2).length}`);
const NEED2 = {easy:12, healthyB:3, healthyM:8, nonSweetSnacks:4};
if (RECIPES.filter(r => r.diff === 'easy' && r.time <= 30).length < NEED2.easy) err('too few easy ≤30 min recipes');
if (RECIPES.filter(r => r.types.includes('b') && healthy(r)).length < NEED2.healthyB) err('too few health-friendly breakfasts');
if (RECIPES.filter(r => (r.types.includes('m') || r.types.includes('d')) && healthy(r)).length < NEED2.healthyM) err('too few health-friendly mains');
if (nonSweetSnacks.length < NEED2.nonSweetSnacks) err('too few non-sweet snacks');

// health: diabetes + pressure users need light mains and savoury breakfasts
const fat = (r) => Object.entries(r.ing).reduce((s,[i,g]) => s + (ING[i] ? ING[i].f*g/100 : 0), 0);
for (const r of RECIPES) if (fat(r) > 30 && !(r.flags || []).includes('fatty')) warn(`${r.id}: fat ${Math.round(fat(r))} g without 'fatty'`);
for (const r of RECIPES) if ((r.ing.lepeshka >= 60 || r.ing.kaymak) && !(r.flags || []).some(f => f === 'whiteflour' || f === 'fatty')) err(`${r.id}: lepeshka/kaymak dish without whiteflour/fatty`);
const lightMains = RECIPES.filter(r => (r.types.includes('m') || r.types.includes('d')) && r.flags.length === 0 && fat(r) <= 20);
const savouryB = RECIPES.filter(r => r.types.includes('b') && !r.flags.includes('sweet') && !r.flags.includes('whiteflour'));
console.log(`light mains/dinners (no flags, fat ≤ 20 g): ${lightMains.length}; savoury breakfasts (not sweet, not whiteflour): ${savouryB.length}`);
if (lightMains.length < 10) err('fewer than 10 mains/dinners with empty flags and fat ≤ 20 g');
if (savouryB.length < 4) err('fewer than 4 breakfasts that are neither sweet nor whiteflour');
// быстрые перекусы: без подготовки с вечера и не дольше 15 минут, сладкие и несладкие
const quickSnacks = RECIPES.filter(r => r.types.includes('s') && r.time <= 15 && !r.prep);
const qSweet = quickSnacks.filter(r => r.flags.includes('sweet')).length, qSavoury = quickSnacks.length - qSweet;
console.log(`quick snacks (≤15 min, no prep): ${quickSnacks.length} (sweet ${qSweet}, not sweet ${qSavoury})`);
if (quickSnacks.length < 10 || qSweet < 3 || qSavoury < 3) err('need ≥10 quick snacks (≤15 min, no prep) with ≥3 sweet and ≥3 not sweet');
const sides = RECIPES.filter(r => r.side);
console.log(`soup sides (side:true): ${sides.map(r => r.id).join(', ')}`);
if (sides.length < 2) err('need ≥2 side salads (side:true) to serve with soups');
console.log(`needs: blender ${RECIPES.filter(r => (r.needs||[]).includes('blender')).length}, oven ${RECIPES.filter(r => (r.needs||[]).includes('oven')).length}; batch tips: ${RECIPES.filter(r => r.batch).length}`);
const soups = RECIPES.filter(r => r.soup);
console.log(`soups: ${soups.length} (${soups.map(r => r.id).join(', ')})`);
const baseCount = {}; for (const r of RECIPES) baseCount[r.base] = (baseCount[r.base] || 0) + 1;
console.log('bases:', JSON.stringify(baseCount));

// ---- store prices (src/prices.js) ----
const perKg = (size, price) => size === 'w' ? price : price / size * 1000;
if (!/^\d{4}-\d\d-\d\d$/.test(PRICES.date)) err(`PRICES_DATE ${PRICES.date}`);
let storeCount = 0;
for (const [st, items] of Object.entries(PRICES.items)) {
  if (!PRICES.info[st]) err(`STORE_ITEMS.${st}: no STORE_INFO`);
  const seen = new Set();
  for (const [id, it] of Object.entries(items)) {
    storeCount++;
    const k = `${st}/${id}`;
    const [base, variant] = id.split('@');
    if (!ING[base]) { err(`${k}: id not in ING`); continue; }
    if (variant !== undefined && !VARIANTS.has(variant)) { err(`${k}: unknown variant @${variant}`); continue; }
    if (variant === 'chilled' && (ING[base].cat !== 'meat' || !/охл/i.test(it.name || ''))) err(`${k}: @chilled must be a meat product titled «охл…» (${it.name})`);
    if (typeof it.name !== 'string' || !it.name.trim()) err(`${k}: name`);
    if (typeof it.url !== 'string' || !/^https:\/\//.test(it.url)) err(`${k}: url`);
    if (!(it.size === 'w' || (typeof it.size === 'number' && it.size > 0))) err(`${k}: size ${it.size}`);
    if (!(typeof it.price === 'number' && it.price > 0)) { err(`${k}: price ${it.price}`); continue; }
    if (it.approx !== undefined && typeof it.approx !== 'boolean') err(`${k}: approx must be boolean`);
    if (st === 'globus' && /\bSPAR\b/i.test(it.name)) err(`${k}: SPAR product in the Globus list: ${it.name}`);
    if (seen.has(it.url + '|' + it.name)) err(`${k}: duplicate product`); seen.add(it.url + '|' + it.name);
    // size must match the pack named in the title (e.g. «450г» → 450), weighed goods → 'w'
    const m = it.name.match(/(\d+(?:[.,]\d+)?)\s*(кг|г|гр|мл|л)(?![а-яa-z])/i);
    if (m && it.size !== 'w' && !/шт/i.test(it.name.slice(m.index - 3, m.index))) {
      let g = parseFloat(m[1].replace(',', '.')); const u = m[2].toLowerCase(); if (u === 'кг' || u === 'л') g *= 1000;
      const expect = (ING[base].unit === 'ml' && base === 'oil') ? g * 0.92 : g;
      if (Math.abs(expect - it.size) / expect > 0.1) err(`${k}: size ${it.size} but title says ${m[0]}`);
    }
    const ing = ING[base];
    const kg = perKg(it.size, it.price), ref = perKg(ing.sale, ing.price);
    if (kg / ref < PRICE_LO || kg / ref > PRICE_HI) err(`${k}: ${Math.round(kg)} сом/кг is outside ${PRICE_LO*100}–${PRICE_HI*100}% of ING ${Math.round(ref)} сом/кг — wrong product or pack? (${it.name})`);
    if (id === 'eggs' && it.size !== 550) err(`${k}: eggs must be a 10-pc pack (size 550)`);
  }
}
// ржаной хлеб нужен как добавка к супу для диабетиков — должен продаваться минимум в двух магазинах
const ryeIn = Object.keys(PRICES.items).filter(st => PRICES.items[st].bread_rye);
if (ryeIn.length < Math.min(2, Object.keys(PRICES.items).length)) err(`bread_rye has store prices only in: ${ryeIn.join(', ') || 'none'}`);
const chilled = Object.entries(PRICES.items).flatMap(([st, v]) => Object.keys(v).filter(id => id.includes('@')).map(id => st + '/' + id));
console.log(`variants: ${chilled.join(', ') || 'none'}`);
console.log(`store items: ${storeCount} (${Object.entries(PRICES.items).map(([s, v]) => s + ' ' + Object.keys(v).length).join(', ')}), date ${PRICES.date}`);

if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('\nALL CHECKS PASSED');
