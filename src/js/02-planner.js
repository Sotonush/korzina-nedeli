// Фильтры и подбор меню. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
/* ===================== Фильтры ===================== */
const typeFit = (r, s) => { const t = r.types; return s==='b' ? t.includes('b') : s==='s' ? t.includes('s') : s==='l' ? t.includes('m') : (t.includes('m')||t.includes('d')); };
function customWords(){ return String(state.customEx||'').toLowerCase().split(/[,;\n]+/).map(s=>s.trim()).filter(s=>s.length>=3).map(s=>s.slice(0, Math.max(3, s.length-2))); }
let fcache = {key:'', F:null};
function resetCaches(){ fcache = {key:'', F:null}; pc = {sd:undefined}; estCache.key = ''; wkCache.start = null; balCache = new Map(); tipCache.key = ''; summerIds.v = null; }
function filterCtx(){
  const key = JSON.stringify([state.allergies,state.diet,state.dislikes,state.customEx,state.health,state.quick,state.learner,state.start,state.cuisines]);
  if (fcache.key === key && fcache.F) return fcache.F;
  const tags = new Set(); state.allergies.forEach(a => (ALLERGY_TAGS[a]||[a]).forEach(t => tags.add(t)));
  const ex = new Set(); state.dislikes.forEach(k => (DISLIKES[k] ? DISLIKES[k].ids : []).forEach(id => ex.add(id)));
  const F = {key, tags, ex, words:customWords(), diab:!!state.health.diab, bp:!!state.health.bp, pools:{}, alt:{}, base:{}, bread:{}};
  F.anyHealth = F.diab || F.bp;
  fcache = {key, F}; return F;
}
function ingOK(id, F){
  const i = ING[id]; if (!i) return false; const t = i.t || [];
  if (t.some(x => F.tags.has(x))) return false;
  if (state.diet === 'veg' && (t.includes('meat') || t.includes('fish'))) return false;
  if (state.diet === 'pesc' && t.includes('meat')) return false;
  if (F.ex.has(id)) return false;
  const nm = i.n.toLowerCase(); if (F.words.some(w => nm.includes(w))) return false;
  return true;
}
function baseOK(r, F){
  if (r.id in F.base) return F.base[r.id];
  let ok = true;
  for (const id in r.ing) if (!ingOK(id, F)){ ok = false; break; }
  if (ok){ const rn = r.n.toLowerCase(); if (F.words.some(w => rn.includes(w))) ok = false; }
  if (ok && F.diab && (hasF(r,'sweet') || honeyCentred(r))) ok = false;
  if (ok && F.bp && hasF(r,'salty')) ok = false;
  return F.base[r.id] = ok;
}
let wkCache = {start:null, arr:[]};
function isWk(d){ if (wkCache.start !== state.start){ const s = parseIso(state.start); wkCache = {start:state.start, arr:[0,1,2,3,4,5,6].map(i => dowOf(addDays(s,i)) >= 5)}; } return !!wkCache.arr[d]; }
const quickOn = wk => state.quick === 'always' || (state.quick === 'weekdays' && !wk);
function slotOK(r, s, wk, F){
  if (!typeFit(r,s) || !baseOK(r,F)) return false;
  if (quickOn(wk) && r.time > QUICK_LIM[s]) return false;
  if (state.learner && !wk && diffOf(r) === 'hard') return false;
  if (F.anyHealth && s === 'd' && heavyDinner(r)) return false;
  return true;
}
// Только «безопасные» правила: аллергии, диета, нелюбимое, здоровье. Применяются сразу.
const safeOK = (r, s, F) => baseOK(r, F) && !(F.anyHealth && s === 'd' && heavyDinner(r));
function poolFor(s, wk, F = filterCtx()){ const k = s + (wk ? 1 : 0); return F.pools[k] || (F.pools[k] = RECIPES.filter(r => slotOK(r, s, wk, F))); }
const pool = s => poolFor(s, false);
function allowedCount(){ const F = filterCtx(); return RECIPES.filter(r => baseOK(r, F)).length; }
function personEx(p){ const ex = new Set(); (p.dislikes||[]).forEach(k => (DISLIKES[k] ? DISLIKES[k].ids : []).forEach(id => ex.add(id))); return ex; }
const blocks = (ex, r) => { for (const id in r.ing) if (ex.has(id)) return true; return false; };
const cpk = r => servingCost(r) / r.kcal;
function medianCpk(list){ const a = list.map(cpk).sort((x,y)=>x-y); return a.length ? a[a.length>>1] : 1; }
function altFor(r, s, d, i, F){
  const p = state.people[i]; if (!p || !(p.dislikes||[]).length) return null;
  const ex = personEx(p); if (!blocks(ex, r)) return null;
  const wk = isWk(d), key = r.id + '|' + s + '|' + (wk?1:0) + '|' + [...ex].join(',');
  if (key in F.alt) return F.alt[key];
  let best = null, bs = Infinity; const base = cpk(r) || 1;
  for (const c of poolFor(s, wk, F)){
    if (c.id === r.id || blocks(ex, c)) continue;
    const sc = Math.abs(Math.log(c.kcal/r.kcal)) + Math.abs(c.P/c.kcal - r.P/r.kcal)*12 + (c.cu === r.cu ? 0 : .3) + .3*cpk(c)/base;
    if (sc < bs){ bs = sc; best = c; }
  }
  return F.alt[key] = best;
}

/* ===================== Подбор меню ===================== */
const skipSlot = (d, s) => s === 's' && !!(state.noSnack && state.noSnack[d]);
function premOf(r){ if (r._pm) return r._pm; const ids = Object.keys(r.ing), out = []; for (const k in PREMIUM) if (ids.some(id => PREMIUM[k].re.test(id))) out.push(k); return r._pm = out; }
const premBad = (r, G) => !!G.eco && premOf(r).some(k => !G.keepP.has(k));
function summerPen(r, G){ if (!G.winter) return 0; let g = 0; for (const id in r.ing) if (G.summer.has(id)) g += r.ing[id]; return g ? .25 + Math.min(1, g/200)*.75 : 0; }
function genSetup(mode){
  const F = filterCtx(), pt = targets(state.people[0]), slots = slotList(), ml = slots.length, E = eaters();
  const G = {F, mode, pt, k0:pt.k, rp:pt.p*4/pt.k, rf:pt.f*9/pt.k, rc:pt.c*4/pt.k, ml, slots, E:E.map(personKcal), C:E.map(p => !isAdult(p)), med:{}, maxUse:{}, w:(MODES[mode]||MODES.opt).w, hh:{}, sc:{},
    lim:{}, kayLim:F.anyHealth ? 1 : 99, baseMax:3, fruitMax:3, winter:isWinter(), summer:summerIds(), eco:mode === 'eco', keepP:new Set(state.ecoKeep||[]),
    bread0:breadFor(0, F, 'home'), fatMax:F.anyHealth ? pt.f*1.1 : Infinity, protOn:autoProtOn()};
  if (F.diab) G.lim.whiteflour = 2;
  if (F.bp){ G.lim.fatty = 1; G.lim.salty = 0; }
  for (const s of slots){ const pl = poolFor(s, false, F); G.med[s] = medianCpk(pl) || 1; const n = Math.max(1, pl.length); G.maxUse[s] = n >= 4 ? 2 : Math.ceil(7/n); }
  return G;
}
function hhP(r, s, G){ const k = r.id + s; if (k in G.hh) return G.hh[k]; let a = 0; G.E.forEach((kc, i) => { a += portion(r, s, kc, G.ml, G.C[i]); }); return G.hh[k] = a; }
function slotCost(r, s, G){ const k = r.id + s; if (k in G.sc) return G.sc[k]; return G.sc[k] = servingCost(r)*hhP(r, s, G); }
// Сводка по всему плану (сколько раз блюдо/основа/фрукт/флаг, сколько граммов продукта), один раз на шаг.
// Остатки (обед из вчерашнего ужина) в счётчиках разнообразия не учитываются.
function planSum(plan, lo, G){
  const used = {}, need = {}, dayP = [], bases = {}, fruits = {}, flags = {}; let kay = 0;
  for (let dd = 0; dd < 7; dd++){ const day = plan[dd]; dayP.push(0); if (!day) continue;
    for (const ss in day){ const r = RM[day[ss]]; if (!r || skipSlot(dd, ss)) continue;
      if (!(ss === 'l' && lo[dd])){
        used[r.id] = (used[r.id]||0) + 1; const b = baseOf(r); bases[b] = (bases[b]||0) + 1;
        for (const f of fruitIds(r)) fruits[f] = (fruits[f]||0) + 1;
        for (const f of flagsOf(r)) flags[f] = (flags[f]||0) + 1;
        if (kaymakStyle(r)) kay++;
      }
      const hm = hhP(r, ss, G); for (const id in r.ing) need[id] = (need[id]||0) + r.ing[id]*hm;
      dayP[dd] += r.P*portion(r, ss, G.k0, G.ml);
    } }
  return {used, need, dayP, bases, fruits, flags, kay};
}
// Контекст слота = сводка минус само блюдо в этом слоте.
function ctxFor(plan, lo, d, s, G, sum = planSum(plan, lo, G)){
  const cur = RM[plan[d] && plan[d][s]], minus = {}; let dayP = sum.dayP[d], rem = shareOf(s, G.ml), minusId = null, curC = null;
  if (cur && !skipSlot(d, s)){ const hm = hhP(cur, s, G); for (const id in cur.ing) minus[id] = cur.ing[id]*hm; dayP -= cur.P*portion(cur, s, G.k0, G.ml); if (!(s === 'l' && lo[d])){ minusId = cur.id; curC = cur; } }
  for (const ss of G.slots) if (ss !== s && !(plan[d] && plan[d][ss])) rem += shareOf(ss, G.ml);
  return {d, s, used:sum.used, need:sum.need, sum, cur:curC, minus, minusId, needR: Math.max(0, G.pt.p - dayP)*4/(G.k0*rem), wk:isWk(d), plan, lo};
}
const usedOf = (c, id) => (c.used[id]||0) - (c.minusId === id ? 1 : 0);
const needOf = (c, id) => (c.need[id]||0) - (c.minus[id]||0);
// Разнообразие и лимиты здоровья. lvl 0 — всё, 1 — без недельных лимитов основы/фруктов, 2 — без ограничений.
function limitsOK(r, c, G, lvl){
  if (lvl >= 2) return true;
  const cur = c.cur, b = baseOf(r), day = c.plan[c.d] || {}, S = c.sum;
  for (const ss in day){ if (ss === c.s || (ss === 'l' && c.lo[c.d]) || skipSlot(c.d, ss)) continue; const o = RM[day[ss]]; if (o && baseOf(o) === b) return false; }
  for (const f in G.lim) if (hasF(r, f) && (S.flags[f]||0) - (cur && hasF(cur, f) ? 1 : 0) >= G.lim[f]) return false;
  if (kaymakStyle(r) && S.kay - (cur && kaymakStyle(cur) ? 1 : 0) >= G.kayLim) return false;
  if (lvl === 0){
    if ((S.bases[b]||0) - (cur && baseOf(cur) === b ? 1 : 0) >= G.baseMax) return false;
    for (const f of fruitIds(r)) if ((S.fruits[f]||0) - (cur && cur.ing[f] ? 1 : 0) >= G.fruitMax) return false;
  }
  return true;
}
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
  if (G.F.diab && hasF(r,'whiteflour')) sc += 1;
  if (G.F.bp){ if (hasF(r,'fatty')) sc += .8; if (hasF(r,'fried')) sc += .8; }
  if (G.F.anyHealth){ if (hasF(r,'heavy')) sc += .3; if (fr > G.rf + .08) sc += (fr - G.rf)*4; }
  if (premBad(r, G)) sc += 2;
  sc += summerPen(r, G);
  sc += G.w * (effCost(r, s, c, G)/r.kcal/G.med[s] - 1);
  sc += usedOf(c, r.id)*1.15;
  if (state.cook2 && s === 'd' && keepsOf(r) >= 2) sc -= .4;
  return sc;
}
function nearUse(id, c){ for (const dd of [c.d-1, c.d+1]){ const day = c.plan[dd]; if (!day) continue; for (const ss in day) if (day[ss] === id && !(ss === 'l' && c.lo[dd])) return true; } return false; }
const varietyOK = (r, c, G) => usedOf(c, r.id) < (G.maxUse[c.s]||2) && !nearUse(r.id, c);
function dayOK(day, s, r){
  const hv = hasF(r,'heavy');
  for (const ss in day){ if (ss === s) continue; const o = RM[day[ss]]; if (!o) continue; if (o.id === r.id) return false; if (hv && hasF(o,'heavy')) return false; }
  return true;
}
const dayProt = (day, G) => { let p = 0; for (const s in day){ const r = RM[day[s]]; if (r) p += r.P*portion(r, s, G.k0, G.ml); } return p; };
const dayFat = (day, G) => { let f = 0; for (const s in day){ const r = RM[day[s]]; if (r) f += r.F*portion(r, s, G.k0, G.ml); } return f; };
// КБЖУ дня для первого человека — тем же расчётом порций, что и в меню.
function dayMetrics(day, d, G){
  const items = []; for (const s of SLOT_ORDER){ const r = RM[day[s]]; if (r && !skipSlot(d, s)) items.push({s, r}); }
  return balanceFor(items, G.k0, G.ml, false, G.bread0, 0, G.fatMax < Infinity ? G.pt.f*1.08 : Infinity);
}
// После подбора: где мало белка (и автодобор включён) или при диабете/давлении жиров больше нормы +10%,
// сначала меняем блюдо на более белковое / менее жирное. Добавки в меню — только если это не помогло.
function fixPass(plan, lo, G, fixed){
  const tp = G.pt.p, tf = G.pt.f || 1;
  const viol = m => (G.protOn ? Math.max(0, tp*.92 - m.p)/tp : 0) + (G.fatMax < Infinity ? Math.max(0, m.f - tf*1.04)/tf*2 : 0);
  for (let d = 0; d < 7; d++){
    for (let n = 0; n < 3; n++){
      const day = plan[d], v0 = viol(dayMetrics(day, d, G));
      if (v0 <= .001) break;
      const sum = planSum(plan, lo, G); let best = null, bv = v0 - .01;
      for (const s of G.slots){
        const cur = RM[day[s]]; if (!cur || fixed(d, s) || (s === 'l' && lo[d]) || skipSlot(d, s)) continue;
        const loNext = s === 'd' && d < 6 && lo[d+1], c = ctxFor(plan, lo, d, s, G, sum), base = score(cur, s, c, G);
        for (const r of poolFor(s, c.wk, G.F)){
          if (r.id === cur.id || (loNext && keepsOf(r) < 2) || !dayOK(day, s, r) || premBad(r, G) || !varietyOK(r, c, G) || !limitsOK(r, c, G, 0)) continue;
          day[s] = r.id; const v = viol(dayMetrics(day, d, G)); day[s] = cur.id;
          const t = v + Math.max(0, score(r, s, c, G) - base)*.04;
          if (t < bv){ bv = t; best = {s, id:r.id, loNext}; }
        }
      }
      if (!best) break;
      day[best.s] = best.id; if (best.loNext) plan[d+1].l = best.id;
    }
  }
}
function generatePlan(mode, seed, cap, opt = {}){
  const G = genSetup(mode), rnd = mulberry(seed), slots = G.slots, plan = [], lo = [];
  const fixed = opt.fixed || (() => false);
  for (let d = 0; d < 7; d++){ const k = (opt.keep && opt.keep[d]) || {}, day = {}; for (const s of slots) if (k[s] && RM[k[s]]) day[s] = k[s]; plan.push(day); lo.push(false); }
  for (let d = 0; d < 7; d++){
    for (const s of slots){
      const day = plan[d];
      if (s === 'l'){
        lo[d] = false;
        if (d > 0 && state.cook2 && !state.noLo[d]){
          const prev = RM[plan[d-1].d];
          if (prev && keepsOf(prev) >= 2 && (!day.l || day.l === prev.id) && dayOK(day, 'l', prev)){ day.l = prev.id; lo[d] = true; continue; }
        }
      }
      if (day[s]) continue;
      const c = ctxFor(plan, lo, d, s, G), all = poolFor(s, c.wk, G.F);
      let cands = all.filter(r => dayOK(day, s, r) && !premBad(r, G));
      if (cands.length < 3) cands = all.filter(r => dayOK(day, s, r));
      let best = null, bs = Infinity;
      for (const pass of [0,1,2]){ for (const r of cands){ if (pass < 2 && !limitsOK(r, c, G, pass)) continue; if (pass === 0 && !varietyOK(r, c, G)) continue; const sc = score(r, s, c, G) + rnd()*.8; if (sc < bs){ bs = sc; best = r; } } if (best) break; }
      // Совсем мало вариантов: лучше повтор в тот же день, чем пустой приём пищи (но не два тяжёлых)
      if (!best) for (const r of all){ if (hasF(r,'heavy') && Object.values(day).some(id => id && hasF(RM[id],'heavy'))) continue; const sc = score(r, s, c, G); if (sc < bs){ bs = sc; best = r; } }
      day[s] = best ? best.id : null;
    }
  }
  if (!opt.noFix) fixPass(plan, lo, G, fixed);
  let note = '';
  if (cap > 0){
    const banned = new Set();
    // Жадно снижаем стоимость: лучшая экономия на единицу потери качества,
    // без повторов в соседние дни, с лимитами разнообразия и здоровья и без потери белка.
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
          let c = null, base = 0, curCost = 0;
          for (const r of poolFor(s, isWk(d), G.F)){
            if (r.id === cur.id || slotCost(r, s, G) > curProp || banned.has(d+s+r.id) || premBad(r, G)) continue;
            if (loNext && keepsOf(r) < 2) continue;
            if (!dayOK(plan[d], s, r)) continue;
            if (p0 - cur.P*portion(cur,s,G.k0,G.ml) + r.P*portion(r,s,G.k0,G.ml) < pMin) continue;
            if (loNext && p1 - cur.P*portion(cur,'l',G.k0,G.ml) + r.P*portion(r,'l',G.k0,G.ml) < p1Min) continue;
            if (f0 && f0 - cur.F*portion(cur,s,G.k0,G.ml) + r.F*portion(r,s,G.k0,G.ml) > Math.max(f0, G.fatMax)) continue;
            if (!c){ c = ctxFor(plan, lo, d, s, G, sum); base = score(cur, s, c, G); curCost = effCost(cur, s, c, G)*hhP(cur, s, G)*k; }
            if (!varietyOK(r, c, G) || !limitsOK(r, c, G, 0)) continue;
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
  return {plan, lo, note};
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
// Что оставить из текущего меню. strict — ещё и недельные лимиты основы/фруктов (умное обновление).
// Лимиты здоровья (белая мука, жирное, лепёшка с каймаком) и «одна основа в день» действуют всегда; ручные замены не трогаем.
function keepFrom(pred, strict){
  const slots = slotList(), keep = state.plan.map(() => ({})), G = genSetup(state.mode);
  const bases = {}, fruits = {}, flags = {}, heavyDay = [], dayBase = state.plan.map(() => new Set()); let kay = 0;
  const order = []; state.plan.forEach((day, d) => slots.forEach(s => order.push([d, s])));
  order.sort((a, b) => (state.man[b[0]+':'+b[1]] ? 1 : 0) - (state.man[a[0]+':'+a[1]] ? 1 : 0));
  for (const [d, s] of order){
    const id = state.plan[d][s], r = RM[id]; if (!r || (s === 'l' && state.lo[d])) continue;
    if (!pred(d, s, r)) continue;
    const man = !!state.man[d+':'+s], b = baseOf(r);
    if (hasF(r,'heavy') && heavyDay[d]) continue;
    if (!man){
      if (dayBase[d].has(b)) continue;
      if (Object.keys(G.lim).some(f => hasF(r, f) && (flags[f]||0) >= G.lim[f])) continue;
      if (kaymakStyle(r) && kay >= G.kayLim) continue;
      if (strict && ((bases[b]||0) >= G.baseMax || fruitIds(r).some(f => (fruits[f]||0) >= G.fruitMax))) continue;
    }
    keep[d][s] = id; dayBase[d].add(b); bases[b] = (bases[b]||0) + 1; if (hasF(r,'heavy')) heavyDay[d] = true;
    fruitIds(r).forEach(f => { fruits[f] = (fruits[f]||0) + 1; }); flagsOf(r).forEach(f => { flags[f] = (flags[f]||0) + 1; }); if (kaymakStyle(r)) kay++;
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
function replaceOptions(d, s, G = genSetup(state.mode)){
  const plan = state.plan, cur = plan[d][s], c = ctxFor(plan, state.lo, d, s, G), all = poolFor(s, c.wk, G.F).filter(r => r.id !== cur && dayOK(plan[d], s, r));
  let list = all.filter(r => limitsOK(r, c, G, 1));
  if (list.length < 2) list = all;
  return list.map(r => ({r, sc: score(r, s, c, G) + (varietyOK(r, c, G) && limitsOK(r, c, G, 0) ? 0 : 3)})).sort((a,b) => a.sc - b.sc).slice(0,5).map(x => x.r);
}
const snapshot = () => JSON.parse(JSON.stringify({plan:state.plan, lo:state.lo, man:state.man, noLo:state.noLo, noSnack:state.noSnack}));
function pickReplace(d, s, id){
  const snap = snapshot(), r = RM[id]; if (!r) return;
  const plan = state.plan;
  plan[d][s] = id; state.man[d+':'+s] = 1;
  if (s === 'l' && state.lo[d]){ state.lo[d] = false; state.noLo[d] = 1; }
  if (s === 'd' && d < 6){
    if (state.lo[d+1]){
      if (state.cook2 && keepsOf(r) >= 2 && dayOK(plan[d+1], 'l', r)) plan[d+1].l = id;
      else { state.lo[d+1] = false; const opts = replaceOptions(d+1, 'l'); plan[d+1].l = opts[0] ? opts[0].id : null; }
    } else if (state.cook2 && keepsOf(r) >= 2 && 'l' in plan[d+1] && !state.man[(d+1)+':l'] && !state.noLo[d+1] && dayOK(plan[d+1], 'l', r)){
      plan[d+1].l = id; state.lo[d+1] = true;
    }
  }
  keepCart(); save();
  ui.undo = () => { Object.assign(state, snap); keepCart(); save(); };
  return snap;
}
// Совместимость со старым API и тестами: быстрая замена лучшим вариантом
function swapMeal(d, s){ const o = replaceOptions(d, s); if (o[0]) pickReplace(d, s, o[0].id); return o[0]; }
