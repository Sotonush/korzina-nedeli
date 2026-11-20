// Фильтры и подбор меню. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
/* ===================== Фильтры ===================== */
const typeFit = (r, s) => { const t = r.types; return s==='b' ? t.includes('b') : s==='s' ? t.includes('s') : s==='l' ? t.includes('m') : (t.includes('m')||t.includes('d')); };
function customWords(){ return String(state.customEx||'').toLowerCase().split(/[,;\n]+/).map(s=>s.trim()).filter(s=>s.length>=3).map(s=>s.slice(0, Math.max(3, s.length-2))); }
let fcache = {key:'', F:null};
function resetCaches(){ fcache = {key:'', F:null}; pc = {sd:undefined}; estCache.key = ''; wkCache.start = null; balCache = new Map(); tipCache.key = ''; summerIds.v = null; altCache.clear(); altRecent.length = 0; altWork = null; }
function filterCtx(){
  const eq = equipOf();
  const key = JSON.stringify([state.allergies,state.diet,state.dislikes,state.customEx,state.health,state.quick,state.learner,state.start,state.cuisines,eq]);
  if (fcache.key === key && fcache.F) return fcache.F;
  const tags = new Set(); state.allergies.forEach(a => (ALLERGY_TAGS[a]||[a]).forEach(t => tags.add(t)));
  const ex = new Set(); state.dislikes.forEach(k => (DISLIKES[k] ? DISLIKES[k].ids : []).forEach(id => ex.add(id)));
  const F = {key, tags, ex, words:customWords(), diab:!!state.health.diab, bp:!!state.health.bp, equip:eq, pools:{}, alt:{}, base:{}, bread:{}};
  F.anyHealth = F.diab || F.bp;
  fcache = {key, F}; return F;
}
// inDish — продукт внутри блюда. Без него — отдельный продукт к столу (хлеб к супу, добавка для белка):
// при диабете только ржаной хлеб, в «Экономе» без дорогих продуктов.
const WHITE_BREAD = new Set(['bread','lepeshka','lavash','baton']);
function ingOK(id, F, inDish){
  const i = ING[id]; if (!i) return false; const t = i.t || [];
  if (t.some(x => F.tags.has(x))) return false;
  if (state.diet === 'veg' && (t.includes('meat') || t.includes('fish'))) return false;
  if (state.diet === 'pesc' && t.includes('meat')) return false;
  if (F.ex.has(id)) return false;
  const nm = i.n.toLowerCase(); if (F.words.some(w => nm.includes(w))) return false;
  if (!inDish){
    if (F.diab && WHITE_BREAD.has(id)) return false;
    if (F.bp && SALTY_RE.test(id)) return false;
    if (state.mode === 'eco'){ const k = premiumId(id); if (k && !(state.ecoKeep||[]).includes(k)) return false; }
  }
  return true;
}
function baseOK(r, F){
  if (r.id in F.base) return F.base[r.id];
  let ok = true;
  for (const id in r.ing) if (!ingOK(id, F, true)){ ok = false; break; }
  if (ok){ const rn = r.n.toLowerCase(); if (F.words.some(w => rn.includes(w))) ok = false; }
  if (ok && F.diab && (hasF(r,'sweet') || honeyCentred(r) || (r.ing.banana||0) >= 60)) ok = false;
  if (ok && F.bp && saltyR(r)) ok = false;
  if (ok && needsOf(r).some(n => F.equip[n] === false)) ok = false;
  return F.base[r.id] = ok;
}
let wkCache = {start:null, arr:[]};
function isWk(d){ if (wkCache.start !== state.start){ const s = parseIso(state.start); wkCache = {start:state.start, arr:[0,1,2,3,4,5,6].map(i => dowOf(addDays(s,i)) >= 5)}; } return !!wkCache.arr[d]; }
const quickOn = wk => state.quick === 'always' || (state.quick === 'weekdays' && !wk);
function slotOK(r, s, wk, F){
  if (!typeFit(r,s) || !baseOK(r,F)) return false;
  if (s === 's' && r.time > QUICK_LIM.s) return false; // перекус — не дольше 15 минут всегда
  if (quickOn(wk) && r.time > QUICK_LIM[s]) return false;
  if (state.learner && !wk && diffOf(r) === 'hard') return false;
  if (F.anyHealth && s === 'd' && heavyDinner(r)) return false;
  return true;
}
// Только «безопасные» правила: аллергии, диета, нелюбимое, здоровье, техника. Применяются сразу.
const safeOK = (r, s, F) => baseOK(r, F) && !(F.anyHealth && s === 'd' && heavyDinner(r));
function poolFor(s, wk, F = filterCtx()){ const k = s + (wk ? 1 : 0); return F.pools[k] || (F.pools[k] = RECIPES.filter(r => slotOK(r, s, wk, F))); }
const pool = s => poolFor(s, false);
function allowedCount(){ const F = filterCtx(); return RECIPES.filter(r => baseOK(r, F)).length; }
function personEx(p){ const ex = new Set(); (p.dislikes||[]).forEach(k => (DISLIKES[k] ? DISLIKES[k].ids : []).forEach(id => ex.add(id))); return ex; }
const blocks = (ex, r) => { for (const id in r.ing) if (ex.has(id)) return true; return false; };
const cpk = r => servingCost(r) / r.kcal;
function medianCpk(list){ const a = list.map(cpk).sort((x,y)=>x-y); return a.length ? a[a.length>>1] : 1; }

/* ===================== Отдельные блюда для одного человека ===================== */
// Замена для того, кто не ест основное блюдо, подбирается по ЕГО меню на неделю: те же правила разнообразия
// (не повторять его обед/вчерашний ужин, лимиты основы и т. д.). Его ужин может стать его обедом на завтра (остатки).
// План ищем среди: явно переданного, собираемого сейчас (altWork), state.plan и последних собранных.
let altWork = null; const altRecent = [], altCache = new Map();
const planSig = (plan, lo) => plan.map((day, d) => SLOT_ORDER.map(s => (day && day[s]) || '').join(',') + (lo && lo[d] ? '*' : '') + (skipSlot(d, 's') ? '!' : '')).join('|');
const altSim = (c, r) => Math.abs(Math.log(c.kcal/r.kcal)) + Math.abs(c.P/c.kcal - r.P/r.kcal)*12 + (c.cu === r.cu ? 0 : .3);
function altSimple(r, s, d, ex, F){
  const wk = isWk(d), key = r.id + '|' + s + '|' + (wk?1:0) + '|' + [...ex].join(',');
  if (key in F.alt) return F.alt[key];
  let best = null, bs = Infinity; const base = cpk(r) || 1;
  for (const c of poolFor(s, wk, F)){
    if (c.id === r.id || blocks(ex, c)) continue;
    const sc = altSim(c, r) + .3*cpk(c)/base + (c.prep ? .5 : 0);
    if (sc < bs){ bs = sc; best = c; }
  }
  return F.alt[key] = best;
}
function altWeek(plan, lo, i, ex, F, G0){
  const key = planSig(plan, lo) + '#' + i + '#' + [...ex].join(',') + '#' + F.key + '#' + state.mode + '#' + state.cook2 + '#' + todayIso();
  const hit = altCache.get(key); if (hit) return hit;
  if (altCache.size > 300) altCache.clear();
  const G = G0 || genSetup(state.mode), pp = plan.map(day => Object.assign({}, day)), plo = plan.map(() => false), out = {};
  for (let d = 0; d < 7; d++){ const day = plan[d]; if (!day) continue;
    for (const s of SLOT_ORDER){
      const r = RM[day[s]]; if (!r || skipSlot(d, s)) continue;
      if (s === 'l' && lo[d]){
        if (!blocks(ex, r)){ plo[d] = true; continue; }
        const pd = d > 0 ? RM[pp[d-1].d] : null;
        if (pd && pd.id !== plan[d-1].d && state.cook2 && keepsOf(pd) >= 2 && dayOK(pp[d], 'l', pd)){ pp[d].l = pd.id; plo[d] = true; out[d+':l'] = pd; continue; }
      }
      if (!blocks(ex, r)) continue;
      const c = ctxFor(pp, plo, d, s, G, planSum(pp, plo, G, true)); c.light = true;
      // Его ужин станет его обедом завтра, если основной обед завтра — остатки, которые он тоже не ест.
      if (s === 'd' && d < 6 && lo[d+1] && state.cook2 && plan[d+1].l === r.id) c.loNext = true;
      const base = cpk(r) || 1; let best = null, bk = Infinity;
      for (const x of poolFor(s, isWk(d), F)){
        if (x.id === r.id || blocks(ex, x) || !dayOK(pp[d], s, x)) continue;
        const k = vMask(x, c, G)*100 + altSim(x, r) + .3*cpk(x)/base + (x.prep ? 2 : 0) + (premBad(x, G) ? 3 : 0) + (G.noFrozen && frozenR(x) ? 3 : 0) + summerPen(x, G)*.5;
        if (k < bk){ bk = k; best = x; }
      }
      if (best){ pp[d][s] = best.id; out[d+':'+s] = best; }
    }
  }
  altCache.set(key, out); return out;
}
function altFor(r, s, d, i, F, plan, lo){
  const p = state.people[i]; if (!p || !(p.dislikes||[]).length) return null;
  const ex = personEx(p); if (!blocks(ex, r)) return null;
  let P = plan ? {plan, lo:lo || []} : null;
  if (!P){ const list = [altWork, state.plan ? {plan:state.plan, lo:state.lo} : null].concat(altRecent);
    for (const x of list) if (x && x.plan && x.plan[d] && x.plan[d][s] === r.id){ P = x; break; } }
  if (P){ const w = altWeek(P.plan, P.lo || [], i, ex, F, P.G); const a = w[d+':'+s]; if (a) return a; }
  return altSimple(r, s, d, ex, F);
}

/* ===================== Подбор меню ===================== */
const skipSlot = (d, s) => s === 's' && !!(state.noSnack && state.noSnack[d]);
function premOf(r){ if (r._pm) return r._pm; const ids = Object.keys(r.ing), out = []; for (const k in PREMIUM) if (ids.some(id => PREMIUM[k].re.test(id))) out.push(k); return r._pm = out; }
const premBad = (r, G) => !!G.eco && premOf(r).some(k => !G.keepP.has(k));
const summerG = r => { if (r._sg !== undefined) return r._sg; const S = summerIds(); let g = 0; for (const id in r.ing) if (S.has(id)) g += r.ing[id]; return r._sg = g; };
function summerPen(r, G){ if (!G.winter) return 0; const g = summerG(r); return g ? .5 + Math.min(1.5, g/100) : 0; }
// Тепличные овощи зимой (октябрь–май): не больше ~800 г на взрослого и 500 г на ребёнка в неделю.
const SUMMER_LIM = {adult:800, child:500};
// Правила разнообразия и здоровья — биты маски. Чем старше бит, тем важнее правило; ослабляем с младших.
// Кандидаты сравниваются по маске (лексикографически), потом по оценке — так нарушается только то, без чего нельзя.
const B_NEAR = 1,     // то же блюдо в соседние дни; фрукт чаще 3 раз
  B_SUMMER = 2,       // зимой тепличных овощей больше лимита
  B_CHICK = 4,        // курица больше 4 дней в неделю
  B_WEEK = 8,         // основа/крупа/мясо чаще лимита в неделю (крупы 2, курица и картошка 4, остальное 3)
  B_CARB = 16,        // диабет: углеводов в обеде/ужине больше ~50 г
  B_SLOT = 32,        // то же блюдо в том же приёме пищи в другой день
  B_DISH = 64,        // одно блюдо чаще 2 раз в неделю (остатки — та же готовка)
  B_DAY = 128,        // одна основа дважды в день (включая обед из остатков)
  B_HEALTH = 256;     // лимиты здоровья: белая мука, жирное, каймак; диабет: углеводы завтрака/перекуса
const RELAX_ORDER = ['соседние дни и фрукты','тепличные овощи зимой','курица ≤ 4 дней','недельные лимиты основы','углеводы обеда/ужина при диабете','одно блюдо в том же приёме','блюдо ≤ 2 раз','основа раз в день','лимиты здоровья'];
const maskText = m => RELAX_ORDER.filter((t, i) => m & (1 << i)).join(', ');
function genSetup(mode){
  const F = filterCtx(), pt = targets(state.people[0]), slots = slotList(), ml = slots.length, E = eaters();
  const G = {F, mode, pt, k0:pt.k, rp:pt.p*4/pt.k, rf:pt.f*9/pt.k, rc:pt.c*4/pt.k, ml, slots, E:E.map(personKcal), C:E.map(p => !isAdult(p)), med:{}, maxUse:{}, w:(MODES[mode]||MODES.opt).w, hh:{}, sc:{}, cp:{},
    lim:{}, baseMax:3, kayLim:F.anyHealth ? 1 : 99, fruitMax:3, winter:isWinter(), summer:summerIds(), eco:mode === 'eco', keepP:new Set(state.ecoKeep||[]),
    bread0:breadFor(0, F, 'home'), fatMax:F.anyHealth ? pt.f*1.1 : Infinity, protOn:autoProtOn(),
    carbMax:F.diab ? 50 : Infinity, carbLD:Infinity, noFrozen:state.people[0].goal === 'lose', chickMax:7, sumLim:Infinity, noPrep:[], exs:[], adults:[]};
  // Диабет: завтрак и перекус — не больше 50 г углеводов (жёстко); обед/ужин — не больше max(50, 110% доли дневной нормы углеводов),
  // иначе при норме жиров калории просто нечем добрать (с макросами «Меньше углеводов» это ≈ 50–55 г).
  if (F.diab){ G.lim.whiteflour = 2; G.carbLD = Math.max(50, pt.c*1.1*Math.max(shareOf('l', ml), shareOf('d', ml))); }
  if (F.bp){ G.lim.fatty = 1; G.lim.salty = 0; }
  if (G.winter) G.sumLim = E.reduce((a, p) => a + (isAdult(p) ? SUMMER_LIM.adult : SUMMER_LIM.child), 0);
  // Заготовка «с вечера» невозможна для дней, вечер перед которыми уже прошёл (сегодня и раньше).
  const st = parseIso(state.start), today = todayIso();
  for (let d = 0; d < 7; d++) G.noPrep.push(isoOf(addDays(st, d)) <= today);
  for (const s of slots){ const pl = poolFor(s, false, F); G.med[s] = medianCpk(pl) || 1; const n = Math.max(1, pl.length); G.maxUse[s] = n >= 4 ? 2 : Math.ceil(7/n); }
  // Курица не больше 4 дней, если есть другие белки (мясо, рыба, печень, индейка, бобовые).
  const other = ['beef','mutton','fish','liver','turkey','lentils','chickpeas','beans'];
  if (poolFor('l', false, F).concat(poolFor('d', false, F)).some(r => !vk(r).chick && vk(r).keys.some(k => other.includes(k)))) G.chickMax = 4;
  E.forEach((p, i) => {
    if (i > 0 && (p.dislikes||[]).length) G.exs.push(personEx(p));
    if (isAdult(p) && G.adults.length < 3){ const t = i ? targets(p) : pt; G.adults.push({i, K:G.E[i], tp:t.p, tf:t.f || 1, fm:F.anyHealth ? t.f*1.08 : Infinity, bread:i ? breadFor(i, F, 'home') : G.bread0}); }
  });
  return G;
}
// Кандидаты для автоматического выбора: без заготовки «с вечера» на сегодня/прошлые дни, без пельменей при похудении,
// в «Экономе» без дорогих продуктов. Если так не остаётся ничего — ослабляем по очереди.
function autoOK(r, d, G){ return !(r.prep && G.noPrep[d]) && !(G.noFrozen && frozenR(r)) && !premBad(r, G); }
function candList(s, d, G){
  const k = s + d; if (G.cp[k]) return G.cp[k];
  const all = poolFor(s, isWk(d), G.F);
  let a = all.filter(r => autoOK(r, d, G));
  if (!a.length) a = all.filter(r => !(r.prep && G.noPrep[d]) && !premBad(r, G));
  if (!a.length) a = all.filter(r => !(r.prep && G.noPrep[d]));
  if (!a.length) a = all;
  return G.cp[k] = a;
}
function hhP(r, s, G){ const k = r.id + s; if (k in G.hh) return G.hh[k]; let a = 0; G.E.forEach((kc, i) => { a += portion(r, s, kc, G.ml, G.C[i]); }); return G.hh[k] = a; }
function slotCost(r, s, G){ const k = r.id + s; if (k in G.sc) return G.sc[k]; return G.sc[k] = servingCost(r)*hhP(r, s, G); }
// Сводка по всему плану, один раз на шаг. Недельные счётчики (блюдо, ключи, фрукты, флаги) — по готовкам:
// обед из вчерашнего ужина не считается новой готовкой. Дневные ключи, приём пищи, курица по дням и граммы — по тому, что съедено.
// light — без граммов и белка (для меню одного человека).
function planSum(plan, lo, G, light){
  const used = {}, need = {}, dayP = [], keys = {}, fruits = {}, flags = {}, slotIds = {}, dayKeys = [], dayChick = []; let kay = 0, chickDays = 0, summer = 0;
  for (let dd = 0; dd < 7; dd++){ const day = plan[dd]; dayP.push(0); dayKeys.push({}); dayChick.push(0); if (!day) continue;
    for (const ss in day){ const r = RM[day[ss]]; if (!r || skipSlot(dd, ss)) continue;
      const V = vk(r), dk = dayKeys[dd], si = slotIds[ss] || (slotIds[ss] = {});
      si[r.id] = (si[r.id]||0) + 1;
      for (const k of V.keys) dk[k] = (dk[k]||0) + 1;
      if (V.chick) dayChick[dd]++;
      if (!(ss === 'l' && lo[dd])){
        used[r.id] = (used[r.id]||0) + 1;
        for (const k of V.wkeys) keys[k] = (keys[k]||0) + 1;
        for (const f of fruitIds(r)) fruits[f] = (fruits[f]||0) + 1;
        for (const f in G.lim) if (flagOn(r, f)) flags[f] = (flags[f]||0) + 1;
        if (kaymakStyle(r)) kay++;
      }
      if (light) continue;
      const hm = hhP(r, ss, G); for (const id in r.ing) need[id] = (need[id]||0) + r.ing[id]*hm;
      dayP[dd] += r.P*portion(r, ss, G.k0, G.ml);
    }
    if (dayChick[dd]) chickDays++;
  }
  if (!light && G.sumLim < Infinity) for (const id of G.summer) summer += need[id] || 0;
  return {used, need, dayP, keys, fruits, flags, kay, slotIds, dayKeys, dayChick, chickDays, summer};
}
// Контекст слота = сводка минус само блюдо в этом слоте.
function ctxFor(plan, lo, d, s, G, sum = planSum(plan, lo, G)){
  const at = skipSlot(d, s) ? null : RM[plan[d] && plan[d][s]] || null, minus = {}, atLo = s === 'l' && !!lo[d];
  let dayP = sum.dayP[d], rem = shareOf(s, G.ml), minusId = null, curC = null, minusSummer = 0;
  if (at){ const hm = hhP(at, s, G); for (const id in at.ing) minus[id] = at.ing[id]*hm; dayP -= at.P*portion(at, s, G.k0, G.ml); if (!atLo){ minusId = at.id; curC = at; }
    if (sum.summer) for (const id in at.ing) if (G.summer.has(id)) minusSummer += minus[id]; }
  for (const ss of G.slots) if (ss !== s && !(plan[d] && plan[d][ss])) rem += shareOf(ss, G.ml);
  return {d, s, used:sum.used, need:sum.need, sum, cur:curC, at, atLo, minus, minusId, minusSummer, needR: Math.max(0, G.pt.p - dayP)*4/(G.k0*rem), wk:isWk(d), plan, lo,
    loNext: s === 'd' && d < 6 && !!lo[d+1]};
}
const usedOf = (c, id) => (c.used[id]||0) - (c.minusId === id ? 1 : 0);
const needOf = (c, id) => (c.need[id]||0) - (c.minus[id]||0);
function nearUse(id, c){ for (const dd of [c.d-1, c.d+1]){ const day = c.plan[dd]; if (!day) continue; for (const ss in day) if (day[ss] === id && !(ss === 'l' && c.lo[dd])) return true; } return false; }
// Будет ли ужин обедом на завтра (готовлю на 2 дня).
const willLo = (r, c) => c.s === 'd' && (c.loNext || (state.cook2 && c.d < 6 && !state.noLo[c.d+1] && keepsOf(r) >= 2 && !(c.plan[c.d+1] && c.plan[c.d+1].l && c.plan[c.d+1].l !== (c.at && c.at.id))));
function vMask(r, c, G){
  const V = vk(r), S = c.sum, A = c.at ? vk(c.at) : null, C = c.cur, CV = C ? vk(C) : null; let m = 0;
  for (const f in G.lim) if (flagOn(r, f) && (S.flags[f]||0) - (C && flagOn(C, f) ? 1 : 0) >= G.lim[f]){ m |= B_HEALTH; break; }
  if (kaymakStyle(r) && S.kay - (C && kaymakStyle(C) ? 1 : 0) >= G.kayLim) m |= B_HEALTH;
  if (G.carbMax < Infinity){ const cb = r.C*portion(r, c.s, G.k0, G.ml); if (c.s === 'b' || c.s === 's' ? cb > G.carbMax : cb > G.carbLD) m |= (c.s === 'b' || c.s === 's') ? B_HEALTH : B_CARB; }
  const dk = S.dayKeys[c.d];
  for (const k of V.keys) if ((dk[k]||0) - (A && A.set.has(k) ? 1 : 0) > 0){ m |= B_DAY; break; }
  if (c.loNext && c.d < 6){ const nk = S.dayKeys[c.d+1]; for (const k of V.keys) if ((nk[k]||0) - (A && A.set.has(k) ? 1 : 0) > 0){ m |= B_DAY; break; } }
  if (usedOf(c, r.id) >= (G.maxUse[c.s]||2)) m |= B_DISH;
  const si = S.slotIds[c.s]; if (si && (si[r.id]||0) - (c.at && c.at.id === r.id ? 1 : 0) > 0) m |= B_SLOT;
  if (c.loNext && S.slotIds.l && (S.slotIds.l[r.id]||0) - (c.at && c.at.id === r.id ? 1 : 0) > 0) m |= B_SLOT; // завтрашний обед из остатков
  for (const k of V.wkeys) if ((S.keys[k]||0) - (CV && CV.wset.has(k) ? 1 : 0) >= keyLim(k)){ m |= B_WEEK; break; }
  if (V.chick && G.chickMax < 7){
    const lo2 = willLo(r, c) ? 1 : 0, here = S.dayChick[c.d] - (A && A.chick ? 1 : 0) > 0;
    let days = S.chickDays - (A && A.chick && S.dayChick[c.d] === 1 ? 1 : 0);
    days += here ? 0 : 1; if (lo2 && c.d < 6 && !(S.dayChick[c.d+1] - (c.loNext && A && A.chick ? 1 : 0) > 0)) days++;
    if (days > G.chickMax) m |= B_CHICK;
  }
  if (G.sumLim < Infinity && !c.light){ const g = summerG(r); if (g){ const add = g*(hhP(r, c.s, G) + (willLo(r, c) ? hhP(r, 'l', G) : 0)); if (S.summer - c.minusSummer + add > G.sumLim) m |= B_SUMMER; } }
  if (nearUse(r.id, c)) m |= B_NEAR;
  for (const f of fruitIds(r)) if ((S.fruits[f]||0) - (C && C.ing[f] ? 1 : 0) >= G.fruitMax){ m |= B_NEAR; break; }
  return m;
}
// Совместимость (корзина и старые проходы): варианты без нарушений. lvl 1 — без недельных лимитов, 2 — без ограничений.
const varietyOK = (r, c, G) => !(vMask(r, c, G) & (B_NEAR|B_DISH|B_SLOT));
function limitsOK(r, c, G, lvl){ if (lvl >= 2) return true; const m = vMask(r, c, G); return !(m & (lvl === 0 ? (B_SUMMER|B_CHICK|B_WEEK|B_CARB|B_DAY|B_HEALTH) : (B_CARB|B_DAY|B_HEALTH))); }
function effCost(r, s, c, G){
  const ec = c.ec || (c.ec = {}); const v = ec[r.id]; if (v !== undefined) return v;
  return ec[r.id] = effCost0(r, s, c, G);
}
function effCost0(r, s, c, G){
  const hm = hhP(r, s, G); let prop = 0, marg = 0;
  for (const id in r.ing){ if (!ING[id]) continue; const g = r.ing[id]*hm, gp = gramPrice(id); prop += g*gp;
    const size = packSize(id);
    if (size){ const have = Math.max(0, needOf(c, id)), before = have > 0 ? Math.max(1, Math.ceil(have/size - .03)) : 0, after = Math.max(1, Math.ceil((have+g)/size - .03)); marg += (after-before)*size*gp; }
    else marg += g*gp; }
  return (prop + marg)/2/hm;
}
function score(r, s, c, G){
  const pr = r.P*4/r.kcal, fr = r.F*9/r.kcal, cr = r.C*4/r.kcal;
  let sc = (Math.abs(pr-G.rp) + Math.abs(fr-G.rf) + Math.abs(cr-G.rc)) * (s === 's' ? 1 : 3);
  if (c.needR > pr) sc += (c.needR - pr) * (s === 's' ? 3 : 6);
  if (r.cu !== 'snack' && !state.cuisines.includes(r.cu)) sc += 1.6;
  const g0 = state.people[0].goal;
  if (g0 === 'health' && r.cu === 'zoh') sc -= .35;
  if (g0 === 'lose' && r.kcal > 750) sc += .3;
  if (G.F.diab){ if (whiteR(r)) sc += 1; const cb = r.C*portion(r, s, G.k0, G.ml); if (cb > 40) sc += (cb - 40)/15; }
  if (G.F.bp){ if (hasF(r,'fatty')) sc += .8; if (hasF(r,'fried')) sc += .8; }
  if (G.F.anyHealth){ if (hasF(r,'heavy')) sc += .3; if (fr > G.rf + .08) sc += (fr - G.rf)*4; }
  if (premBad(r, G)) sc += 2;
  if (G.noFrozen && frozenR(r)) sc += 1.5;
  sc += summerPen(r, G);
  sc += G.w * (effCost(r, s, c, G)/r.kcal/G.med[s] - 1);
  sc += usedOf(c, r.id)*1.15;
  for (const ex of G.exs) if (blocks(ex, r)) sc += .25; // кому-то из семьи понадобится отдельное блюдо
  if (state.cook2 && s === 'd' && keepsOf(r) >= 2) sc -= .4;
  return sc;
}
function dayOK(day, s, r){
  const hv = hasF(r,'heavy');
  for (const ss in day){ if (ss === s) continue; const o = RM[day[ss]]; if (!o) continue; if (o.id === r.id) return false; if (hv && hasF(o,'heavy')) return false; }
  return true;
}
// Ключи блюда уже есть в этом дне (без учёта самого слота s).
function dayKeyClash(day, s, r){ const K = vk(r).set; for (const ss in day){ if (ss === s) continue; const o = RM[day[ss]]; if (o && vk(o).keys.some(k => K.has(k))) return true; } return false; }
const dayProt = (day, G) => { let p = 0; for (const s in day){ const r = RM[day[s]]; if (r) p += r.P*portion(r, s, G.k0, G.ml); } return p; };
const dayFat = (day, G) => { let f = 0; for (const s in day){ const r = RM[day[s]]; if (r) f += r.F*portion(r, s, G.k0, G.ml); } return f; };
// КБЖУ дня для первого человека — тем же расчётом порций, что и в меню.
function dayMetrics(day, d, G){
  const items = []; for (const s of SLOT_ORDER){ const r = RM[day[s]]; if (r && !skipSlot(d, s)) items.push({s, r}); }
  return balanceFor(items, G.k0, G.ml, false, G.bread0, 0, G.fatMax < Infinity ? G.pt.f*1.08 : Infinity);
}
// Нарушение по белку/жирам за день для всех взрослых (до 3): белок ниже 92% цели, при диабете/давлении жиры выше нормы.
function dayViol(day, d, G){
  const items = []; for (const s of SLOT_ORDER){ const r = RM[day[s]]; if (r && !skipSlot(d, s)) items.push({s, r}); }
  let p = 0, f = 0;
  for (const a of G.adults){ const m = balanceFor(items, a.K, G.ml, false, a.bread, 0, a.fm);
    if (G.protOn) p += Math.max(0, a.tp*.92 - m.p)/a.tp; if (a.fm < Infinity) f += Math.max(0, m.f - a.tf*1.04)/a.tf*2; }
  return {v:p + f, p, f};
}
// Сначала замена, потом добавка: где мало белка (автодобор включён) или при диабете/давлении жиров больше нормы,
// меняем блюдо на более белковое / менее жирное, не нарушая разнообразия. Добавка в меню (servings) — только если замены нет.
function fixPass(plan, lo, G, fixed){
  for (let d = 0; d < 7; d++){
    for (let n = 0; n < 5; n++){
      const v0 = dayViol(plan[d], d, G);
      if (v0.v <= .001) break;
      // Жиры выше нормы при диабете/давлении важнее мелких правил разнообразия (соседние дни, тепличные овощи, курица, недельные лимиты, тот же приём в другой день).
      const low = v0.f > 0 ? (B_NEAR|B_SUMMER|B_CHICK|B_WEEK|B_SLOT) : 0;
      const sum = planSum(plan, lo, G); let best = null, bv = -.01;
      // Слоты этого дня; обед из остатков меняем через вчерашний ужин (тогда считаем оба дня).
      const spots = [];
      for (const s of G.slots){
        if (!plan[d][s] || skipSlot(d, s)) continue;
        if (s === 'l' && lo[d]){ if (d > 0 && !fixed(d-1, 'd')) spots.push([d-1, 'd']); if (!fixed(d, 'l')) spots.push([d, 'l', true]); }
        else if (!fixed(d, s)) spots.push([d, s]);
      }
      for (const [dd, s, brk] of spots){
        const day = plan[dd], cur = RM[day[s]]; if (!cur) continue;
        const loNext = s === 'd' && dd < 6 && lo[dd+1], other = dd !== d ? dd : loNext ? dd + 1 : -1;
        const vo0 = other >= 0 ? dayViol(plan[other], other, G).v : 0;
        const c = ctxFor(plan, lo, dd, s, G, sum), base = score(cur, s, c, G), m0 = brk ? 0 : vMask(cur, c, G); // остатки — не новая готовка, новое блюдо должно быть без нарушений
        const cp = cur.P/cur.kcal, cf = cur.F/cur.kcal;
        for (const r of candList(s, dd, G)){
          if (r.id === cur.id || (loNext && keepsOf(r) < 2) || !dayOK(day, s, r) || (loNext && !dayOK(plan[dd+1], 'l', r))) continue;
          if (!((v0.p > 0 && r.P/r.kcal > cp) || (v0.f > 0 && r.F/r.kcal < cf))) continue;
          const mr = vMask(r, c, G); if ((mr & ~low) > (m0 & ~low)) continue;
          day[s] = r.id; if (loNext) plan[dd+1].l = r.id;
          const dv = dayViol(plan[d], d, G).v - v0.v + (other >= 0 && other !== d ? dayViol(plan[other], other, G).v - vo0 : 0);
          day[s] = cur.id; if (loNext) plan[dd+1].l = cur.id;
          const t = dv + Math.max(0, score(r, s, c, G) - base)*.04 + (mr > m0 ? .03 : 0) + (brk ? .02 : 0);
          if (t < bv){ bv = t; best = {d:dd, s, id:r.id, loNext, brk}; }
        }
      }
      if (!best) break;
      plan[best.d][best.s] = best.id; if (best.loNext) plan[best.d+1].l = best.id; if (best.brk) lo[best.d] = false;
    }
  }
}
// Жадный подбор идёт по дням и не видит будущего: потом проходим по слотам с нарушениями и меняем блюдо
// на вариант со строго меньшей маской (так ни одно правило не ухудшается).
function repairPass(plan, lo, G, fixed){
  for (let round = 0; round < 3; round++){
    let changed = false, sum = planSum(plan, lo, G);
    for (let d = 0; d < 7; d++) for (const s of G.slots){
      const cur = RM[plan[d][s]]; if (!cur || fixed(d, s) || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
      const c = ctxFor(plan, lo, d, s, G, sum), m0 = vMask(cur, c, G); if (!m0) continue;
      const loNext = c.loNext; let best = null, bk = Infinity;
      for (const r of candList(s, d, G)){
        if (r.id === cur.id || (loNext && keepsOf(r) < 2) || !dayOK(plan[d], s, r)) continue;
        const m = vMask(r, c, G); if (m >= m0) continue;
        const k = m*100 + score(r, s, c, G); if (k < bk){ bk = k; best = r; }
      }
      if (best){ plan[d][s] = best.id; if (loNext) plan[d+1].l = best.id; changed = true; sum = planSum(plan, lo, G); }
    }
    if (!changed) break;
  }
}
// Обед из остатков вчерашнего ужина: не в день, где его основа уже есть.
function loFits(prev, day){ return dayOK(day, 'l', prev) && !dayKeyClash(day, 'l', prev); }
function generatePlan(mode, seed, cap, opt = {}){
  const G = genSetup(mode), rnd = mulberry(seed), slots = G.slots, plan = [], lo = [];
  const fixed = opt.fixed || (() => false);
  for (let d = 0; d < 7; d++){ const k = (opt.keep && opt.keep[d]) || {}, day = {}; for (const s of slots) if (k[s] && RM[k[s]]) day[s] = k[s]; plan.push(day); lo.push(false); }
  const prevWork = altWork; altWork = {plan, lo, G};
  try {
    for (let d = 0; d < 7; d++){
      const day = plan[d];
      // Остатки ставим до остальных приёмов дня, чтобы завтрак/ужин не повторили их основу.
      if (slots.includes('l') && d > 0 && state.cook2 && !state.noLo[d]){
        const prev = RM[plan[d-1].d];
        if (prev && keepsOf(prev) >= 2 && (!day.l || day.l === prev.id) && loFits(prev, day)){ day.l = prev.id; lo[d] = true; }
      }
      for (const s of slots){
        if (day[s]) continue;
        const c = ctxFor(plan, lo, d, s, G);
        let best = null, bk = Infinity;
        for (const r of candList(s, d, G)){
          if (!dayOK(day, s, r)) continue;
          const k = vMask(r, c, G)*100 + score(r, s, c, G) + rnd()*.8;
          if (k < bk){ bk = k; best = r; }
        }
        // Совсем мало вариантов: лучше повтор в тот же день, чем пустой приём пищи (но не два тяжёлых)
        if (!best) for (const r of poolFor(s, c.wk, G.F)){ if (hasF(r,'heavy') && Object.values(day).some(id => id && hasF(RM[id],'heavy'))) continue; const k = vMask(r, c, G)*100 + score(r, s, c, G); if (k < bk){ bk = k; best = r; } }
        day[s] = best ? best.id : null;
      }
    }
    repairPass(plan, lo, G, fixed);
    if (!opt.noFix) fixPass(plan, lo, G, fixed);
    let note = '';
    if (cap > 0){
      const banned = new Set();
      // Жадно снижаем стоимость: лучшая экономия на единицу потери качества,
      // не нарушая разнообразия и здоровья сильнее, чем сейчас, и без потери белка.
      let total = computeCart(plan, lo).total;
      const put = (m, id) => { plan[m.d][m.s] = id; if (m.loNext) plan[m.d+1].l = id; };
      for (let it = 0; it < 60 && total > cap; it++){
        const moves = [], sum = planSum(plan, lo, G);
        for (let d = 0; d < 7; d++){
          const p0 = dayProt(plan[d], G), pMin = Math.min(p0, G.pt.p*.95) - .5, f0 = G.fatMax < Infinity ? dayFat(plan[d], G) : 0;
          const p1 = d < 6 ? dayProt(plan[d+1], G) : 0, p1Min = Math.min(p1, G.pt.p*.95) - .5;
          for (const s of slots){
            const cur = RM[plan[d][s]]; if (!cur || fixed(d,s) || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
            const loNext = s === 'd' && d < 6 && lo[d+1], k = loNext ? 2 : 1, curProp = slotCost(cur, s, G) + 15;
            let c = null, base = 0, curCost = 0, m0 = 0;
            for (const r of candList(s, d, G)){
              if (r.id === cur.id || slotCost(r, s, G) > curProp || banned.has(d+s+r.id)) continue;
              if (loNext && keepsOf(r) < 2) continue;
              if (!dayOK(plan[d], s, r)) continue;
              if (p0 - cur.P*portion(cur,s,G.k0,G.ml) + r.P*portion(r,s,G.k0,G.ml) < pMin) continue;
              if (loNext && p1 - cur.P*portion(cur,'l',G.k0,G.ml) + r.P*portion(r,'l',G.k0,G.ml) < p1Min) continue;
              if (f0 && f0 - cur.F*portion(cur,s,G.k0,G.ml) + r.F*portion(r,s,G.k0,G.ml) > Math.max(f0, G.fatMax)) continue;
              if (!c){ c = ctxFor(plan, lo, d, s, G, sum); base = score(cur, s, c, G); curCost = effCost(cur, s, c, G)*hhP(cur, s, G)*k; m0 = vMask(cur, c, G); }
              if (vMask(r, c, G) > m0) continue;
              const est = curCost - effCost(r, s, c, G)*hhP(r, s, G)*k;
              if (est < 1) continue;
              const loss = Math.max(0, score(r, s, c, G) - base) + .4;
              moves.push({d, s, id:r.id, prev:cur.id, loNext, loss, val:est/loss});
            }
          }
        }
        if (!moves.length) break;
        moves.sort((a,b) => b.val - a.val);
        let best = null;
        for (const m of moves.slice(0, 6)){ // проверяем реальной корзиной (целые упаковки)
          put(m, m.id); const save = total - computeCart(plan, lo).total; put(m, m.prev);
          if (save < 2){ banned.add(m.d+m.s+m.id); continue; }
          const v = save / m.loss; if (!best || v > best.v) best = Object.assign(m, {v});
        }
        if (!best) continue;
        put(best, best.id); total = computeCart(plan, lo).total;
      }
      if (total > cap) note = `Уложиться в ${fmt(cap)} сом без потери белка и разнообразия не получилось. Самое экономное подходящее меню стоит ≈ ${fmt(total)} сом.`;
    }
    // Повторное использование упаковок (корзина): общий проход, если он есть.
    if (typeof packReusePass === 'function'){ try { packReusePass(plan, lo, {fixed}); } catch(e){} }
    for (let d = 0; d < 7; d++){ const o = {}; for (const s of SLOT_ORDER) if (s in plan[d]) o[s] = plan[d][s]; plan[d] = o; }
    altRecent.unshift({plan, lo, G}); if (altRecent.length > 4) altRecent.length = 4;
    return {plan, lo, note};
  } finally { altWork = prevWork; }
}
// Для общих проходов (например, корзины): можно ли поставить блюдо id в слот, не нарушив правил сильнее, чем сейчас.
function planSwapOK(plan, lo, d, s, id, G = genSetup(state.mode)){
  const r = RM[id], cur = RM[plan[d] && plan[d][s]]; if (!r || !plan[d]) return false;
  if (!slotOK(r, s, isWk(d), G.F) || !dayOK(plan[d], s, r) || (r.prep && G.noPrep[d] && (!cur || cur.id !== r.id))) return false;
  if (!cur) return true;
  const c = ctxFor(plan, lo, d, s, G);
  return vMask(r, c, G) <= vMask(cur, c, G);
}
// Нарушения правил в готовом плане (для проверок и отладки): список {d, s, id, mask}.
function planIssues(plan = state.plan, lo = state.lo, G = genSetup(state.mode)){
  const out = [], sum = planSum(plan, lo, G);
  plan.forEach((day, d) => { for (const s in day){ const r = RM[day[s]]; if (!r || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
    const m = vMask(r, ctxFor(plan, lo, d, s, G, sum), G); if (m) out.push({d, s, id:r.id, mask:m, why:maskText(m)}); } });
  return out;
}
function keepCart(){ const keep = {}; computeCart().items.forEach(x => { if (state.cart[x.id]) keep[x.id] = state.cart[x.id]; }); state.cart = keep; }
function applyRes(res, keepNote){
  state.plan = res.plan; state.lo = res.lo; if (!keepNote) state.note = res.note;
  for (const k in state.man){ const [d, s] = k.split(':'); if (!state.plan[d] || !state.plan[d][s]) delete state.man[k]; }
  keepCart(); save();
}
function regenerate(newSeed){
  if (newSeed) state.seed = Math.floor(Math.random()*1e9);
  state.man = {}; state.noLo = {}; state.noSnack = {};
  applyRes(generatePlan(state.mode, state.seed, capVal()));
  state.dirty = false; state.dirtyKinds = []; state.createdAt = Date.now(); save();
}
// Что оставить из текущего меню. Блюдо остаётся, если не нарушает правил относительно уже оставленных:
// strict (умное обновление) — никаких; иначе (мгновенная замена при новом запрете) — только «основа раз в день» и лимиты здоровья.
// Ручные замены не трогаем.
function keepFrom(pred, strict){
  const slots = slotList(), keep = state.plan.map(() => ({})), G = genSetup(state.mode), noLo = keep.map(() => false);
  const order = []; state.plan.forEach((day, d) => slots.forEach(s => order.push([d, s])));
  order.sort((a, b) => (state.man[b[0]+':'+b[1]] ? 1 : 0) - (state.man[a[0]+':'+a[1]] ? 1 : 0));
  const lim = strict ? 1 : B_DAY;
  for (const [d, s] of order){
    const id = state.plan[d][s], r = RM[id]; if (!r || (s === 'l' && state.lo[d])) continue;
    if (!pred(d, s, r)) continue;
    const man = !!state.man[d+':'+s];
    if (hasF(r,'heavy') && Object.values(keep[d]).some(x => hasF(RM[x],'heavy'))) continue;
    if (!man){
      if (!dayOK(keep[d], s, r)) continue;
      if (vMask(r, ctxFor(keep, noLo, d, s, G), G) >= lim) continue;
    }
    keep[d][s] = id;
  }
  state.plan.forEach((day, d) => { if (d > 0 && state.lo[d] && day.l && keep[d-1].d === day.l) keep[d].l = day.l; });
  return keep;
}
const countChanged = (a, b) => { let n = 0; b.forEach((day, d) => { for (const s in day) if (day[s] && day[s] !== (a[d]||{})[s]) n++; }); return n; };
function enforcePlan(){
  if (!state.plan) return 0;
  const F = filterCtx(), old = JSON.parse(JSON.stringify(state.plan));
  const keep = keepFrom((d, s, r) => safeOK(r, s, F), false);
  // При флагах здоровья можно поменять и оставшиеся блюда, чтобы жиры дня были в норме; иначе меняем только то, что не подходит.
  const res = generatePlan(state.mode, state.seed + 1, 0, {keep, fixed:(d, s) => !!state.man[d+':'+s] || (!F.anyHealth && !!(keep[d] && keep[d][s]))});
  applyRes(res, true);
  return countChanged(old, res.plan);
}
function smartUpdate(){
  const F = filterCtx(), sc = state.dirtyKinds.includes('score'), old = JSON.parse(JSON.stringify(state.plan));
  const keep = keepFrom((d, s, r) => { if (!slotOK(r, s, isWk(d), F)) return false; if (state.man[d+':'+s]) return true; if (sc) return false; return r.cu === 'snack' || state.cuisines.includes(r.cu); }, true);
  const res = generatePlan(state.mode, state.seed, capVal(), {keep, fixed:(d, s) => !!state.man[d+':'+s]});
  applyRes(res); state.dirty = false; state.dirtyKinds = []; save();
  return countChanged(old, res.plan);
}
// Варианты замены: сначала те, что не нарушают правил разнообразия/здоровья, затем по оценке.
// Блюда с основой, которая уже есть в этот день, и сверх лимитов здоровья — только если иначе вариантов меньше трёх.
function replaceOptions(d, s, G = genSetup(state.mode)){
  const plan = state.plan, cur = plan[d][s], c = ctxFor(plan, state.lo, d, s, G);
  const all = poolFor(s, c.wk, G.F).filter(r => r.id !== cur && dayOK(plan[d], s, r) && !(r.prep && G.noPrep[d]));
  const xs = all.map(r => ({r, m:vMask(r, c, G), sc:score(r, s, c, G)})).sort((a, b) => a.m - b.m || a.sc - b.sc);
  const good = xs.filter(x => x.m < B_DAY);
  return (good.length >= 3 ? good : xs).slice(0, 5).map(x => x.r);
}
const snapshot = () => JSON.parse(JSON.stringify({plan:state.plan, lo:state.lo, man:state.man, noLo:state.noLo, noSnack:state.noSnack}));
function pickReplace(d, s, id){
  const snap = snapshot(), r = RM[id]; if (!r) return;
  const plan = state.plan;
  plan[d][s] = id; state.man[d+':'+s] = 1;
  if (s === 'l' && state.lo[d]){ state.lo[d] = false; state.noLo[d] = 1; }
  if (s === 'd' && d < 6){
    if (state.lo[d+1]){
      if (state.cook2 && keepsOf(r) >= 2 && loFits(r, plan[d+1])) plan[d+1].l = id;
      else { state.lo[d+1] = false; const opts = replaceOptions(d+1, 'l'); plan[d+1].l = opts[0] ? opts[0].id : null; }
    } else if (state.cook2 && keepsOf(r) >= 2 && 'l' in plan[d+1] && !state.man[(d+1)+':l'] && !state.noLo[d+1] && loFits(r, plan[d+1])){
      plan[d+1].l = id; state.lo[d+1] = true;
    }
  }
  keepCart(); save();
  ui.undo = () => { Object.assign(state, snap); keepCart(); save(); };
  return snap;
}
// Совместимость со старым API и тестами: быстрая замена лучшим вариантом
function swapMeal(d, s){ const o = replaceOptions(d, s); if (o[0]) pickReplace(d, s, o[0].id); return o[0]; }
