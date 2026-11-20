// Порции, добавки, корзина, прогноз веса. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
/* ===================== Порции, добавки, корзина ===================== */
function breadFor(i, F, cu){
  const k = i + '|' + cu; if (k in F.bread) return F.bread[k];
  const p = state.people[i], ex = p ? personEx(p) : new Set();
  const order = cu === 'kg' ? ['lepeshka'].concat(BREADS.filter(x => x !== 'lepeshka')) : BREADS;
  return F.bread[k] = order.find(id => ING[id] && ingOK(id, F) && !ex.has(id)) || null;
}
let balCache = new Map();
// Порции на день для одного человека: каждый приём — своя доля калорий; суп не больше 450 мл (детям 300),
// недостающее к супу — хлебом (до 100 г, детям 50 г), остальное добирают или снимают другие приёмы,
// при снижении сначала режем углеводные блюда. extra — калории добавок (белок), они тоже в норме дня.
function balanceFor(items, K, ml, child, bread, extra, fmax = Infinity){
  const key = items.map(x => x.s + x.r.id).join(',') + '|' + K + '|' + ml + '|' + (child ? 1 : 0) + '|' + bread + '|' + Math.round(extra||0) + '|' + (fmax < Infinity ? Math.round(fmax) : '');
  const hit = balCache.get(key); if (hit) return hit;
  if (balCache.size > 6000) balCache.clear();
  let sh = 0; for (const x of items) sh += shareOf(x.s, ml);
  const target = K - (extra||0);
  const xs = items.map(x => {
    const soup = isSoup(x.r), want = K*shareOf(x.s, ml)/(sh||1);
    const [lo, hi] = soup ? soupRange(x.r, child) : [.4, 2.5];
    return {s:x.s, r:x.r, soup, want, lo, hi, m:clamp(want/x.r.kcal, lo, hi), b:0};
  });
  const bi = bread && ING[bread], bk = bi ? bi.k/100 : 0, bmax = BREAD_MAX[child ? 'child' : 'adult'];
  if (bk) for (const x of xs){ if (!x.soup) continue; const gap = x.want - x.r.kcal*x.m; if (gap > 40){ const g = Math.min(bmax, Math.round(gap/bk/10)*10); if (g >= 30) x.b = g; } }
  const tot = () => { let a = 0; for (const x of xs) a += x.r.kcal*x.m + x.b*bk; return a; };
  for (let it = 0; it < 8; it++){
    const diff = target - tot(); if (Math.abs(diff) <= target*.008) break;
    if (diff > 0){
      const adj = xs.filter(x => !x.soup && x.m < x.hi - 1e-6); let base = 0; for (const x of adj) base += x.r.kcal*x.m;
      if (!base){ const sx = xs.find(x => x.soup && bk && x.b < bmax); if (!sx) break; sx.b = Math.min(bmax, sx.b + Math.max(10, Math.round(diff/bk/10)*10)); continue; }
      const f = 1 + diff/base; for (const x of adj) x.m = Math.min(x.hi, x.m*f);
    } else {
      const bx = xs.find(x => x.b > 0);
      if (bx){ bx.b = Math.max(0, bx.b - Math.max(10, Math.round(-diff/bk/10)*10)); if (bx.b < 30) bx.b = 0; continue; }
      const adj = xs.filter(x => x.m > x.lo + 1e-6), w = x => x.r.kcal*x.m*(.4 + x.r.C*4/x.r.kcal);
      let W = 0; for (const x of adj) W += w(x); if (!W) break;
      const ws = adj.map(w); adj.forEach((x, j) => { x.m = Math.max(x.lo, x.m - (-diff)*ws[j]/W/x.r.kcal); });
    }
  }
  // Всё упёрлось в максимум порций (большая норма): добавляем хлеб к обеду/супу.
  if (bk){ const gap = target - tot(); if (gap > target*.02){ const x = xs.find(y => y.soup) || xs.find(y => y.s === 'l') || xs[0]; if (x) x.b = Math.min(bmax*1.5, x.b + Math.round(gap/bk/10)*10); } }
  // При диабете/давлении: жиров не больше нормы — переносим калории с жирного приёма на менее жирный.
  if (fmax < Infinity) for (let it = 0; it < 6; it++){
    let f = 0; for (const x of xs) f += x.r.F*x.m; if (bi) for (const x of xs) f += bi.f*x.b/100;
    if (f <= fmax) break;
    const fd = x => x.r.F*9/x.r.kcal, srt = xs.slice().sort((a, b) => fd(b) - fd(a));
    const A = srt.find(x => x.m > x.lo + 1e-6), B = srt.slice().reverse().find(x => x !== A && x.m < x.hi - 1e-6);
    if (!A || !B || fd(A) - fd(B) < .02) break;
    const need = (f - fmax)*9/(fd(A) - fd(B)), dk = Math.min(need*1.05, (A.m - A.lo)*A.r.kcal, (B.hi - B.m)*B.r.kcal);
    if (dk < 5) break;
    A.m -= dk/A.r.kcal; B.m += dk/B.r.kcal;
  }
  const out = {m:{}, bread:{}, k:0, p:0, f:0, c:0};
  for (const x of xs){
    x.m = x.soup ? Math.round(x.m*100)/100 : Math.round(x.m*20)/20;
    out.m[x.s] = x.m; out.k += x.r.kcal*x.m; out.p += x.r.P*x.m; out.f += x.r.F*x.m; out.c += x.r.C*x.m;
    if (x.b){ out.bread[x.s] = x.b; out.k += bi.k*x.b/100; out.p += bi.p*x.b/100; out.f += bi.f*x.b/100; out.c += bi.c*x.b/100; }
  }
  balCache.set(key, out); return out;
}
function servings(plan = state.plan, lo = state.lo, withAdd = autoProtOn()){
  const out = []; if (!plan) return out;
  const F = filterCtx(), E = eaters(), ml = planMeals(plan), K = E.map(personKcal), CH = E.map(p => !isAdult(p));
  const T = E.map(p => isAdult(p) ? targets(p).p : 0), opts = E.map((p, i) => withAdd && isAdult(p) ? addonOptions(i, F) : []);
  plan.forEach((day, d) => {
    if (!day) return;
    const per = E.map(() => []), mains = {}, extras = [];
    for (const s of SLOT_ORDER){ const r = RM[day[s]]; if (!r || skipSlot(d, s)) continue;
      E.forEach((p, i) => { const a = i > 0 ? altFor(r, s, d, i, F) : null; per[i].push({s, r:a || r, alt:!!a, of:r}); }); }
    E.forEach((p, i) => {
      const items = per[i]; if (!items.length) return;
      const sx = items.find(x => isSoup(x.r)) || items.find(x => x.s === 'l') || items[0], bread = breadFor(i, F, sx.r.cu), fm = F.anyHealth ? targets(p).f*1.08 : Infinity;
      let bal = balanceFor(items, K[i], ml, CH[i], bread, 0, fm), extra = 0, addP = 0, addF = 0; const adds = [];
      if (T[i] && opts[i].length){
        const thr = Math.max(10, T[i]*.1), used = new Set();
        for (let n = 0; n < 4 && adds.length < 2; n++){
          const gap = T[i] - bal.p - addP; if (gap < thr) break;
          const av = opts[i].filter(a => !used.has(a.id)); if (!av.length) break;
          const cover = av.filter(a => a.P >= gap*.8).sort((a,b) => a.kcal - b.kcal);
          const a = cover.length ? cover[(d+i) % Math.min(2, cover.length)] : av.reduce((m, x) => x.P/x.kcal > m.P/m.kcal ? x : m);
          used.add(a.id);
          // Добавка, только если калории позволяют: блюда чуть уменьшаем (сначала углеводные), день остаётся в +5% от нормы.
          const aF = ING[a.id].f*a.g/100, nb = balanceFor(items, K[i], ml, CH[i], bread, extra + a.kcal, fm - addF - aF);
          if (nb.k + extra + a.kcal > K[i]*1.05 || nb.p + addP + a.P < bal.p + addP + 5 || nb.f + addF + aF > fm*1.02) continue;
          bal = nb; extra += a.kcal; addP += a.P; addF += aF; adds.push(a);
        }
      }
      items.forEach(x => {
        const m = bal.m[x.s];
        if (x.alt) out.push({d, s:x.s, r:x.r, who:[{i, m}], alt:true, of:x.of, lo:false});
        else { const e = mains[x.s] || (mains[x.s] = {d, s:x.s, r:x.r, who:[], lo:x.s === 'l' && !!lo[d]}); e.who.push({i, m}); }
        const g = bal.bread[x.s]; if (g) extras.push({d, s:x.s, add:{id:bread, g, t:`+ ${shortName(bread).toLowerCase()} ${g} г`}, bread:true, who:[{i, m:1}], r:null, P:ING[bread].p*g/100});
      });
      adds.forEach(a => extras.push({d, s:'add', add:a, who:[{i, m:1}], r:null, P:a.P}));
    });
    SLOT_ORDER.forEach(s => { if (mains[s]) out.push(mains[s]); });
    extras.forEach(x => out.push(x));
  });
  return out;
}
function addonOptions(i, F){
  const ex = personEx(state.people[i]);
  return ADDONS.filter(a => ING[a.id] && ingOK(a.id, F) && !ex.has(a.id)).map(a => Object.assign({}, a, {P:ING[a.id].p*a.g/100, kcal:ING[a.id].k*a.g/100}));
}
// Совместимость: добавки для белка, которые были бы в меню при включённом автодоборе.
function addonsFrom(sv, plan = state.plan){ return servings(plan, state.lo, true).filter(x => x.add && !x.bread); }
function cartNeed(plan, lo){
  const sv = servings(plan, lo), need = {}, uses = {};
  for (const x of sv){
    if (x.add){ const id = x.add.id; if (!ING[id]) continue; need[id] = (need[id]||0) + x.add.g; (uses[id] = uses[id] || new Set()).add(x.bread ? 'хлеб к обеду' : 'добрать белок'); continue; }
    let m = 0; for (const w of x.who) m += w.m;
    for (const id in x.r.ing) if (ING[id]){ need[id] = (need[id]||0) + x.r.ing[id]*m; (uses[id] = uses[id] || new Set()).add(x.r.n); }
  }
  return {need, uses};
}
const isPantry = id => PANTRY.includes(id) || PANTRY_RE.test(id) || !!(ING[id] && (ING[id].t||[]).includes('spice'));
function packOf(id, stores){ for (const k of stores){ const it = storeItem(k, id); if (it && it.size !== 'w') return +it.size; } const i = ING[id]; return i && i.sale !== 'w' && +i.sale > 0 ? +i.sale : 1000; }
const pantryDefault = (id, need, stores) => isPantry(id) || (id === 'flour' && need < .15*packOf(id, stores));
function homeOf(id, need, stores){ const st = state.cart[id]; if (st && typeof st.h === 'boolean') return st.h; return pantryDefault(id, need, stores); }
// Во второй магазин переносим, только если там дешевле хотя бы на 30 сом или на 10%.
const SPLIT_MIN = 30, SPLIT_PCT = .1;
function assign(id, need, stores){
  if (!SD){ const b = buyIn(stores[0], id, need); b.store = stores[0]; return b; }
  const av = stores.filter(k => storeItem(k, id));
  if (!av.length){ const b = buyIn(stores[0], id, need); b.store = null; b.approx = true; return b; }
  let best = buyIn(av[0], id, need); best.store = av[0];
  for (const k of av.slice(1)){ const b = buyIn(k, id, need), save = best.cost - b.cost; if (save >= SPLIT_MIN || (save > 0 && save >= best.cost*SPLIT_PCT)){ b.store = k; best = b; } }
  return best;
}
function computeCart(plan = state.plan, lo = state.lo, stores = pctx().stores){
  const {need, uses} = cartNeed(plan, lo);
  const items = [], sub = {}; let total = 0, all = 0, bought = 0, approx = 0;
  for (const id in need){
    const i = ING[id], st = state.cart[id] || {}, best = assign(id, need[id], stores), home = homeOf(id, need[id], stores);
    items.push(Object.assign(best, {id, i, need:need[id], bought:!!st.b, home, pantry:home && typeof st.h !== 'boolean', dishes:[...(uses[id]||[])]}));
    all += best.cost;
    if (!home){ total += best.cost; const k = best.store || 'approx'; sub[k] = (sub[k]||0) + best.cost; if (best.approx) approx += best.cost; }
    if (st.b || home) bought++;
  }
  items.sort((a,b) => CAT_ORDER.indexOf(a.i.cat) - CAT_ORDER.indexOf(b.i.cat) || (a.bought||a.home) - (b.bought||b.home) || a.i.n.localeCompare(b.i.n,'ru'));
  return {items, total, pay:total, all, bought, sub, stores, approx};
}
// Пары магазинов для «Где дешевле»: итог по тем же правилам, основной магазин — тот, с которым дешевле.
function pairTotals(){
  if (!SD || SD.keys.length < 2 || !state.plan) return [];
  const {need} = cartNeed(state.plan, state.lo), out = [], keys = SD.keys;
  const cost = st => { let t = 0; for (const id in need){ if (homeOf(id, need[id], st)) continue; t += assign(id, need[id], st).cost; } return t; };
  for (let a = 0; a < keys.length; a++) for (let b = a+1; b < keys.length; b++){
    const ab = cost([keys[a], keys[b]]), ba = cost([keys[b], keys[a]]);
    out.push(ab <= ba ? {stores:[keys[a], keys[b]], total:ab} : {stores:[keys[b], keys[a]], total:ba});
  }
  return out.sort((x, y) => x.total - y.total);
}
// Подсказки, если меню не укладывается в лимит: конкретные замены и «убрать перекус» с реальной экономией.
let tipCache = {key:'', tips:[]};
function capTips(){
  const cap = capVal(); if (!cap || !state.plan) return [];
  const key = JSON.stringify([state.plan, state.lo, state.noSnack, cap, pricesVer, activeStores(), filterCtx().key, state.mode, state.cart, state.people, state.family, state.meals, state.ecoKeep, state.prices, state.autoProt]);
  if (tipCache.key === key) return tipCache.tips;
  const base = computeCart().total, tips = [];
  if (base > cap){
    const G = genSetup(state.mode), plan = state.plan, lo = state.lo, cands = [];
    for (let d = 0; d < 7; d++) for (const s of SLOT_ORDER){
      const cur = RM[plan[d] && plan[d][s]]; if (!cur || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
      const loNext = s === 'd' && d < 6 && lo[d+1];
      const best = replaceOptions(d, s, G).filter(r => !loNext || keepsOf(r) >= 2).map(r => ({r, est:(slotCost(cur, s, G) - slotCost(r, s, G))*(loNext ? 2 : 1)})).sort((a, b) => b.est - a.est)[0];
      if (best && best.est > 10) cands.push({d, s, id:best.r.id, prev:cur.id, loNext, est:best.est});
    }
    cands.sort((a, b) => b.est - a.est);
    const seen = new Set();
    for (const m of cands){
      if (seen.has(m.prev) || seen.has('to:' + m.id) || tips.length >= 3) continue;
      const a = plan[m.d][m.s], nl = m.loNext ? plan[m.d+1].l : null;
      plan[m.d][m.s] = m.id; if (m.loNext) plan[m.d+1].l = m.id;
      const save = base - computeCart().total;
      plan[m.d][m.s] = a; if (m.loNext) plan[m.d+1].l = nl;
      if (save >= 10){ tips.push({kind:'swap', d:m.d, s:m.s, id:m.id, prev:m.prev, save}); seen.add(m.prev); seen.add('to:' + m.id); }
    }
    if (plan[0] && 's' in plan[0]){
      const sn = [];
      for (let d = 0; d < 7; d++){ if (!RM[plan[d].s] || skipSlot(d, 's')) continue; state.noSnack[d] = 1; const save = base - computeCart().total; delete state.noSnack[d]; if (save >= 10) sn.push({kind:'snack', d, save}); }
      sn.sort((a, b) => b.save - a.save).slice(0, 2).forEach(t => tips.push(t));
    }
    tips.sort((a, b) => b.save - a.save);
  }
  tipCache = {key, tips}; return tips;
}
function amountText(id, g){
  const i = ING[id]; if (!i) return '';
  if (i.pc) return fmt1(Math.max(.5, Math.round(g/i.pc*2)/2)) + ' ' + i.pcName;
  if (id === 'oil') return fmt1(Math.max(.5, Math.round(g/13*2)/2)) + ' ст. л.';
  if (g < 20) return qty(id, Math.max(1, Math.round(g)));
  return qty(id, Math.round(g/5)*5);
}
const perPack = x => x.i.pc ? Math.max(1, Math.round(x.o.size/x.i.pc)) : 0;
function packLabel(x){ if (x.i.pc && x.o.size !== 'w') return perPack(x) + ' ' + x.i.pcName; return x.o.item ? qty(x.id, x.o.size) : (x.i.label || qty(x.id, x.i.sale)); }
function leftText(x){
  if (!x.packs || x.left < Math.max(20, x.o.size*.1)) return '';
  if (x.i.pc) { const n = Math.floor(x.left/x.i.pc); return n >= 1 ? `${n} ${x.i.pcName}` : ''; }
  return qty(x.id, Math.round(x.left/10)*10);
}
// Цена за кг/л (или за штуку для яиц), чтобы было видно дорогие и выгодные упаковки.
function unitPriceText(x){
  const u = isMl(x.id) ? 'л' : 'кг';
  if (x.o.size === 'w') return `${fmt(x.o.price)} сом/${u}`;
  const per = x.i.pc ? `${fmt1(x.o.price/perPack(x))} сом/шт` : `${fmt(x.o.price/x.o.size*1000)} сом/${u}`;
  return `${fmt(x.o.price)} сом за ${packLabel(x)} · ${per}`;
}
function weekRange(){
  const a = parseIso(state.start), b = addDays(a, 6);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}` : `${dayMonth(a)} – ${dayMonth(b)}`;
}
const APPROX_T = 'Цена примерная — уточните в магазине';
function shareText(cart){
  const n = eaters().length, multi = cart.stores.length > 1;
  const lines = [`Корзина недели · ${cart.stores.map(storeName).join(' + ')}`, `${weekRange()} · ${n} ${plural(n,'человек','человека','человек')} · ≈ ${fmt(cart.pay)} сом`];
  const block = list => { let cat = ''; list.slice().sort((a,b) => CAT_ORDER.indexOf(a.i.cat) - CAT_ORDER.indexOf(b.i.cat)).forEach(x => { if (x.i.cat !== cat){ cat = x.i.cat; lines.push('', CATS[cat]); } lines.push(`${x.bought?'✓':'•'} ${x.o.item ? x.o.item.name : x.i.n}: ${qtyText(x)}`); }); };
  for (const st of cart.stores){
    const list = cart.items.filter(x => !x.home && x.store === st); if (!list.length) continue;
    if (multi) lines.push('', `== ${storeName(st)} · ≈ ${fmt(cart.sub[st]||0)} сом ==`);
    block(list);
  }
  const ap = cart.items.filter(x => !x.home && !x.store);
  if (ap.length){ lines.push('', `== ${APPROX_T} · ≈ ${fmt(cart.sub.approx||0)} сом ==`); block(ap); }
  return lines.join('\n').replace(/\n{3,}/g,'\n\n');
}
const qtyText = x => x.o.size === 'w' ? qty(x.id, x.q) : (x.packs > 1 || x.i.pc ? x.packs + ' × ' : '') + packLabel(x);
function needText(x){ if (x.o.size === 'w') return ''; return x.i.pc ? `нужно ≈ ${Math.ceil(x.need/x.i.pc)} ${x.i.pcName}` : `нужно ≈ ${qty(x.id, Math.ceil(x.need/10)*10)}`; }
// «Готовлю на 2 дня»: сколько порций сегодня на ужин и сколько завтра на обед (те же числа в меню и рецепте).
function twoDay(d, sv){
  if (!(d < 6 && state.lo[d+1])) return null;
  const sumOf = x => x ? x.who.reduce((a, w) => a + w.m, 0) : 0;
  const today = r1(sumOf(sv.find(y => y.d === d && y.s === 'd' && !y.alt && !y.add))), tom = r1(sumOf(sv.find(y => y.d === d+1 && y.s === 'l' && !y.alt && !y.add)));
  return {today, tom, total:r1(today + tom)};
}
const twoDayText = t => `Готовим ${fmtD(t.total)} порции: ${fmtD(t.today)} сегодня + ${fmtD(t.tom)} завтра`;

/* ===================== Прогноз веса ===================== */
function currentWeight(){ const l = state.wlog; return l.length ? l[l.length-1].w : +state.people[0].weight || 70; }
// Средние калории меню в день для первого человека (с добавками и хлебом, как в меню).
function menuKcal(){
  if (!state.plan) return 0;
  const sv = servings(); let s = 0, n = 0;
  for (let d = 0; d < 7; d++){ const k = dayTotals(d, sv, 0).k; if (k > 0){ s += k; n++; } }
  return n ? s/n : 0;
}
function forecast(p = state.people[0]){
  if (!isAdult(p)) return null;
  const mk = p === state.people[0] && state.onboarded ? menuKcal() : 0, maint = maintKcal(p);
  const perWeek = ((mk || personKcal(p)) - maint)*7/7700, tgt = parseFloat(p.target), cur = currentWeight();
  const basis = mk ? `По меню в среднем ${fmt(mk)} ккал в день, расход ≈ ${fmt(maint)} ккал.` : `По норме ${fmt(personKcal(p))} ккал в день, расход ≈ ${fmt(maint)} ккал.`;
  const rate = Math.abs(perWeek) < .05 ? 'Калории по расходу, вес будет держаться' : `≈ ${perWeek < 0 ? '−' : '+'}${fmt1(Math.abs(perWeek))} кг в неделю`;
  let goal = '';
  if (tgt > 0){
    const rem = tgt - cur;
    if (Math.abs(rem) < .3) goal = 'Вы уже у цели';
    else if (Math.abs(perWeek) < .05 || Math.sign(rem) !== Math.sign(perWeek)) goal = `Чтобы прийти к ${fmt1(tgt)} кг, выберите цель «${rem < 0 ? 'Похудеть' : 'Набрать массу'}»`;
    else { const dt = addDays(new Date(), Math.ceil(rem/perWeek*7)); goal = `цель к ${dayMonth(dt)}${dt.getFullYear() !== new Date().getFullYear() ? ' ' + dt.getFullYear() : ''}`; }
  }
  return {rate, goal, perWeek, basis, menu:mk};
}
