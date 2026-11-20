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
// Сколько каждого продукта нужно на неделю, для каких блюд и в какие дни (days — по порядку: день, приём, блюдо, граммы).
function cartNeed(plan, lo){
  const sv = servings(plan, lo), need = {}, uses = {}, days = {};
  const put = (id, d, s, n, g) => { const l = days[id] || (days[id] = []), u = l.find(y => y.d === d && y.n === n); if (u) u.g += g; else l.push({d, s, n, g}); };
  for (const x of sv){
    if (x.add){ const id = x.add.id; if (!ING[id]) continue; need[id] = (need[id]||0) + x.add.g; const n = x.bread ? 'хлеб к обеду' : 'добрать белок'; (uses[id] = uses[id] || new Set()).add(n); put(id, x.d, x.s, n, x.add.g); continue; }
    let m = 0; for (const w of x.who) m += w.m;
    for (const id in x.r.ing) if (ING[id]){ const g = x.r.ing[id]*m; need[id] = (need[id]||0) + g; (uses[id] = uses[id] || new Set()).add(x.r.n); put(id, x.d, x.s, x.r.n, g); }
  }
  for (const id in days) days[id].sort((a, b) => a.d - b.d || SLOT_ORDER.indexOf(a.s) - SLOT_ORDER.indexOf(b.s));
  return {need, uses, days};
}
const isPantry = id => PANTRY.includes(id) || PANTRY_RE.test(id) || !!(ING[id] && (ING[id].t||[]).includes('spice'));
function packOf(id, stores){ for (const k of stores){ const it = storeItem(k, id); if (it && it.size !== 'w') return +it.size; } const i = ING[id]; return i && i.sale !== 'w' && +i.sale > 0 ? +i.sale : 1000; }
const pantryDefault = (id, need, stores) => isPantry(id) || (id === 'flour' && need < .15*packOf(id, stores));
function homeOf(id, need, stores){ const st = state.cart[id]; if (st && typeof st.h === 'boolean') return st.h; return pantryDefault(id, need, stores); }

/* ===================== Курица: охлаждённая или замороженная ===================== */
// state.chilled — переключатель в «Магазин и бюджет». Охлаждённая курица в данных: STORE_ITEMS[магазин]['<id>@chilled'],
// того же вида {name,size,price,url}. Отдельным продуктом в корзине она не бывает: это другой товар того же продукта.
const CHILL = '@chilled';
const chickenIds = () => DISLIKES.chicken ? DISLIKES.chicken.ids.filter(id => ING[id]) : [];
const chilledOn = () => !!(state.chilled ?? false);
const wantsChill = id => chilledOn() && chickenIds().includes(id);
function cartOffer(store, id){
  if (wantsChill(id)){
    const it = storeItem(store, id + CHILL);
    if (it){ const key = store + ':' + id + CHILL, own = state.prices[key]; return {size: it.size === 'w' ? 'w' : +it.size, price: own != null ? own : +it.price, item: it, avg:false, key, custom: own != null, store, chilled:true}; }
    return Object.assign(offer(store, id), {noChill:true});
  }
  return offer(store, id);
}
const hasItem = (store, id) => !!(storeItem(store, id) || (wantsChill(id) && storeItem(store, id + CHILL)));
// Разница цены охлаждённой и замороженной курицы в магазине, сом/кг (только где в данных есть обе).
function chillDiff(store = activeStores()[0]){
  const kg = it => +it.price/(it.size === 'w' ? 1 : +it.size/1000), out = [];
  for (const id of chickenIds()){ const a = storeItem(store, id), b = storeItem(store, id + CHILL); if (a && b) out.push({id, d:kg(b) - kg(a)}); }
  return out;
}
// Покупка нужного количества в магазине. Если в данных у товара есть другие фасовки (it.alt: [{size, price, name?, url?}]),
// берём ту, что дешевле на это количество, при равной цене — с меньшим остатком.
function buyAt(store, id, need){
  const o = cartOffer(store, id), i = ING[id];
  if (o.size === 'w'){ const q = Math.max(i.cat === 'veg' && i.k < 100 ? 300 : 100, Math.ceil(need/100)*100); return {o, cost:q/1000*o.price, q, packs:0, left:0}; }
  const pack = o => { const packs = Math.max(1, Math.ceil(need/o.size - .03)); return {o, cost:packs*o.price, q:packs*o.size, packs, left:Math.max(0, packs*o.size - need)}; };
  let best = pack(o);
  const alts = o.item && !o.custom && Array.isArray(o.item.alt) ? o.item.alt : [];
  for (const a of alts){
    if (!a || !(+a.price > 0) || !(+a.size > 0)) continue;
    const b = pack(Object.assign({}, o, {size:+a.size, price:+a.price, item:Object.assign({}, o.item, a, {alt:null})}));
    if (b.cost < best.cost - .01 || (Math.abs(b.cost - best.cost) <= .01 && b.left < best.left)) best = b;
  }
  return best;
}
// Во второй магазин переносим, только если вся покупка продукта там дешевле хотя бы на 30 сом или на 10%,
// и в любом случае не меньше чем на 15 сом (иначе картошку переносили ради 3 сом).
const SPLIT_MIN = 30, SPLIT_PCT = .1, SPLIT_ABS = 15;
const splitWorth = (save, cost) => save >= SPLIT_ABS && (save >= SPLIT_MIN || save >= cost*SPLIT_PCT);
function assign(id, need, stores){
  if (!SD){ const b = buyAt(stores[0], id, need); b.store = stores[0]; return b; }
  const av = stores.filter(k => hasItem(k, id));
  if (!av.length){ const b = buyAt(stores[0], id, need); b.store = null; b.approx = true; return b; }
  let best = buyAt(av[0], id, need); best.store = av[0];
  for (const k of av.slice(1)){ const b = buyAt(k, id, need); if (splitWorth(best.cost - b.cost, best.cost)){ b.store = k; best = b; } }
  return best;
}
function computeCart(plan = state.plan, lo = state.lo, stores = pctx().stores){
  const {need, uses, days} = cartNeed(plan, lo);
  const items = [], sub = {}; let total = 0, all = 0, bought = 0, approx = 0;
  for (const id in need){
    const i = ING[id], st = state.cart[id] || {}, best = assign(id, need[id], stores), home = homeOf(id, need[id], stores);
    items.push(Object.assign(best, {id, i, need:need[id], bought:!!st.b, home, pantry:home && typeof st.h !== 'boolean', dishes:[...(uses[id]||[])], use:days[id] || []}));
    all += best.cost;
    if (!home){ total += best.cost; const k = best.store || 'approx'; sub[k] = (sub[k]||0) + best.cost; if (best.approx) approx += best.cost; }
    if (st.b || home) bought++;
  }
  items.sort((a,b) => CAT_ORDER.indexOf(a.i.cat) - CAT_ORDER.indexOf(b.i.cat) || (a.bought||a.home) - (b.bought||b.home) || a.i.n.localeCompare(b.i.n,'ru'));
  return {items, total, pay:total, all, bought, sub, stores, approx};
}
// Пары магазинов для «Где дешевле»: итог по тем же правилам, основной магазин — тот, с которым дешевле.
function pairTotals(plan = state.plan, lo = state.lo){
  if (!SD || SD.keys.length < 2 || !plan) return [];
  const {need} = cartNeed(plan, lo), out = [], keys = SD.keys;
  const cost = st => { let t = 0; for (const id in need){ if (homeOf(id, need[id], st)) continue; t += assign(id, need[id], st).cost; } return t; };
  for (let a = 0; a < keys.length; a++) for (let b = a+1; b < keys.length; b++){
    const ab = cost([keys[a], keys[b]]), ba = cost([keys[b], keys[a]]);
    out.push(ab <= ba ? {stores:[keys[a], keys[b]], total:ab} : {stores:[keys[b], keys[a]], total:ba});
  }
  return out.sort((x, y) => x.total - y.total);
}

/* ===================== Честный лимит бюджета ===================== */
// «Похудеть»: пельмени, чучвару и жареное/жирное тесто экономией не предлагаем.
const loseGoal = () => eaters().some(p => isAdult(p) && p.goal === 'lose');
const loseBad = r => !!(r.ing.pelmeni || r.ing.chuchvara || /пельмен|чучвар/i.test(r.n) || (baseOf(r) === 'dough' && (hasF(r,'fried') || hasF(r,'fatty'))));
const homeKey = () => Object.keys(state.cart).filter(k => state.cart[k] && typeof state.cart[k].h === 'boolean').map(k => k + (state.cart[k].h ? 1 : 0)).join();
// Минимум на неделю: самое экономное сбалансированное меню («Эконом», жадное удешевление без потери белка и разнообразия).
let minCache = {key:'', sd:null, val:0};
function minCostEst(){
  const key = JSON.stringify([state.people, state.family, state.macro, state.mf, state.cuisines, state.diet, state.meals, state.quick, state.learner, state.cook2, state.autoProt, state.health, state.dislikes, state.allergies, state.customEx, activeStores(), state.adj, pricesVer, state.start, state.ecoKeep, chilledOn(), state.prices, homeKey()]);
  if (minCache.key !== key || minCache.sd !== SD){ const r = generatePlan('eco', 777, 1); minCache = {key, sd:SD, val:computeCart(r.plan, r.lo).total}; }
  // если текущее меню уже дешевле — минимум не выше него
  return state.plan && state.onboarded ? Math.min(minCache.val, computeCart().total) : minCache.val;
}
// Подсказки, если меню не укладывается в лимит. Подбираем по очереди (каждая следующая — уже после предыдущих),
// save у подсказки — экономия, если применить только её; total — реальная экономия, если применить все вместе.
let tipCache = {key:'', tips:[], total:0};
function capTips(){
  const cap = capVal(); if (!cap || !state.plan) return [];
  const key = JSON.stringify([state.plan, state.lo, state.noSnack, cap, pricesVer, activeStores(), filterCtx().key, state.mode, state.cart, state.people, state.family, state.meals, state.ecoKeep, state.prices, state.autoProt, chilledOn(), state.split, SD ? SD.keys : 0]);
  if (tipCache.key === key && tipCache.sd === SD) return tipCache.tips;
  const plan = state.plan, lo = state.lo, base = computeCart().total, tips = []; let total = 0;
  if (base > cap){
    const G = genSetup(state.mode), lose = loseGoal(), sum = planSum(plan, lo, G), cands = [];
    for (let d = 0; d < 7; d++) for (const s of SLOT_ORDER){
      const cur = RM[plan[d] && plan[d][s]]; if (!cur || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
      const loNext = s === 'd' && d < 6 && lo[d+1], k = loNext ? 2 : 1, cc = slotCost(cur, s, G);
      const ok = r => (!loNext || keepsOf(r) >= 2) && !(lose && loseBad(r)) && !premBad(r, G);
      const seen = new Set(), add = r => { if (seen.has(r.id)) return; seen.add(r.id); const est = (cc - slotCost(r, s, G))*k; if (est > 5) cands.push({d, s, id:r.id, prev:cur.id, loNext, est}); };
      replaceOptions(d, s, G).filter(ok).forEach(add);
      // и пара самых дешёвых из подходящих (те же правила разнообразия и здоровья, качество не сильно хуже)
      const c = ctxFor(plan, lo, d, s, G, sum), sc0 = score(cur, s, c, G);
      poolFor(s, c.wk, G.F).filter(r => r.id !== cur.id && slotCost(r, s, G) < cc - 5 && ok(r) && dayOK(plan[d], s, r) && varietyOK(r, c, G) && limitsOK(r, c, G, 0) && score(r, s, c, G) - sc0 < 2.5)
        .sort((a, b) => slotCost(a, s, G) - slotCost(b, s, G)).slice(0, 2).forEach(add);
    }
    cands.sort((a, b) => b.est - a.est);
    const done = [], busy = new Set();
    const cnt = id => { let n = 0; plan.forEach((day, d) => { for (const s in day) if (day[s] === id && !(s === 'l' && lo[d]) && !skipSlot(d, s)) n++; }); return n; };
    const near = (id, d) => [d-1, d+1].some(dd => { const day = plan[dd]; if (!day) return false; for (const s in day) if (day[s] === id && !(s === 'l' && lo[dd])) return true; return false; });
    const baseCnt = b => { let n = 0; plan.forEach((day, d) => { for (const s in day){ const r = RM[day[s]]; if (r && !(s === 'l' && lo[d]) && !skipSlot(d, s) && baseOf(r) === b) n++; } }); return n; };
    const fits = m => { const b = baseOf(RM[m.id]); return cnt(m.id) < 2 && !near(m.id, m.d) && baseCnt(b) - (baseOf(RM[m.prev]) === b ? 1 : 0) < G.baseMax; };
    let cur = base;
    try {
      for (let n = 0; n < 4 && cur > cap; n++){
        let best = null;
        for (const m of cands.filter(m => !busy.has(m.d) && !(m.s === 'd' && busy.has(m.d+1)) && plan[m.d][m.s] === m.prev && fits(m)).slice(0, 8)){
          const undo = simPick(m.d, m.s, m.id), save = cur - computeCart().total; undo();
          if (save >= 10 && (!best || save > best.save)) best = Object.assign({}, m, {save});
        }
        if (!best) break;
        const nl = best.d < 6 && plan[best.d+1] ? plan[best.d+1].l : null; best.undo = simPick(best.d, best.s, best.id); done.push(best); busy.add(best.d);
        if (best.d < 6 && plan[best.d+1] && plan[best.d+1].l !== nl) busy.add(best.d+1); cur -= best.save;
        tips.push({kind:'swap', d:best.d, s:best.s, id:best.id, prev:best.prev});
      }
      const sn = [];
      if (cur > cap && plan[0] && 's' in plan[0]) for (let d = 0; d < 7; d++){
        if (!RM[plan[d].s] || skipSlot(d, 's')) continue;
        state.noSnack[d] = 1; const save = cur - computeCart().total; delete state.noSnack[d];
        if (save >= 10) sn.push({kind:'snack', d, save});
      }
      sn.sort((a, b) => b.save - a.save).slice(0, 2).forEach(t => { if (cur <= cap) return; state.noSnack[t.d] = 1; tips.push({kind:'snack', d:t.d}); cur = computeCart().total; });
      // Два магазина: конкретная пара и реальная экономия
      if (cur > cap && SD && SD.keys.length > 1 && !state.split){
        const p = pairTotals(plan, lo)[0], save = p ? cur - p.total : 0;
        if (save >= 10){ tips.push({kind:'split', stores:p.stores}); cur = p.total; }
      }
      total = Math.max(0, base - cur);
    } finally {
      for (const t of tips) if (t.kind === 'snack') delete state.noSnack[t.d];
      for (let i = done.length - 1; i >= 0; i--) done[i].undo();
    }
    // Экономия каждой подсказки отдельно (если нажать «Применить» только её)
    for (const t of tips){
      if (t.kind === 'swap'){ const undo = simPick(t.d, t.s, t.id); t.save = base - computeCart().total; undo(); }
      else if (t.kind === 'snack'){ state.noSnack[t.d] = 1; t.save = base - computeCart().total; delete state.noSnack[t.d]; }
      else t.save = base - computeCart(plan, lo, t.stores).total;
    }
    // Все оставленные подсказки вместе, в том же порядке, — реальная общая экономия.
    const kept = tips.filter(t => t.save >= 10), undos = []; let st = undefined;
    if (kept.length !== tips.length){
      try {
        for (const t of kept){ if (t.kind === 'swap') undos.push(simPick(t.d, t.s, t.id)); else if (t.kind === 'snack') state.noSnack[t.d] = 1; else st = t.stores; }
        total = Math.max(0, base - computeCart(plan, lo, st || pctx().stores).total);
      } finally { for (const t of kept) if (t.kind === 'snack') delete state.noSnack[t.d]; for (let i = undos.length - 1; i >= 0; i--) undos[i](); }
    }
    tips.length = 0; kept.sort((a, b) => b.save - a.save).forEach(t => tips.push(t));
  }
  tipCache = {key, sd:SD, tips, total}; return tipCache.tips;
}
// Замена блюда в плане так же, как её сделает pickReplace (обед из остатков на завтра), без отметок и сохранения. Возвращает отмену.
function simPick(d, s, id){
  const plan = state.plan, lo = state.lo, r = RM[id], day = plan[d], nx = plan[d+1];
  const old = {v:day[s], lod:lo[d], nl:nx ? nx.l : undefined, hasNl:!!nx && 'l' in nx, nlo:lo[d+1]};
  day[s] = id; if (s === 'l' && lo[d]) lo[d] = false;
  if (s === 'd' && d < 6 && nx){
    if (lo[d+1]){
      if (state.cook2 && keepsOf(r) >= 2 && dayOK(nx, 'l', r)) nx.l = id;
      else { lo[d+1] = false; const o = replaceOptions(d+1, 'l'); nx.l = o[0] ? o[0].id : null; }
    } else if (state.cook2 && keepsOf(r) >= 2 && 'l' in nx && !state.man[(d+1)+':l'] && !state.noLo[d+1] && dayOK(nx, 'l', r)){ nx.l = id; lo[d+1] = true; }
  }
  return () => { day[s] = old.v; lo[d] = old.lod; if (nx){ if (old.hasNl) nx.l = old.nl; else delete nx.l; } if (d < 6) lo[d+1] = old.nlo; };
}
// Сводка для экранов: минимум на неделю, текущая сумма, лимит, нехватка, подсказки и сколько не хватит даже после них.
function budgetReport(){
  const cap = capVal(), minCost = minCostEst(), current = state.plan ? computeCart().total : 0;
  const shortfall = cap > 0 ? Math.max(0, current - cap) : 0;
  const tips = shortfall > 0 ? capTips() : [], tipsTotal = tips.length ? tipCache.total : 0;
  const stillShort = shortfall > 0 ? Math.max(0, current - tipsTotal - cap) : 0;
  return {minCost, current, cap, shortfall, tips, tipsTotal, stillShort, belowMin:cap > 0 && cap < minCost - .5, minGap:cap > 0 ? Math.max(0, minCost - cap) : 0, people:eaters().length};
}

/* ===================== Целые упаковки ===================== */
// После сборки меню: если от открытой упаковки остаётся много (≥ 40% упаковки и ≥ 60 сом), пробуем заменить
// другое блюдо недели (тот же приём пищи, все фильтры и правила разнообразия/здоровья планировщика) на блюдо
// с этим продуктом — только если общая сумма корзины от этого уменьшается. Меняет план на месте.
// Вызов: packReusePass(res) где res = {plan, lo}, или packReusePass(plan, lo, {fixed:(d, s) => bool}).
const REUSE_PCT = .4, REUSE_SOM = 60, REUSE_MIN_SAVE = 15;
const leftVal = x => x.left*x.o.price/x.o.size;
function bigLeftovers(cart){ return cart.items.filter(x => !x.home && x.packs >= 1 && x.o.size !== 'w' && x.left >= x.o.size*REUSE_PCT && leftVal(x) >= REUSE_SOM).sort((a, b) => leftVal(b) - leftVal(a)); }
function packReusePass(a, b, opts = {}){
  const plan = Array.isArray(a) ? a : a && a.plan, lo = (Array.isArray(a) ? b : a && a.lo) || [];
  const out = {swaps:[], saved:0};
  if (!Array.isArray(plan) || plan.length !== 7 || plan.some(d => !d)) return out;
  if (!Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) opts = b;
  const fixed = opts.fixed || ((d, s) => !!(state.man && state.man[d+':'+s]));
  const G = genSetup(state.mode), lose = loseGoal(), slots = G.slots;
  const put = (m, id) => { plan[m.d][m.s] = id; if (m.loNext) plan[m.d+1].l = id; };
  let cart = computeCart(plan, lo); const touched = new Set();
  for (let it = 0; it < 3; it++){
    const big = bigLeftovers(cart); if (!big.length) break;
    const sum = planSum(plan, lo, G), moves = [];
    for (const x of big.slice(0, 4)){
      const id = x.id;
      for (let d = 0; d < 7; d++){
        const p0 = dayProt(plan[d], G), pMin = Math.min(p0, G.pt.p*.95) - .5, f0 = G.fatMax < Infinity ? dayFat(plan[d], G) : 0;
        for (const s of slots){
          const cur = RM[plan[d][s]]; if (!cur || cur.ing[id] || fixed(d, s) || touched.has(d + s) || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
          const loNext = s === 'd' && d < 6 && lo[d+1]; let c = null, base = 0;
          for (const r of poolFor(s, isWk(d), G.F)){
            if (!r.ing[id] || r.id === cur.id || premBad(r, G) || (loNext && keepsOf(r) < 2) || (lose && loseBad(r)) || !dayOK(plan[d], s, r)) continue;
            if (r.ing[id]*hhP(r, s, G)*(loNext ? 2 : 1) > x.left*1.05) continue; // новая упаковка не нужна
            if (p0 - cur.P*portion(cur, s, G.k0, G.ml) + r.P*portion(r, s, G.k0, G.ml) < pMin) continue;
            if (f0 && f0 - cur.F*portion(cur, s, G.k0, G.ml) + r.F*portion(r, s, G.k0, G.ml) > Math.max(f0, G.fatMax)) continue;
            if (!c){ c = ctxFor(plan, lo, d, s, G, sum); base = score(cur, s, c, G); }
            if (!varietyOK(r, c, G) || !limitsOK(r, c, G, 0)) continue;
            const loss = Math.max(0, score(r, s, c, G) - base);
            if (loss > 1.2) continue;
            if (typeof planSwapOK === 'function' && !planSwapOK(plan, lo, d, s, r.id, G)) continue; // общие правила планировщика
            moves.push({d, s, id:r.id, prev:cur.id, loNext, ing:id, loss});
          }
        }
      }
    }
    if (!moves.length) break;
    moves.sort((m1, m2) => m1.loss - m2.loss);
    let best = null;
    for (const m of moves.slice(0, 12)){
      put(m, m.id); const nc = computeCart(plan, lo); put(m, m.prev);
      const save = cart.total - nc.total, nx = nc.items.find(y => y.id === m.ing), ox = cart.items.find(y => y.id === m.ing);
      if (save < REUSE_MIN_SAVE || !nx || !ox || nx.left >= ox.left) continue;
      const v = save/(m.loss + .4); if (!best || v > best.v) best = Object.assign(m, {v, save, nc});
    }
    if (!best) break;
    put(best, best.id); cart = best.nc; touched.add(best.d + best.s); if (best.loNext) touched.add((best.d + 1) + 'l');
    out.swaps.push({d:best.d, s:best.s, from:best.prev, to:best.id, ing:best.ing, save:best.save}); out.saved += best.save;
  }
  return out;
}
// Остаток открытой упаковки: куда он пойдёт дальше на неделе.
function reuseText(x){
  if (x.o.size === 'w' || x.packs !== 1 || !x.use || x.use.length < 2) return '';
  const first = x.use[0], rest = x.q - x.use.filter(u => u.d === first.d).reduce((a, u) => a + u.g, 0);
  const later = x.use.filter(u => u.d > first.d); if (!later.length || rest < x.o.size*REUSE_PCT) return '';
  const amt = x.i.pc ? (Math.floor(rest/x.i.pc) >= 1 ? `${Math.floor(rest/x.i.pc)} ${x.i.pcName}` : '') : qty(x.id, Math.round(rest/10)*10);
  if (!amt) return '';
  const nx = later[0], more = new Set(later.map(u => u.n + u.d)).size - 1;
  return `останется ≈ ${amt} — пойдёт в «${nx.n}» (${DAYS_SHORT[dowOf(addDays(parseIso(state.start), nx.d))]})${more > 0 ? ` и ещё ${more}` : ''}`;
}
// Стоимость слота в листе замены на одной основе: ужин «на 2 дня» = ужин + обед завтра. r — блюдо для сравнения
// (по умолчанию текущее). {cost, days, leftover?, note?}: days 2 — на 2 дня; leftover — это обед из вчерашнего ужина.
function slotCostBasis(d, s, r, G = genSetup(state.mode)){
  const plan = state.plan, cur = RM[plan && plan[d] && plan[d][s]]; r = typeof r === 'string' ? RM[r] : (r || cur);
  if (!r) return {cost:0, days:1};
  if (s === 'l' && state.lo[d] && r === cur) return {cost:0, days:1, leftover:true};
  const two = s === 'd' && d < 6 && !!state.lo[d+1];
  if (two && keepsOf(r) >= 2) return {cost:slotCost(r, 'd', G) + slotCost(r, 'l', G), days:2};
  if (two) return {cost:slotCost(r, s, G), days:1, note:'не хранится — обед на завтра подберём отдельно'};
  return {cost:slotCost(r, s, G), days:1};
}
// Нажатия в разделах корзины/бюджета. Если в общем ACT (06-render.js) появится обработчик с тем же именем — работает он.
const CART_ACT = {
  chilled:v => { state.chilled = v === '1'; tipCache.key = ''; if (typeof estCache !== 'undefined') estCache.key = ''; save(); render(); },
  ecoOpen:() => { ui.ecoOpen = !ui.ecoOpen; render(); }
};
document.addEventListener('click', e => {
  const el = e.target && e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
  const a = el.dataset.act, fn = CART_ACT[a]; if (!fn || (typeof ACT !== 'undefined' && ACT[a])) return;
  e.preventDefault(); fn(el.dataset.v, el);
});
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
const twoDayText = t => `Готовим ${portionsText(t.total, true)}: ${fmt1(t.today)} сегодня + ${fmt1(t.tom)} завтра`;

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
