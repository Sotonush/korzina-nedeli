// Validates src/data.js. Run: node tools/validate-data.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__ING = ING; globalThis.__RECIPES = RECIPES;', ctx);
const ING = ctx.__ING, RECIPES = ctx.__RECIPES;

const errors = [];
const err = (m) => errors.push(m);

const REQUIRED = 'chicken_breast chicken_thigh beef mince mutton turkey fish tuna eggs milk kefir tvorog yogurt cheese smetana butter rice buckwheat oats pasta noodles bulgur lentils chickpeas beans flour bread lepeshka lavash potato onion carrot cabbage tomato cucumber pepper zucchini pumpkin broccoli mushrooms garlic greens apple banana berries lemon dried_fruit nuts oil tomato_paste soy_sauce honey peanut_butter'.split(' ');
const TAGS = new Set('meat chicken beef mutton turkey fish dairy egg gluten legume nuts peanut honey soy citrus mushroom'.split(' '));
const CATS = new Set(['meat','dairy','grain','bread','veg','fruit','pantry']);
const TYPES = new Set(['b','m','d','s']);
const CUS = new Set(['kg','home','eu','asia','zoh','snack']);
const DIFFS = new Set(['easy','medium','hard']);
const FLAGS = new Set(['heavy','fried','sweet','salty','fatty','whiteflour']);

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
}
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
  if (!Array.isArray(r.flags)) err(`${r.id}: flags missing`);
  else {
    for (const f of r.flags) if (!FLAGS.has(f)) err(`${r.id}: bad flag ${f}`);
    if (new Set(r.flags).size !== r.flags.length) err(`${r.id}: duplicate flags`);
  }
  // sanity: raw weight vs cooked yield (soups/grains may grow, but not absurdly)
  const raw = Object.values(r.ing).reduce((a,b) => a+b, 0);
  if (Number.isInteger(r.yield) && (r.yield < raw*0.4 || r.yield > raw*4)) console.warn(`  warn ${r.id}: yield ${r.yield} vs raw ${raw}`);
}

const unused = Object.keys(ING).filter(i => !used.has(i));
const extras = Object.keys(ING).filter(i => !REQUIRED.includes(i));

// kcal per type
const groups = {b:[], m:[], d:[], s:[]};
for (const r of RECIPES) for (const t of r.types) groups[t].push([r.id, Math.round(kcal(r))]);
console.log(`ING: ${Object.keys(ING).length}, RECIPES: ${RECIPES.length}`);
console.log('extras:', extras.join(', '));
if (unused.length) console.log('unused ING:', unused.join(', '));
const RANGE = {b:[300,500], m:[450,750], d:[380,600], s:[150,300]};
for (const [t, arr] of Object.entries(groups)) {
  arr.sort((a,b) => a[1]-b[1]);
  const lo = arr[0], hi = arr[arr.length-1];
  console.log(`type ${t}: n=${arr.length}  min ${lo[1]} (${lo[0]})  max ${hi[1]} (${hi[0]})`);
  for (const [id,k] of arr) if (k < RANGE[t][0] || k > RANGE[t][1]) console.log(`  out of range ${t}: ${id} ${k}`);
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

if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('\nALL CHECKS PASSED');
