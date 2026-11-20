// Корзина и магазины: честный лимит, целые упаковки, порог второго магазина, охлаждённая курица.
//   node tools/tests/cart.test.js
const { load, check, done } = require('./harness');
const A = load(), ev = A.ev;
ev(`var __T = {}; __T.fresh = (mut) => { state = Object.assign(defaults(), {onboarded:true, goalSeen:true}); resetCaches(); if (mut) mut(state); resetCaches(); };
  __T.adult = (o) => Object.assign(newPerson('adult'), o || {});
  __T.kid = (age) => newPerson('child', {age});
  // меню без прохода по упаковкам (планировщик вызывает packReusePass в конце сборки), чтобы проверить сам проход
  __T.raw = () => { const f = packReusePass; packReusePass = undefined; try { regenerate(false); } finally { packReusePass = f; } };`);
const fam4 = `s => { s.family = true; s.people.push(__T.adult({sex:'m', weight:85, height:180, goal:'keep'}), __T.kid(8), __T.kid(12)); }`;
const SD0 = ev('SD');

console.log('== 1. Честный лимит ==');
{
  ev(`__T.fresh(${fam4}); state.mode = 'eco'; regenerate(false);`);
  const min = ev('minCostEst()'), cur = ev('computeCart().total');
  check('минимум посчитан', min > 1000, min);
  check('минимум не дороже текущего «Эконома»', min <= cur + 1, {min, cur});
  ev(`state.cap = ${Math.round(min - 1500)}; tipCache.key = '';`);
  let h = ev('secBudget()');
  check('под лимитом «Минимум для 4 человек на неделю ≈ …»', /Минимум для 4 человек на неделю ≈ <b>[\d\s ]+<\/b> сом/.test(h));
  check('предупреждение при лимите ниже минимума', h.includes('С таким лимитом сбалансированное меню не собрать: не хватает ≈'));
  const R = ev('budgetReport()');
  check('budgetReport: поля', ['minCost','current','cap','shortfall','tips','tipsTotal','stillShort'].every(k => k in R), Object.keys(R));
  check('budgetReport: лимит ниже минимума', R.belowMin && Math.abs(R.minGap - 1500) < 1.5, {gap:R.minGap});
  check('budgetReport: shortfall = current − cap', Math.abs(R.shortfall - (R.current - R.cap)) < .01);
  check('после подсказок всё равно не хватает (лимит ниже минимума)', R.stillShort > 0 && Math.abs(R.stillShort - Math.max(0, R.shortfall - R.tipsTotal)) < .01, R);
  const m = ev('viewMenu()');
  check('в меню «Даже после этого не хватит ≈ …» или «не хватает»', /(Даже после этого не хватит|Подходящих замен нет, не хватает) ≈/.test(m));
  check('в меню минимум на неделю', m.includes('Минимум для 4 человек на неделю'));
  ev(`state.cap = ${Math.round(min + 3000)};`);
  h = ev('secBudget()');
  check('нет предупреждения при лимите выше минимума', !h.includes('сбалансированное меню не собрать') && h.includes('Минимум для 4 человек'));
  // одиночка: «для 1 человека»
  ev(`__T.fresh(); regenerate(false);`);
  check('«для 1 человека»', ev('secBudget()').includes('Минимум для 1 человека на неделю'));
}

console.log('== 1. Подсказки: экономия вместе = tipsTotal ==');
{
  let tested = 0, bad = [];
  for (let seed = 0; seed < 6 && tested < 3; seed++){
    ev(`__T.fresh(s => { s.seed = ${seed*389 + 5}; s.mode = 'comfort'; s.cook2 = ${seed % 2 === 0}; }); regenerate(false);`);
    const cur = ev('computeCart().total');
    ev(`state.cap = ${Math.round(cur*.85)};`);
    const R = ev('budgetReport()');
    if (!R.tips.length) continue;
    tested++;
    if (!(R.tips.every(t => t.save >= 10))) bad.push('save<10');
    // применить все подсказки и сравнить с реальной суммой
    const tips = JSON.stringify(R.tips);
    const after = ev(`(() => { const snap = snapshot(), st = [state.split, state.stores2.slice()]; for (const t of ${tips}){ if (t.kind === 'swap') pickReplace(t.d, t.s, t.id); else if (t.kind === 'snack') state.noSnack[t.d] = 1; else { state.split = true; state.stores2 = t.stores.slice(); } }
      const v = computeCart().total; Object.assign(state, snap); state.split = st[0]; state.stores2 = st[1]; return v; })()`);
    if (Math.abs((R.current - after) - R.tipsTotal) > Math.max(25, R.tipsTotal*.08)) bad.push(`seed ${seed}: вместе ${Math.round(R.current - after)} ≠ tipsTotal ${Math.round(R.tipsTotal)}`);
    if (Math.abs(R.stillShort - Math.max(0, R.current - R.tipsTotal - R.cap)) > .01) bad.push('stillShort');
    const m = ev('viewMenu()');
    if (R.tips.length > 1 && !m.includes('Всё вместе: ≈ −')) bad.push('нет «Всё вместе»');
    if (R.stillShort > 0 && !m.includes('Даже после этого не хватит ≈')) bad.push('нет «Даже после этого не хватит»');
    if (R.stillShort === 0 && m.includes('Даже после этого')) bad.push('лишнее «Даже после этого»');
  }
  check('сценарии с подсказками нашлись', tested > 0, tested);
  check('tipsTotal = реальная экономия всех подсказок вместе, stillShort честный', bad.length === 0, bad);
  // «Похудеть»: пельмени/чучвару/жареное тесто экономией не предлагаем
  let lose = 0, badLose = [];
  for (let seed = 0; seed < 8; seed++){
    ev(`__T.fresh(s => { s.seed = ${seed*53 + 1}; s.mode = 'comfort'; s.people[0].goal = 'lose'; }); regenerate(false); state.cap = 900;`);
    const ids = ev(`budgetReport().tips.filter(t => t.kind === 'swap').map(t => t.id)`);
    lose += ids.length;
    ids.filter(id => ev(`loseBad(RM['${id}'])`)).forEach(id => badLose.push(id));
  }
  check('при «Похудеть» нет пельменей/жареного теста в подсказках', badLose.length === 0, badLose);
  check('loseBad: пельмени и чучвара', ev(`['pelmeni','chuchvara'].every(id => !RM[id] || loseBad(RM[id]))`));
  console.log('  подсказок-замен при «Похудеть»', lose);
}

console.log('== 2. Целые упаковки ==');
{
  let hits = 0, saved = 0, bad = [], hitSeed = -1;
  const scen = seed => `__T.fresh(s => { s.seed = ${seed*131 + 7}; s.mode = ['eco','opt','comfort'][${seed % 3}]; ${seed % 2 === 0 ? `s.family = true; s.people.push(__T.adult());` : ''} }); __T.raw();`;
  for (let seed = 0; seed < 10; seed++){
    ev(scen(seed));
    const r = ev(`(() => { const plan = JSON.parse(JSON.stringify(state.plan)), lo = state.lo.slice(), c0 = computeCart(plan, lo), left0 = {}; bigLeftovers(c0).forEach(x => left0[x.id] = x.left);
      const iss0 = typeof planIssues === 'function' ? planIssues(plan, lo).length : 0, res = packReusePass(plan, lo), c1 = computeCart(plan, lo), G = genSetup(state.mode), iss1 = typeof planIssues === 'function' ? planIssues(plan, lo).length : 0;
      const cnt = {}; let near = 0, badSlot = 0, badLeft = 0;
      plan.forEach((day, d) => { for (const s in day){ const id = day[s]; if (!id || (s === 'l' && lo[d])) continue; cnt[id] = (cnt[id]||0) + 1; if (!poolFor(s, isWk(d)).some(r => r.id === id)) badSlot++;
        const nx = plan[d+1]; if (nx) for (const s2 in nx) if (nx[s2] === id && !(s2 === 'l' && lo[d+1])) near++; } });
      for (const sw of res.swaps){ const x = c1.items.find(y => y.id === sw.ing); if (!x || !(x.left < left0[sw.ing])) badLeft++; }
      return {n:res.swaps.length, saved:res.saved, d:c0.total - c1.total, iss:iss1 - iss0, max:Math.max(0, ...Object.values(cnt)), near, badSlot, badLeft}; })()`);
    if (r.n){ hits++; saved += r.saved; if (hitSeed < 0) hitSeed = seed; }
    if (Math.abs(r.d - r.saved) > .5) bad.push(`seed ${seed}: экономия ${r.saved} ≠ ${r.d}`);
    if (r.d < -.01) bad.push(`seed ${seed}: корзина подорожала`);
    if (r.max > 2 || r.near || r.badSlot || r.badLeft || r.iss > 0) bad.push(`seed ${seed}: ${JSON.stringify(r)}`);
  }
  check('packReusePass срабатывает хотя бы в части сценариев', hits >= 3, hits);
  check('packReusePass: корзина дешевле, остаток меньше, разнообразие и фильтры на месте', bad.length === 0, bad);
  console.log('  сработал в', hits, 'из 10, сэкономлено всего', Math.round(saved), 'сом');
  // форма вызова {plan, lo} и неприкосновенность ручных замен
  ev(scen(Math.max(0, hitSeed)));
  const r2 = ev(`(() => { const res = {plan:JSON.parse(JSON.stringify(state.plan)), lo:state.lo.slice()}; const all = packReusePass(JSON.parse(JSON.stringify(res)));
    const fixed = (d, s) => true, none = packReusePass(res.plan, res.lo, {fixed}); return {a:all.swaps.length, n:none.swaps.length}; })()`);
  check('packReusePass({plan, lo}) работает', r2.a > 0, r2);
  check('packReusePass не трогает закреплённые слоты', r2.n === 0, r2);
  check('packReusePass с пустым планом не падает', ev(`packReusePass(null).swaps.length === 0 && packReusePass([]).swaps.length === 0`));
  // подпись «останется ≈ … — пойдёт в «…» (Чт)»
  let lbl = 0;
  for (let seed = 0; seed < 8 && !lbl; seed++){
    ev(`__T.fresh(s => { s.seed = ${seed*71 + 3}; }); regenerate(false);`);
    const t = ev(`computeCart().items.map(reuseText).filter(Boolean)`);
    if (t.length){ lbl++; check('формат «останется ≈ N — пойдёт в «…» (Дн)»', /^останется ≈ [\d,  ]+ (г|кг|мл|л|шт|[а-я.]+) — пойдёт в «.+» \((Пн|Вт|Ср|Чт|Пт|Сб|Вс)\)( и ещё \d+)?$/.test(t[0]), t[0]);
      check('подпись в корзине', ev('viewCart()').includes('— пойдёт в «'), t[0]); }
  }
  check('подпись про остаток упаковки встречается', lbl > 0);
}

console.log('== 3. Второй магазин: порог ==');
{
  // два тестовых магазина со всеми продуктами по средней цене; меняем цену картошки во втором
  ev(`__T.fresh(); regenerate(false);`);
  const mk = (potB) => ev(`(() => { const a = {}, b = {}; for (const id in ING){ const i = ING[id]; a[id] = {name:i.n, size:i.sale, price:i.price, url:''}; b[id] = Object.assign({}, a[id]); }
      a.potato = {name:'Картофель', size:'w', price:200, url:''}; b.potato = Object.assign({}, a.potato, {price:${potB}}); applyLivePrices({date:'2026-11-20', stores:{ta:{n:'A'}, tb:{n:'B'}}, items:{ta:a, tb:b}}); state.split = true; state.stores2 = ['ta','tb']; resetCaches();
      const x = computeCart().items.find(y => y.id === 'potato'); return x ? {store:x.store, cost:x.cost, need:x.need, pa:200} : null; })()`);
  // нужна картошка в меню: ставим блюдо с картошкой
  const potDish = ev(`(RECIPES.find(r => r.ing.potato >= 150 && r.types.includes('m')) || {}).id`);
  ev(`state.plan[1].l = '${potDish}'; state.plan[3].l = '${potDish}';`);
  const pa = 200; // цена картошки в магазине A, сом/кг (своя, чтобы сумма покупки была заметной)
  let x = mk(pa);
  check('картошка в корзине', !!x, x);
  if (x){
    const kg = x.cost/pa; // сколько кг по цене А
    x = mk(pa - 3/kg); check('экономия 3 сом — остаётся в первом магазине', x.store === 'ta', x);
    x = mk(pa - 12/kg); check('экономия 12 сом (меньше 15) — остаётся в первом', x.store === 'ta', x);
    x = mk(pa*.8); const save = x ? (kg*pa - x.cost) : 0;
    check('экономия ≥ 10% и ≥ 15 сом — во втором магазине', save < 15 || x.store === 'tb', {save, x});
    x = mk(pa - 35/kg); check('экономия 35 сом — во втором магазине', x.store === 'tb', x);
    check('splitWorth: правила', ev('!splitWorth(3, 25) && !splitWorth(12, 60) && splitWorth(16, 100) && splitWorth(30, 1000) && !splitWorth(29, 1000)'));
  }
  check('подсказка о пороге в «Где дешевле»', ev('storePicker()').includes('не меньше чем на 15 сом'));
}

console.log('== 4. Охлаждённая курица ==');
{
  ev(`__T.fresh(); regenerate(false);`);
  const chickDish = ev(`(RECIPES.find(r => r.ing.chicken_breast && r.types.includes('m')) || {}).id`);
  const thighDish = ev(`(RECIPES.find(r => r.ing.chicken_thigh && !r.ing.chicken_breast && r.types.includes('m')) || {}).id`);
  ev(`state.plan[1].l = '${chickDish}'; ${thighDish ? `state.plan[3].l = '${thighDish}';` : ''}`);
  ev(`(() => { const a = {}; for (const id in ING){ const i = ING[id]; a[id] = {name:i.n, size:i.sale, price:i.price, url:''}; }
    a.chicken_breast = {name:'Филе куриное заморож', size:'w', price:335, url:''}; a['chicken_breast@chilled'] = {name:'Филе куриное охлажд', size:'w', price:554, url:''};
    delete a['chicken_thigh@chilled']; applyLivePrices({date:'2026-11-20', stores:{ta:{n:'A'}}, items:{ta:a}}); state.store = 'ta'; state.split = false; resetCaches(); })()`);
  const off = ev(`(() => { const x = computeCart().items.find(y => y.id === 'chicken_breast'); return {name:x.o.item.name, price:x.o.price}; })()`);
  check('без переключателя — замороженная', off.name === 'Филе куриное заморож' && off.price === 335, off);
  ev(`CART_ACT.chilled('1')`);
  check('переключатель включает state.chilled', ev('state.chilled === true && chilledOn()'));
  const on = ev(`(() => { const c = computeCart(), x = c.items.find(y => y.id === 'chicken_breast'), t = c.items.find(y => y.id === 'chicken_thigh'); return {name:x.o.item.name, price:x.o.price, chilled:!!x.o.chilled, key:x.o.key, thigh:t ? !!t.o.noChill : null, ids:c.items.map(y => y.id)}; })()`);
  check('охлаждённая: товар <id>@chilled', on.name === 'Филе куриное охлажд' && on.price === 554 && on.chilled, on);
  check('нет отдельных строк @chilled в корзине', on.ids.every(id => !id.includes('@')), on.ids.filter(id => id.includes('@')));
  if (thighDish) check('бедро без охлаждённой — замороженная с пометкой', on.thigh === true, on);
  const vc = ev('viewCart()');
  if (thighDish) check('пометка «охлаждённой нет — замороженная»', vc.includes('охлаждённой нет — замороженная'));
  check('своя цена охлаждённой хранится по её ключу', on.key === 'ta:chicken_breast@chilled');
  ev(`state.prices['ta:chicken_breast@chilled'] = 500; pricesVer++;`);
  check('своя цена охлаждённой применяется', ev(`computeCart().items.find(y => y.id === 'chicken_breast').o.price`) === 500);
  ev(`delete state.prices['ta:chicken_breast@chilled']; pricesVer++;`);
  const sb = ev('secBudget()');
  check('переключатель в «Магазин и бюджет»', sb.includes('data-act="chilled"') && sb.includes('Замороженная (дешевле)') && sb.includes('Охлаждённая'));
  check('разница цены в подсказке: +219 сом/кг', sb.includes('+219 сом/кг'), sb.match(/Охлаждённая в[^<]*/));
  check('shareText без @chilled', !ev('shareText(computeCart())').includes('@chilled'));
  ev(`CART_ACT.chilled('0')`);
  check('выключение возвращает замороженную', ev(`computeCart().items.find(y => y.id === 'chicken_breast').o.item.name`) === 'Филе куриное заморож');
  // «Где дешевле» с @chilled: во втором магазине есть только охлаждённая
  ev(`(() => { const a = {}, b = {}; for (const id in ING){ const i = ING[id]; a[id] = {name:i.n, size:i.sale, price:i.price, url:''}; b[id] = Object.assign({}, a[id]); }
    a['chicken_breast@chilled'] = {name:'A охл', size:'w', price:600, url:''}; delete b.chicken_breast; b['chicken_breast@chilled'] = {name:'B охл', size:'w', price:500, url:''};
    applyLivePrices({date:'2026-11-20', stores:{ta:{n:'A'}, tb:{n:'B'}}, items:{ta:a, tb:b}}); state.split = true; state.stores2 = ['ta','tb']; state.chilled = true; resetCaches(); })()`);
  const two = ev(`(() => { const c = computeCart(), x = c.items.find(y => y.id === 'chicken_breast'); return {store:x.store, name:x.o.item.name, ids:c.items.map(y => y.id), pairs:pairTotals().length}; })()`);
  check('«Где дешевле»: охлаждённая из магазина, где дешевле', two.store === 'tb' && two.name === 'B охл', two);
  check('«Где дешевле»: нет строк @chilled, пары считаются', two.ids.every(id => !id.includes('@')) && two.pairs === 1, two);
  ev(`state.chilled = false; resetCaches();`);
  const t3 = ev(`(() => { const x = computeCart().items.find(y => y.id === 'chicken_breast'); return {store:x.store, name:x.o.item.name}; })()`);
  check('замороженная: во втором магазине её нет — берём в первом', t3.store === 'ta', t3);
  // настоящие данные: с охлаждённой курицей ничего не ломается
  ev(`SD = buildSD(PRICES_DATE, STORE_INFO, STORE_ITEMS); resetCaches(); __T.fresh(s => { s.chilled = true; }); regenerate(false);`);
  const real = ev(`(() => { const c = computeCart(); return {ids:c.items.filter(y => y.id.includes('@')).length, total:c.total, ch:Object.keys(STORE_ITEMS).reduce((n, k) => n + Object.keys(STORE_ITEMS[k]).filter(id => id.endsWith('@chilled')).length, 0)}; })()`);
  check('реальные цены: нет строк @chilled, сумма посчитана', real.ids === 0 && real.total > 0, real);
  console.log('  ключей @chilled в данных магазинов:', real.ch);
}

console.log('== 5. Стоимость слота «на 2 дня» ==');
{
  let ok = false;
  for (let seed = 0; seed < 6 && !ok; seed++){
    ev(`__T.fresh(s => { s.cook2 = true; s.seed = ${seed*17 + 2}; }); regenerate(false);`);
    const d = ev('state.lo.indexOf(true)') - 1; if (d < 0) continue; ok = true;
    const b = ev(`(() => { const G = genSetup(state.mode), r = RM[state.plan[${d}].d]; return {b:slotCostBasis(${d}, 'd', undefined, G), exp:slotCost(r, 'd', G) + slotCost(r, 'l', G), lo:slotCostBasis(${d + 1}, 'l'), one:slotCostBasis(${d}, 'b')}; })()`);
    check('ужин на 2 дня: days 2 и стоимость ужин+обед', b.b.days === 2 && Math.abs(b.b.cost - b.exp) < .01, b);
    check('обед из остатков: стоимость 0', b.lo.leftover === true && b.lo.cost === 0, b.lo);
    check('обычный слот: days 1', b.one.days === 1 && b.one.cost > 0, b.one);
  }
  check('сценарий «на 2 дня» найден', ok);
}

console.log('== Старые сохранения и скорость ==');
{
  const old = {v:2, onboarded:true, people:[{id:'x', kind:'adult', sex:'f', age:30, height:165, weight:70, act:1.375, goal:'lose'}], cart:{oil:{b:true}, potato:{h:true}}, plan:Array.from({length:7}, () => ({b:'syrniki', l:'plov', d:'borsch', s:'kefir_banana'})), lo:[], tab:'cart', cap:'1500', split:true, stores2:['globus','frunze']};
  let err = '';
  try { ev(`state = migrate(${JSON.stringify(old)}); resetCaches(); computeCart(); viewCart(); viewMenu(); secBudget(); budgetReport();`); } catch (e){ err = e.message; }
  check('старое сохранение без chilled открывается', !err && ev('chilledOn() === false'), err);
  ev(`__T.fresh(${fam4}); state.cook2 = true; regenerate(false);`);
  const ms = ev(`(() => { computeCart(); const t = performance.now(); for (let i = 0; i < 30; i++) computeCart(); return (performance.now() - t)/30; })()`);
  check('computeCart быстрее 5 мс', ms < 5, ms);
  const pr = ev(`(() => { const p = JSON.parse(JSON.stringify(state.plan)), t = performance.now(); packReusePass(p, state.lo.slice()); return performance.now() - t; })()`);
  check('packReusePass быстрее 60 мс', pr < 60, pr);
  console.log(`  корзина ${ms.toFixed(2)} мс | packReusePass ${pr.toFixed(1)} мс`);
}
done('cart.test');
