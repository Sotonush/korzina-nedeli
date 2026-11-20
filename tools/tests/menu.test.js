// Меню и калории: разнообразие, здоровье, отдельные блюда, белок, заготовки, похудение, зима, эконом, цель по ИМТ.
//   node tools/tests/menu.test.js
const { load, check, done } = require('./harness');
const A = load(), ev = A.ev;
ev(`globalThis.__fresh = mut => { state = Object.assign(defaults(), {onboarded:true, goalSeen:true}); resetCaches(); mut && mut(state); resetCaches(); };
globalThis.__ids = (plan, lo, all) => { const out = []; plan.forEach((day, d) => { for (const s in day) if (day[s] && !skipSlot(d, s) && (all || !(s === 'l' && lo[d]))) out.push({d, s, r:RM[day[s]], lo:s === 'l' && !!lo[d]}); }); return out; };`);
const T = ev('globalThis');
const gen = (mut, seed) => { T.__fresh(s => { if (seed != null) s.seed = seed; mut && mut(s); }); ev('regenerate(false)'); return {plan:ev('state.plan'), lo:ev('state.lo')}; };
const iso = d => ev(`isoOf(addDays(new Date(), ${d}))`);

// ---------- 1. Разнообразие ----------
// Нарушения в меню одного человека: основа/крупа/мясо дважды в день, крупа > 2 и прочие основы > 3 раз в неделю,
// блюдо > 2 готовок, одно блюдо в том же приёме в два дня, курица > 4 дней.
function varietyIssues(menu){
  const out = [], wk = {}, used = {}, slot = {}, chickDays = new Set();
  for (let d = 0; d < 7; d++){
    const day = menu.filter(x => x.d === d), keys = {};
    for (const x of day){ const V = ev('vk')(x.r);
      for (const k of V.keys){ if (keys[k]) out.push(`d${d}: ${k} дважды (${x.r.id})`); keys[k] = 1; }
      if (V.chick) chickDays.add(d);
      const sk = x.s + x.r.id; if (slot[sk] != null && slot[sk] !== d) out.push(`${x.r.id} в «${x.s}» в дни ${slot[sk]} и ${d}`); slot[sk] = d;
      if (x.lo) continue;
      used[x.r.id] = (used[x.r.id]||0) + 1;
      for (const k of V.wkeys) wk[k] = (wk[k]||0) + 1;
    }
  }
  for (const k in wk) if (wk[k] > ev('keyLim')(k)) out.push(`${k} ${wk[k]} раз в неделю`);
  for (const id in used) if (used[id] > 2) out.push(`${id} ${used[id]} раз`);
  if (chickDays.size > 4) out.push(`курица ${chickDays.size} дней`);
  return out;
}
const PERSONAS = [
  ['по умолчанию', s => {}],
  ['эконом', s => { s.mode = 'eco'; }],
  ['комфорт, 3 приёма', s => { s.mode = 'comfort'; s.meals = 3; }],
  ['на 2 дня', s => { s.cook2 = true; }],
  ['набор массы', s => { Object.assign(s.people[0], {sex:'m', weight:80, height:182, goal:'gain'}); }],
  ['семья + лимит', s => { s.family = true; s.cap = 4000; s.people.push({id:'a', kind:'adult', sex:'m', age:35, height:178, weight:85, act:1.55, goal:'keep', dislikes:[]}); }],
];
{ let n = 0, bad = []; const t0 = Date.now();
  for (let seed = 0; seed < (+process.env.MENU_SEEDS || 30); seed++){ const [nm, mut] = PERSONAS[seed % PERSONAS.length];
    const {plan, lo} = gen(mut, seed*7919 + 11); n++;
    const iss = varietyIssues(T.__ids(plan, lo, true));
    if (iss.length) bad.push(nm + ' seed ' + seed + ': ' + iss.join('; '));
    check('пустой приём пищи: ' + nm, plan.every(day => Object.values(day).every(Boolean)));
  }
  check('разнообразие нарушено в ' + bad.length + ' из ' + n + ' меню', bad.length === 0, bad.slice(0, 4));
  console.log(`  1. разнообразие: ${n} меню, нарушений ${bad.length}, ${Math.round((Date.now()-t0)/n)} мс на меню`);
}
// Пример клиента: печень с гречкой и гречка с курицей — общий ключ buckwheat.
check('печень с гречкой и гречка с курицей не делят ключ', ev(`vk(RM.liver_onion).set.has('buckwheat') && vk(RM.grechka_kurica).set.has('buckwheat')`));
// Замены тоже без основы, которая уже есть в этот день
{ gen(null, 5); let rep = 0;
  for (let d = 0; d < 7; d++) for (const s of ['b','l','d','s']){
    const day = ev('state.plan')[d]; if (!day[s] || (s === 'l' && ev('state.lo')[d])) continue;
    const other = new Set(); for (const ss in day) if (ss !== s && day[ss]) ev('vk')(ev('RM')[day[ss]]).keys.forEach(k => other.add(k));
    if (ev(`replaceOptions(${d}, '${s}')`).some(r => ev('vk')(r).keys.some(k => other.has(k)))) rep++;
  }
  check('в заменах основа, которая уже есть в этот день: ' + rep, rep === 0);
}
// Умное обновление и бюджет тоже соблюдают правила
{ gen(s => { s.mode = 'opt'; }, 77); ev(`ACT.cuisine('eu'); ACT.update()`);
  const iss = varietyIssues(T.__ids(ev('state.plan'), ev('state.lo'), true));
  check('умное обновление нарушило разнообразие', iss.length === 0, iss);
  const {plan, lo} = gen(s => { s.cap = 1500; s.mode = 'eco'; }, 3);
  const iss2 = varietyIssues(T.__ids(plan, lo, true));
  check('подгонка под бюджет нарушила разнообразие', iss2.length === 0, iss2);
}

// ---------- 2. Диабет и давление ----------
{ let salty = 0, wf = 0, rye = 0, white = 0, carbs = 0, heavyD = 0, n = 0;
  for (let seed = 0; seed < 12; seed++) for (const h of [{diab:true, bp:false}, {diab:false, bp:true}, {diab:true, bp:true}]){
    const {plan, lo} = gen(s => { s.health = Object.assign({}, h); s.mode = ['eco','opt','comfort'][seed%3]; s.cook2 = seed % 2 === 0; if (seed % 4 === 1) s.cuisines = ['kg']; }, seed*313 + 1); n++;
    const menu = T.__ids(plan, lo);
    if (h.bp) salty += T.__ids(plan, lo, true).filter(x => ev('saltyR')(x.r)).length;
    const sv = ev('servings()');
    if (h.diab){
      const breads = sv.filter(x => x.bread);
      rye += breads.filter(x => x.add.id === 'bread_rye').length; white += breads.filter(x => ['bread','lepeshka','lavash'].includes(x.add.id)).length;
      const wfn = menu.filter(x => ev('whiteR')(x.r)).length + breads.filter(x => x.add.id !== 'bread_rye').length + sv.filter(x => x.add && !x.bread && ['bread','lepeshka','lavash'].includes(x.add.id)).length;
      if (wfn > 2) wf++;
      for (const x of sv) if (x.r && !x.add && (x.s === 'b' || x.s === 's')){ const w = x.who.find(w => w.i === 0); if (w && x.r.C*w.m > 52) carbs++; }
    }
    heavyD += plan.filter(day => day.d && ev('heavyDinner')(ev('RM')[day.d])).length;
  }
  check('давление: солёное (в т. ч. квашеная капуста) в меню: ' + salty, salty === 0);
  check('диабет: белая мука > 2 раз в неделю вместе с хлебом: ' + wf + ' недель', wf === 0);
  check('диабет: белый хлеб/лепёшка к супу: ' + white, white === 0);
  check('диабет: завтрак/перекус > 50 г углеводов: ' + carbs, carbs === 0);
  check('тяжёлое или «мясо/рыба + картошка» на ужин при флаге здоровья: ' + heavyD, heavyD === 0);
  console.log(`  2. здоровье: ${n} недель, хлеб к супу при диабете — ржаной ${rye}, белый ${white}`);
}
check('квашеная капуста = солёное', ev(`['shchi','kvashenaya_kurica','vinegret'].filter(id => RM[id]).every(id => saltyR(RM[id]))`));
check('хек с картофелем — тяжёлый ужин', ev(`!RM.hek_potato || heavyDinner(RM.hek_potato)`));
check('диабет: тосты с бананом исключены', ev(`(__fresh(s => { s.health = {diab:true, bp:false}; }), !RECIPES.filter(r => r.ing.banana >= 60 && r.types.includes('b')).some(r => baseOK(r, filterCtx())))`));

// ---------- 3. Отдельные блюда одного человека ----------
{ let rep = 0, inCart = 0, n = 0, alts = 0; const reasons = [];
  for (let seed = 0; seed < 10; seed++){
    gen(s => { s.family = true; s.cook2 = seed % 2 === 0; s.people.push({id:'m', kind:'adult', name:'Марат', sex:'m', age:35, height:178, weight:82, act:1.55, goal:'keep', dislikes: seed % 3 ? ['fish'] : ['fish','chicken']}); }, seed*101 + 9);
    n++;
    const sv = ev('servings()'), cart = ev('computeCart()'), plan = ev('state.plan'), lo = ev('state.lo');
    // меню Марата: основное блюдо или его отдельное
    const menu = [];
    for (const x of sv){ if (x.add) continue; if (x.who.some(w => w.i === 1)) menu.push({d:x.d, s:x.s, r:x.r, lo:false, alt:!!x.alt}); }
    alts += menu.filter(x => x.alt).length;
    // остатки: его обед = его вчерашний ужин
    for (const x of menu) if (x.s === 'l' && x.d > 0){ const y = menu.find(z => z.d === x.d-1 && z.s === 'd'); if (y && y.r.id === x.r.id && (lo[x.d] || x.alt)) x.lo = true; }
    for (let d = 0; d < 7; d++){ const day = menu.filter(x => x.d === d), seen = new Set(); for (const x of day){ if (seen.has(x.r.id)) { rep++; reasons.push('seed ' + seed + ' d' + d + ' ' + x.r.id); } seen.add(x.r.id); } }
    for (const x of menu.filter(x => x.alt)){
      if (menu.some(y => y !== x && y.s === x.s && y.d !== x.d && y.r.id === x.r.id && !y.lo && !x.lo)){ rep++; reasons.push('seed ' + seed + ' слот ' + x.s + ' ' + x.r.id); }
      if (!Object.keys(x.r.ing).every(id => cart.items.some(c => c.id === id))) inCart++;
    }
    const iss = varietyIssues(menu).filter(t => !/курица/.test(t));
    if (iss.length){ rep += iss.length; reasons.push('seed ' + seed + ': ' + iss.join('; ')); }
  }
  check('отдельное блюдо повторяет меню этого человека: ' + rep, rep === 0, reasons.slice(0, 4));
  check('продукты отдельного блюда не в корзине: ' + inCart, inCart === 0);
  console.log(`  3. отдельные блюда: ${n} недель, ${alts} отдельных блюд`);
}

// ---------- 4. Белок: сначала замена, потом добавка ----------
{ let withFix = 0, noFix = 0;
  for (let seed = 0; seed < 8; seed++){
    T.__fresh(s => { s.people[0].goal = 'lose'; s.people[0].weight = 85; s.autoProt = true; s.seed = seed*17 + 3; });
    const a = ev(`(() => { const r = generatePlan(state.mode, state.seed, 0); return servings(r.plan, r.lo, true).filter(x => x.add && !x.bread).length; })()`);
    const b = ev(`(() => { const r = generatePlan(state.mode, state.seed, 0, {noFix:true}); return servings(r.plan, r.lo, true).filter(x => x.add && !x.bread).length; })()`);
    withFix += a; noFix += b;
  }
  check(`замены не уменьшили добавки: ${withFix} против ${noFix}`, withFix <= noFix);
  console.log(`  4. добавок за 8 недель: с заменами ${withFix}, без замен ${noFix}`);
}

// ---------- 5. Заготовка с вечера, перекусы, техника ----------
{ let prep = 0, snack = 0, eq = 0;
  for (let seed = 0; seed < 10; seed++){
    const back = seed % 3; // неделя началась сегодня, вчера или позавчера
    const {plan, lo} = gen(s => { s.start = iso(-back); s.learner = true; s.cook2 = seed % 2 === 0; }, seed*29 + 5);
    for (let d = 0; d <= back; d++) for (const s in plan[d]){ const r = ev('RM')[plan[d][s]]; if (r && r.prep && !(s === 'l' && lo[d])) prep++; }
    snack += plan.filter(day => day.s && ev('RM')[day.s].time > 15).length;
    gen(s => { s.equip = {blender:false, oven:false}; }, seed*31 + 2);
    eq += T.__ids(ev('state.plan'), ev('state.lo'), true).filter(x => ev('needsOf')(x.r).length).length;
  }
  check('блюдо «с вечера» на день, вечер перед которым прошёл: ' + prep, prep === 0);
  check('перекус дольше 15 минут: ' + snack, snack === 0);
  check('без блендера/духовки в меню блюда, где они нужны: ' + eq, eq === 0);
  check('хумус требует блендер', ev(`!RM.hummus || needsOf(RM.hummus).includes('blender')`));
  gen(null, 4); check('в заменах на сегодня есть блюдо «с вечера»', !ev(`['b','l','d','s'].some(s => state.plan[0][s] && replaceOptions(0, s).some(r => r.prep))`));
}

// ---------- 6. Похудение без пельменей ----------
{ let fr = 0;
  for (let seed = 0; seed < 10; seed++){ const {plan, lo} = gen(s => { s.people[0].goal = 'lose'; s.mode = 'eco'; }, seed*53 + 1); fr += T.__ids(plan, lo, true).filter(x => ev('frozenR')(x.r)).length; }
  check('похудение: пельмени/чучвара в меню: ' + fr, fr === 0);
  // выбор вручную сохраняется
  gen(s => { s.people[0].goal = 'lose'; }, 8);
  const slot = ev(`state.plan[2].d ? 'd' : 'l'`);
  ev(`pickReplace(2, '${slot}', 'pelmeni'); state.dirty = true; state.dirtyKinds = ['prefs']; smartUpdate()`);
  check('пельмени, выбранные вручную, убраны', ev(`state.plan[2]['${slot}']`) === 'pelmeni');
}

// ---------- 7. Зимние овощи ----------
{ const sg = (start, mut) => { let g = 0, n = 0; for (let seed = 0; seed < 6; seed++){ gen(s => { s.start = start; mut && mut(s); }, seed*41 + 1);
    const S = ev('summerIds()'), need = ev('cartNeed(state.plan, state.lo).need'); let w = 0; for (const id in need) if (S.has(id)) w += need[id]; g = Math.max(g, w); n++; } return g; };
  const one = sg('2026-12-07'), fam = sg('2026-12-07', s => { s.family = true; s.people.push({id:'a', kind:'adult', sex:'m', age:35, height:178, weight:85, act:1.55, goal:'keep', dislikes:[]}, {id:'k', kind:'child', sex:'f', age:8, dislikes:[]}); });
  check('зимой тепличных овощей > 0,8 кг на взрослого (один): ' + Math.round(one), one <= 800*1.1);
  check('зимой тепличных овощей больше лимита (семья): ' + Math.round(fam), fam <= (1600 + 500)*1.1);
  console.log(`  7. тепличные овощи зимой, максимум за неделю: один ${Math.round(one)} г, семья 2+1 ${Math.round(fam)} г`);
}

// ---------- 8. Эконом ----------
{ let prem = 0, tunaAdd = 0;
  for (let seed = 0; seed < 8; seed++){ const {plan, lo} = gen(s => { s.mode = 'eco'; s.people[0].goal = 'lose'; s.people[0].weight = 90; s.autoProt = true; }, seed*7 + 1);
    prem += T.__ids(plan, lo, true).filter(x => ev('premOf')(x.r).length).length;
    tunaAdd += ev('servings()').filter(x => x.add && ev('premiumId')(x.add.id)).length; }
  check('«Эконом»: дорогие продукты (арахисовая паста, тунец…) в меню: ' + prem, prem === 0);
  check('«Эконом»: дорогая добавка для белка: ' + tunaAdd, tunaAdd === 0);
  check('арахисовая паста в списке дорогих', ev(`premOf(RM.apple_pb || {ing:{peanut_butter:1}}).includes('peanut')`));
}

// ---------- 9. Цель по ИМТ ----------
{ const g = (w, h) => ev(`newPerson('adult', {weight:${w}, height:${h}}).goal`);
  check('ИМТ 17 → набрать массу', g(48, 168) === 'gain'); check('ИМТ 22 → держать вес', g(62, 168) === 'keep'); check('ИМТ 29 → похудеть', g(82, 168) === 'lose');
  ev(`state = defaults(); resetCaches();`);
  ev(`state.people[0].weight = 55; state.people[0].height = 170; personKcal(state.people[0])`);
  check('цель не пересчиталась по новому весу до выбора', ev('state.people[0].goal') === 'keep');
  ev(`state.people[0].goal = 'gain'; personKcal(state.people[0]); state.people[0].weight = 95; personKcal(state.people[0])`);
  check('выбор пользователя затёрт', ev('state.people[0].goal') === 'gain');
  ev(`state = defaults(); state.goalSeen = true; state.people[0].weight = 50; personKcal(state.people[0])`);
  check('после шага «Цель» цель меняется сама', ev('state.people[0].goal') !== 'gain' && ev('state.people[0].goalAuto') === undefined);
  const m = ev(`migrate({v:2, onboarded:true, people:[{id:'x', kind:'adult', sex:'f', age:30, height:165, weight:50, act:1.375, goal:'lose'}]})`);
  check('старое сохранение: цель изменилась', m.people[0].goal === 'lose' && !m.people[0].goalAuto);
}

// ---------- Скорость и старые сохранения ----------
{ T.__fresh(s => { s.family = true; s.cap = 2500; s.cook2 = true; s.people.push({id:'a', kind:'adult', sex:'m', age:35, height:178, weight:85, act:1.55, goal:'keep', dislikes:['fish']}, {id:'b', kind:'child', sex:'f', age:7, dislikes:[]}); });
  let worst = 0; for (let i = 0; i < 5; i++){ const t0 = performance.now(); ev('state.seed = ' + (i*99 + 1) + '; regenerate(false); computeCart()'); worst = Math.max(worst, performance.now() - t0); }
  check('меню + корзина дольше 100 мс: ' + Math.round(worst), worst < 100);
  T.__fresh(); const t0 = performance.now(); ev('regenerate(false); computeCart()'); const solo = performance.now() - t0;
  console.log(`  скорость: семья + лимит + 2 дня до ${Math.round(worst)} мс, один ${Math.round(solo)} мс`);
  const old = {v:2, onboarded:true, people:[{id:'x', kind:'adult', sex:'f', age:30, height:165, weight:70, act:1.375, goal:'lose'}], plan:Array.from({length:7}, () => ({b:'syrniki', l:'plov', d:'borsch', s:'kefir_banana'})), lo:[], tab:'menu'};
  let ok = true; try { ev('state = migrate(' + JSON.stringify(old) + '); resetCaches(); enforcePlan(); smartUpdate(); replaceOptions(1, "d"); computeCart();'); } catch(e){ ok = false; console.log(e); }
  check('старое сохранение упало', ok);
}
done('menu');
