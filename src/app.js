'use strict';
/* ===================== Справочники ===================== */
const CATS = {meat:'Мясо и рыба',dairy:'Молочное и яйца',grain:'Крупы, макароны, бобовые',bread:'Хлеб и выпечка',veg:'Овощи и зелень',fruit:'Фрукты, ягоды, орехи',pantry:'Бакалея и соусы'};
const CAT_ORDER = ['veg','fruit','meat','dairy','grain','bread','pantry'];
const SLOT_NAME = {b:'Завтрак',l:'Обед',d:'Ужин',s:'Перекус'};
const SLOT_ORDER = ['b','l','d','s'];
const SHARE = {3:{b:.3,l:.4,d:.3},4:{b:.25,l:.35,d:.3,s:.1}};
const DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const GOALS = {
  lose:{n:'Похудеть',d:'Мягкий дефицит ~20% калорий',k:.8,macro:'balanced',pk:1.6},
  keep:{n:'Держать вес',d:'Калории ровно по расходу',k:1,macro:'balanced',pk:1.2},
  gain:{n:'Набрать массу',d:'Профицит ~12% и больше белка',k:1.12,macro:'mass',pk:1.8},
  health:{n:'Питаться здоровее',d:'Больше ПП-блюд, без перекосов',k:1,macro:'balanced',pk:1.2}
};
// Белок считается от веса (г на кг), пресеты задают долю жиров, углеводы — остаток.
const MACROS = {
  balanced:{n:'Сбалансированно',f:30},
  protein:{n:'Меньше жиров',f:25},
  lowcarb:{n:'Меньше углеводов',f:40},
  mass:{n:'Больше углеводов',f:22}
};
const ACTS = [[1.2,'Почти не двигаюсь','Сидячая работа, хожу мало'],[1.375,'Лёгкая: 1–3 трен. в нед.','Гуляю, тренируюсь 1–3 раза в неделю'],[1.55,'Средняя: 3–5 трен. в нед.','Тренируюсь 3–5 раз в неделю или много хожу'],[1.725,'Высокая: каждый день','Тренировки каждый день или физическая работа']];
const STORES = {avg:'Средние цены по Бишкеку'};
const STORE_RENAME = {frunze:'asia'};
const MODES = {
  eco:{n:'Эконом',d:'Выгодные блюда: крупы, курица, бобовые',w:2.4},
  opt:{n:'Оптимально',d:'Баланс цены, вкуса и разнообразия',w:.8},
  comfort:{n:'Комфорт',d:'Максимум разнообразия, цена вторична',w:.1}
};
const CUIS = {kg:'Кыргызская и восточная',home:'Домашняя',eu:'Европейская',asia:'Азиатская',zoh:'ПП и фитнес'};
const ALLERGY = {dairy:'Молочное',gluten:'Глютен',egg:'Яйца',fish:'Рыба',nuts:'Орехи и арахис',honey:'Мёд',soy:'Соя',legume:'Бобовые',citrus:'Цитрусовые',mushroom:'Грибы'};
const ALLERGY_TAGS = {nuts:['nuts','peanut']};
const DISLIKES = {
  mutton:{n:'Баранина',ids:['mutton']},beef:{n:'Говядина',ids:['beef','mince']},chicken:{n:'Курица',ids:['chicken_breast','chicken_thigh','chicken_leg']},
  liver:{n:'Печень',ids:['liver']},fish:{n:'Рыба',ids:['fish','tuna']},mushrooms:{n:'Грибы',ids:['mushrooms']},cabbage:{n:'Капуста',ids:['cabbage']},
  pumpkin:{n:'Тыква',ids:['pumpkin']},zucchini:{n:'Кабачки',ids:['zucchini']},tvorog:{n:'Творог',ids:['tvorog']},
  buckwheat:{n:'Гречка',ids:['buckwheat']},oats:{n:'Овсянка',ids:['oats']},legumes:{n:'Чечевица и нут',ids:['lentils','chickpeas','beans']},
  kefir:{n:'Кефир и айран',ids:['kefir','ayran']},pepper:{n:'Болгарский перец',ids:['pepper']},onion:{n:'Лук (заметный)',ids:['onion']}
};
const DIFF = {easy:'Легко',medium:'Средне',hard:'Сложно'};
const QUICK_LIM = {b:20,l:35,d:35,s:15};
const ADDONS = [
  {id:'tvorog',g:150,t:'+150 г творога'},
  {id:'eggs',g:110,t:'+2 яйца'},
  {id:'kefir',g:250,t:'+250 мл кефира'},
  {id:'ayran',g:250,t:'+250 мл айрана'},
  {id:'yogurt',g:200,t:'+200 г натурального йогурта'},
  {id:'chicken_breast',g:100,t:'+100 г отварного куриного филе'},
  {id:'tuna',g:100,t:'+100 г тунца'},
  {id:'cheese',g:30,t:'+30 г сыра'}
];

/* ===================== Утилиты ===================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const fmt1 = n => (Math.round(n*10)/10).toLocaleString('ru-RU');
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2,9);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function plural(n, one, few, many){n=Math.abs(Math.round(n));const m10=n%10,m100=n%100; if(m10===1&&m100!==11)return one; if(m10>=2&&m10<=4&&(m100<10||m100>=20))return few; return many;}
const pad = n => String(n).padStart(2,'0');
const isoOf = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
const parseIso = s => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s||'')); return m ? new Date(+m[1], +m[2]-1, +m[3]) : new Date(); };
const todayIso = () => isoOf(new Date());
const addDays = (dt, n) => { const x = new Date(dt.getTime()); x.setDate(x.getDate()+n); return x; };
const dowOf = dt => (dt.getDay()+6)%7;
const dayMonth = dt => `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
const isMl = id => !!(ING[id] && ING[id].unit === 'ml');
function qty(id, g){ g = Math.max(0, g); if (isMl(id)) return g >= 1000 ? fmt1(g/1000)+' л' : fmt(g)+' мл'; return g >= 1000 ? fmt1(g/1000)+' кг' : fmt(g)+' г'; }
const portionsWord = x => Math.abs(x - Math.round(x)) > .01 ? 'порции' : plural(x,'порция','порции','порций');
const safeUrl = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : '';

/* ===================== Рецепты ===================== */
const RM = {};
RECIPES.forEach(r => {
  let k=0,p=0,f=0,c=0,raw=0;
  for (const id in r.ing) { raw += r.ing[id]; const i = ING[id]; if(!i) continue; const g=r.ing[id]/100; k+=i.k*g; p+=i.p*g; f+=i.f*g; c+=i.c*g; }
  Object.assign(r,{kcal:k||1,P:p,F:f,C:c,raw}); RM[r.id]=r;
});
const diffOf = r => DIFF[r.diff] ? r.diff : 'medium';
const yieldOf = r => r.yield > 0 ? r.yield : r.raw;
const keepsOf = r => typeof r.keeps === 'number' ? r.keeps : 1;
const flagsOf = r => Array.isArray(r.flags) ? r.flags : [];
const hasF = (r, f) => flagsOf(r).includes(f);
const honeyCentred = r => (r.ing.honey||0) >= 15 || (ING.honey ? (r.ing.honey||0)*ING.honey.k/100/r.kcal > .1 : false);
const plateG = (r, m) => Math.round(yieldOf(r)*m/10)*10;

/* ===================== Цены магазинов ===================== */
function buildSD(date, info, items){
  try {
    if (!info || !items || typeof info !== 'object' || typeof items !== 'object') return null;
    const keys = Object.keys(info).filter(k => info[k] && items[k] && typeof items[k] === 'object' && Object.keys(items[k]).length);
    if (!keys.length) return null;
    return {keys, items, info, date: typeof date === 'string' ? date : ''};
  } catch(e){ return null; }
}
let SD = buildSD(typeof PRICES_DATE !== 'undefined' ? PRICES_DATE : '', typeof STORE_INFO !== 'undefined' ? STORE_INFO : null, typeof STORE_ITEMS !== 'undefined' ? STORE_ITEMS : null);
// Без данных о ценах показываем только один вариант: средние цены, без выдуманных магазинов.
const storeList = () => SD ? SD.keys.map(k => [k, SD.info[k].n || k]) : Object.entries(STORES);
const storeName = k => SD ? (SD.info[k] ? SD.info[k].n || k : k) : (STORES[k] || k);

/* ===================== Состояние ===================== */
const LS = 'korzina-nedeli-v1';
function newPerson(kind, extra){ return Object.assign(kind === 'child' ? {id:uid(),kind:'child',name:'',sex:'m',age:8,dislikes:[]} : {id:uid(),kind:'adult',name:'',sex:'f',age:30,height:165,weight:65,act:1.375,goal:'keep',target:'',dislikes:[]}, extra||{}); }
function defaults(){
  return {v:2,onboarded:false,step:0,goalSeen:false,tab:'menu',day:0,start:todayIso(),
    people:[newPerson('adult',{weight:70,goal:'lose'})],
    family:false,macro:'balanced',mp:35,mf:30,macroTouched:false,
    cuisines:['kg','home','eu','asia','zoh'],diet:'all',meals:4,quick:'off',learner:false,cook2:false,autoProt:null,
    health:{diab:false,bp:false},dislikes:[],allergies:[],customEx:'',
    store:storeList()[0][0],split:false,stores2:[],adj:0,mode:'opt',cap:'',prices:{},
    seed:20261120,plan:null,lo:[],man:{},noLo:{},note:'',cart:{},dirty:false,dirtyKinds:[],createdAt:null,
    big:false,openSec:'about',wlog:[]};
}
function migrate(s){
  const st = Object.assign(defaults(), s);
  if (typeof st.quick === 'boolean') st.quick = st.quick ? 'always' : 'off';
  if (!['off','always','weekdays'].includes(st.quick)) st.quick = 'off';
  st.allergies = [...new Set((Array.isArray(st.allergies)?st.allergies:[]).map(a => a === 'peanut' ? 'nuts' : a))].filter(a => ALLERGY[a]);
  st.dislikes = (Array.isArray(st.dislikes)?st.dislikes:[]).filter(k => DISLIKES[k]);
  if (!Array.isArray(st.people) || !st.people.length) st.people = defaults().people;
  st.people = st.people.map(p => { const q = Object.assign({id:uid(),kind:'adult',name:'',sex:'f',age:30,dislikes:[]}, p); if (!Array.isArray(q.dislikes)) q.dislikes = []; if (q.kind === 'adult' && q.target == null) q.target = ''; if (!q.sex) q.sex = 'm'; return q; });
  st.health = Object.assign({diab:false,bp:false}, st.health && typeof st.health === 'object' ? st.health : {});
  if (!MACROS[st.macro] && st.macro !== 'custom') st.macro = 'balanced';
  ['lo','wlog','stores2','dirtyKinds','cuisines'].forEach(k => { if (!Array.isArray(st[k])) st[k] = k === 'cuisines' ? Object.keys(CUIS) : []; });
  ['man','noLo','cart','prices'].forEach(k => { if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {}; });
  if (st.dirty && !st.dirtyKinds.length) st.dirtyKinds = ['score'];
  if (!/^\d{4}-\d\d-\d\d$/.test(String(st.start||''))){
    if (s.plan){ const base = new Date(s.createdAt || Date.now()); st.start = isoOf(addDays(base, -dowOf(base))); }
    else st.start = todayIso();
  }
  if (st.plan && (!Array.isArray(st.plan) || st.plan.length !== 7 || st.plan.some(d => !d || typeof d !== 'object'))) st.plan = null;
  if (s.v === 1 && s.onboarded) st.goalSeen = true;
  if (!['menu','cart','progress','profile'].includes(st.tab)) st.tab = 'menu';
  st.day = clamp(+st.day||0, 0, 6);
  // Выбор магазина не теряем, даже если цены ещё не загружены: проверяется при расчёте (activeStores).
  st.store = STORE_RENAME[st.store] || st.store || storeList()[0][0];
  st.stores2 = [...new Set(st.stores2.map(k => STORE_RENAME[k] || k))].slice(0,2);
  st.v = 2;
  return st;
}
let state;
try { const s = JSON.parse(localStorage.getItem(LS)); state = s && (s.v === 1 || s.v === 2) ? migrate(s) : defaults(); } catch(e){ state = defaults(); }
const ui = {sheet:null, replace:null, confirm:null, editing:null, shareText:null, open:{}, pdis:{}, undo:null};
function save(){ try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e){} }
let pricesVer = 0;

/* ===================== Нормы ===================== */
const eaters = () => state.family ? state.people : [state.people[0]];
const isAdult = p => p.kind !== 'child';
function childKcal(p){ const a = +p.age||8; return clamp(1000 + 100*a + (p.sex === 'm' && a >= 10 ? 150 : 0), 1000, 2500); }
function bmrAct(p){ const w=+p.weight||70, h=+p.height||170, a=+p.age||30; return (10*w + 6.25*h - 5*a + (p.sex === 'm' ? 5 : -161)) * (+p.act||1.375); }
function maintKcal(p){ if (!isAdult(p)) return childKcal(p); return Math.round(Math.max(p.sex==='m'?1500:1200, bmrAct(p))/10)*10; }
function personKcal(p){ if (!isAdult(p)) return childKcal(p); return Math.round(Math.max(p.sex==='m'?1500:1200, bmrAct(p)*(GOALS[p.goal]||GOALS.keep).k)/10)*10; }
const fatPct = () => state.macro === 'custom' ? clamp(+state.mf||30, 15, 45) : (MACROS[state.macro]||MACROS.balanced).f;
const protPerKg = p => (GOALS[p.goal]||GOALS.keep).pk;
function targets(p){
  const k = personKcal(p);
  if (!isAdult(p)){ const P = k*.15/4, f = k*.3/9; return {k, p:P, f, c:(k-P*4-f*9)/4}; }
  const P = Math.min(protPerKg(p)*(+p.weight||70), k*.4/4), f = k*fatPct()/100/9;
  return {k, p:P, f, c:Math.max(0, (k - P*4 - f*9)/4)};
}
function macroPct(p = state.people[0]){ const t = targets(p), P = Math.round(t.p*4/t.k*100), f = fatPct(); return {p:P, f, c:Math.max(0, 100-P-f)}; }
const slotList = () => state.meals == 3 ? ['b','l','d'] : ['b','l','d','s'];
const shareOf = (slot, meals) => (SHARE[meals]||SHARE[4])[slot] ?? SHARE[4][slot] ?? .25;
const planMeals = (plan = state.plan) => plan && plan[0] ? ('s' in plan[0] ? 4 : 3) : +state.meals;
function portion(r, slot, kcal, meals = planMeals()){ return Math.round(clamp(kcal*shareOf(slot, meals)/r.kcal, .5, 2.2)*20)/20; }
const autoProtOn = () => state.autoProt == null ? ['lose','gain'].includes(state.people[0].goal) : !!state.autoProt;
function personLabel(i){
  const p = state.people[i]; if (!p) return '';
  if (p.name) return p.name;
  if (i === 0) return 'Вы';
  const n = state.people.slice(1, i+1).filter(x => x.kind === p.kind).length;
  return (p.kind === 'child' ? 'Ребёнок' : 'Взрослый') + (n > 1 ? ' ' + n : '');
}

/* ===================== Цены ===================== */
function activeStores(){
  if (SD && state.split){ const v = state.stores2.filter(k => SD.keys.includes(k)).slice(0,2); if (v.length) return v; }
  const sl = storeList().map(x => x[0]); return [sl.includes(state.store) ? state.store : sl[0]];
}
function storeItem(store, id){
  if (!SD) return null; const it = SD.items[store] && SD.items[store][id];
  if (!it || !(+it.price > 0) || !(it.size === 'w' || +it.size > 0)) return null; return it;
}
function offer(store, id){
  const i = ING[id], it = storeItem(store, id);
  if (it){ const key = store + ':' + id, own = state.prices[key]; return {size: it.size === 'w' ? 'w' : +it.size, price: own != null ? own : +it.price, item: it, avg:false, key, custom: own != null, store}; }
  const own = state.prices[id], adj = SD ? 0 : (+state.adj||0);
  return {size: i.sale, price: own != null ? own : i.price*(1 + adj/100), item:null, avg: !!SD, key:id, custom: own != null, store};
}
let pc = {sd:undefined};
function pctx(){
  const s2 = state.stores2;
  if (pc.sd !== SD || pc.prices !== state.prices || pc.pv !== pricesVer || pc.store !== state.store || pc.split !== state.split || pc.adj !== state.adj || pc.s2a !== s2[0] || pc.s2b !== s2[1])
    pc = {sd:SD, prices:state.prices, pv:pricesVer, store:state.store, split:state.split, adj:state.adj, s2a:s2[0], s2b:s2[1], stores:activeStores(), gp:{}, ps:{}, sc:{}};
  return pc;
}
function gramPrice(id){
  const c = pctx(); const v = c.gp[id]; if (v !== undefined) return v;
  let best = Infinity; for (const st of c.stores){ const o = offer(st, id); const g = o.price / (o.size === 'w' ? 1000 : o.size); if (g < best) best = g; }
  return c.gp[id] = best;
}
function packSize(id){ const c = pctx(); const v = c.ps[id]; if (v !== undefined) return v; const o = offer(c.stores[0], id); return c.ps[id] = o.size === 'w' ? 0 : o.size; }
function servingCost(r){ const c = pctx(); if (r.id in c.sc) return c.sc[r.id]; let s = 0; for (const id in r.ing) if (ING[id]) s += r.ing[id]*gramPrice(id); return c.sc[r.id] = s; }
function buyIn(store, id, need){
  const o = offer(store, id), i = ING[id];
  if (o.size === 'w'){ const q = Math.max(i.cat === 'veg' && i.k < 100 ? 300 : 100, Math.ceil(need/100)*100); return {o, cost:q/1000*o.price, q, packs:0, left:0}; }
  const packs = Math.max(1, Math.ceil(need/o.size - .03));
  return {o, cost:packs*o.price, q:packs*o.size, packs, left:Math.max(0, packs*o.size - need)};
}
const capVal = () => parseFloat(state.cap) || 0;

/* ===================== Фильтры ===================== */
const typeFit = (r, s) => { const t = r.types; return s==='b' ? t.includes('b') : s==='s' ? t.includes('s') : s==='l' ? t.includes('m') : (t.includes('m')||t.includes('d')); };
function customWords(){ return String(state.customEx||'').toLowerCase().split(/[,;\n]+/).map(s=>s.trim()).filter(s=>s.length>=3).map(s=>s.slice(0, Math.max(3, s.length-2))); }
let fcache = {key:'', F:null};
function resetCaches(){ fcache = {key:'', F:null}; pc = {sd:undefined}; estCache.key = ''; wkCache.start = null; }
function filterCtx(){
  const key = JSON.stringify([state.allergies,state.diet,state.dislikes,state.customEx,state.health,state.quick,state.learner,state.start,state.cuisines]);
  if (fcache.key === key && fcache.F) return fcache.F;
  const tags = new Set(); state.allergies.forEach(a => (ALLERGY_TAGS[a]||[a]).forEach(t => tags.add(t)));
  const ex = new Set(); state.dislikes.forEach(k => (DISLIKES[k] ? DISLIKES[k].ids : []).forEach(id => ex.add(id)));
  const F = {key, tags, ex, words:customWords(), diab:!!state.health.diab, bp:!!state.health.bp, pools:{}, alt:{}, base:{}};
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
  if (F.anyHealth && s === 'd' && hasF(r,'heavy')) return false;
  return true;
}
// Только «безопасные» правила: аллергии, диета, нелюбимое, здоровье. Применяются сразу.
const safeOK = (r, s, F) => baseOK(r, F) && !(F.anyHealth && s === 'd' && hasF(r,'heavy'));
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
function genSetup(mode){
  const F = filterCtx(), pt = targets(state.people[0]), slots = slotList(), ml = slots.length;
  const G = {F, mode, pt, k0:pt.k, rp:pt.p*4/pt.k, rf:pt.f*9/pt.k, rc:pt.c*4/pt.k, ml, slots, E:eaters().map(personKcal), med:{}, maxUse:{}, w:(MODES[mode]||MODES.opt).w, hh:{}, sc:{}};
  for (const s of slots){ const pl = poolFor(s, false, F); G.med[s] = medianCpk(pl) || 1; const n = Math.max(1, pl.length); G.maxUse[s] = n >= 4 ? 2 : Math.ceil(7/n); }
  return G;
}
function hhP(r, s, G){ const k = r.id + s; if (k in G.hh) return G.hh[k]; let a = 0; for (const kc of G.E) a += portion(r, s, kc, G.ml); return G.hh[k] = a; }
function slotCost(r, s, G){ const k = r.id + s; if (k in G.sc) return G.sc[k]; return G.sc[k] = servingCost(r)*hhP(r, s, G); }
// Сводка по всему плану (сколько раз блюдо, сколько граммов продукта), один раз на шаг.
function planSum(plan, lo, G){
  const used = {}, need = {}, dayP = [];
  for (let dd = 0; dd < 7; dd++){ const day = plan[dd]; dayP.push(0); if (!day) continue;
    for (const ss in day){ const r = RM[day[ss]]; if (!r) continue;
      if (!(ss === 'l' && lo[dd])) used[r.id] = (used[r.id]||0) + 1;
      const hm = hhP(r, ss, G); for (const id in r.ing) need[id] = (need[id]||0) + r.ing[id]*hm;
      dayP[dd] += r.P*portion(r, ss, G.k0, G.ml);
    } }
  return {used, need, dayP};
}
// Контекст слота = сводка минус само блюдо в этом слоте.
function ctxFor(plan, lo, d, s, G, sum = planSum(plan, lo, G)){
  const cur = RM[plan[d] && plan[d][s]], minus = {}; let dayP = sum.dayP[d], rem = shareOf(s, G.ml), minusId = null;
  if (cur){ const hm = hhP(cur, s, G); for (const id in cur.ing) minus[id] = cur.ing[id]*hm; dayP -= cur.P*portion(cur, s, G.k0, G.ml); if (!(s === 'l' && lo[d])) minusId = cur.id; }
  for (const ss of G.slots) if (ss !== s && !(plan[d] && plan[d][ss])) rem += shareOf(ss, G.ml);
  return {d, s, used:sum.used, need:sum.need, minus, minusId, needR: Math.max(0, G.pt.p - dayP)*4/(G.k0*rem), wk:isWk(d), plan, lo};
}
const usedOf = (c, id) => (c.used[id]||0) - (c.minusId === id ? 1 : 0);
const needOf = (c, id) => (c.need[id]||0) - (c.minus[id]||0);
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
  if (G.F.anyHealth && hasF(r,'heavy')) sc += .3;
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
function generatePlan(mode, seed, cap, opt = {}){
  const G = genSetup(mode), rnd = mulberry(seed), slots = G.slots, plan = [], lo = [];
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
      const c = ctxFor(plan, lo, d, s, G), all = poolFor(s, c.wk, G.F), cands = all.filter(r => dayOK(day, s, r));
      let best = null, bs = Infinity;
      for (const pass of [0,1]){ for (const r of cands){ if (pass === 0 && !varietyOK(r, c, G)) continue; const sc = score(r, s, c, G) + rnd()*.8; if (sc < bs){ bs = sc; best = r; } } if (best) break; }
      // Совсем мало вариантов: лучше повтор в тот же день, чем пустой приём пищи (но не два тяжёлых)
      if (!best) for (const r of all){ if (hasF(r,'heavy') && Object.values(day).some(id => id && hasF(RM[id],'heavy'))) continue; const sc = score(r, s, c, G); if (sc < bs){ bs = sc; best = r; } }
      day[s] = best ? best.id : null;
    }
  }
  let note = '';
  if (cap > 0){
    const fixed = opt.fixed || (() => false), banned = new Set();
    // Жадно снижаем стоимость: лучшая экономия на единицу потери качества,
    // без повторов в соседние дни, не больше 2 раз за неделю и без потери белка.
    let total = computeCart(plan, lo).total;
    const put = (m, id) => { plan[m.d][m.s] = id; if (m.loNext) plan[m.d+1].l = id; };
    for (let it = 0; it < 60 && total > cap; it++){
      const moves = [], sum = planSum(plan, lo, G);
      for (let d = 0; d < 7; d++){
        const p0 = dayProt(plan[d], G), pMin = Math.min(p0, G.pt.p*.95) - .5;
        const p1 = d < 6 ? dayProt(plan[d+1], G) : 0, p1Min = Math.min(p1, G.pt.p*.95) - .5;
        for (const s of slots){
          const cur = RM[plan[d][s]]; if (!cur || fixed(d,s) || (s === 'l' && lo[d])) continue;
          const loNext = s === 'd' && d < 6 && lo[d+1], k = loNext ? 2 : 1, curProp = slotCost(cur, s, G) + 15;
          let c = null, base = 0, curCost = 0;
          for (const r of poolFor(s, isWk(d), G.F)){
            if (r.id === cur.id || slotCost(r, s, G) > curProp || banned.has(d+s+r.id)) continue;
            if (loNext && keepsOf(r) < 2) continue;
            if (!dayOK(plan[d], s, r)) continue;
            if (p0 - cur.P*portion(cur,s,G.k0,G.ml) + r.P*portion(r,s,G.k0,G.ml) < pMin) continue;
            if (loNext && p1 - cur.P*portion(cur,'l',G.k0,G.ml) + r.P*portion(r,'l',G.k0,G.ml) < p1Min) continue;
            if (!c){ c = ctxFor(plan, lo, d, s, G, sum); base = score(cur, s, c, G); curCost = effCost(cur, s, c, G)*hhP(cur, s, G)*k; }
            if (!varietyOK(r, c, G)) continue;
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
    if (total > cap) note = `Уложиться в ${fmt(cap)} сом без потери белка и разнообразия не получилось. Самое экономное подходящее меню стоит ≈ ${fmt(total)} сом. Можно поднять лимит, убрать перекус, включить «Где дешевле» или ослабить ограничения.`;
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
  state.man = {}; state.noLo = {};
  applyRes(generatePlan(state.mode, state.seed, capVal()));
  state.dirty = false; state.dirtyKinds = []; state.createdAt = Date.now(); save();
}
function keepFrom(pred){
  const slots = slotList(), keep = state.plan.map(() => ({}));
  state.plan.forEach((day, d) => {
    let heavy = false;
    for (const s of slots){ const id = day[s], r = RM[id]; if (!r || (s === 'l' && state.lo[d])) continue;
      if (!pred(d, s, r)) continue;
      if (hasF(r,'heavy')){ if (heavy) continue; heavy = true; }
      keep[d][s] = id; }
  });
  state.plan.forEach((day, d) => { if (d > 0 && state.lo[d] && day.l && keep[d-1].d === day.l) keep[d].l = day.l; });
  return keep;
}
const countChanged = (a, b) => { let n = 0; b.forEach((day, d) => { for (const s in day) if (day[s] && day[s] !== (a[d]||{})[s]) n++; }); return n; };
function enforcePlan(){
  if (!state.plan) return 0;
  const F = filterCtx(), old = JSON.parse(JSON.stringify(state.plan));
  const keep = keepFrom((d, s, r) => safeOK(r, s, F));
  const res = generatePlan(state.mode, state.seed + 1, 0, {keep});
  applyRes(res, true);
  return countChanged(old, res.plan);
}
function smartUpdate(){
  const F = filterCtx(), sc = state.dirtyKinds.includes('score'), old = JSON.parse(JSON.stringify(state.plan));
  const keep = keepFrom((d, s, r) => { if (!slotOK(r, s, isWk(d), F)) return false; if (state.man[d+':'+s]) return true; if (sc) return false; return r.cu === 'snack' || state.cuisines.includes(r.cu); });
  const res = generatePlan(state.mode, state.seed, capVal(), {keep, fixed:(d, s) => !!state.man[d+':'+s]});
  applyRes(res); state.dirty = false; state.dirtyKinds = []; save();
  return countChanged(old, res.plan);
}
function replaceOptions(d, s){
  const G = genSetup(state.mode), plan = state.plan, cur = plan[d][s], c = ctxFor(plan, state.lo, d, s, G);
  return poolFor(s, c.wk, G.F).filter(r => r.id !== cur && dayOK(plan[d], s, r))
    .map(r => ({r, sc: score(r, s, c, G) + (varietyOK(r, c, G) ? 0 : 3)})).sort((a,b) => a.sc - b.sc).slice(0,5).map(x => x.r);
}
const snapshot = () => JSON.parse(JSON.stringify({plan:state.plan, lo:state.lo, man:state.man, noLo:state.noLo}));
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

/* ===================== Порции, добавки, корзина ===================== */
function servings(plan = state.plan, lo = state.lo, withAdd = autoProtOn()){
  const out = []; if (!plan) return out;
  const F = filterCtx(), E = eaters(), ml = planMeals(plan), K = E.map(personKcal);
  plan.forEach((day, d) => { for (const s of SLOT_ORDER){ const r = RM[day[s]]; if (!r) continue;
    const isLo = s === 'l' && !!lo[d], main = [];
    E.forEach((p, i) => {
      if (i > 0){ const a = altFor(r, s, d, i, F); if (a){ out.push({d, s, r:a, who:[{i, m:portion(a, s, K[i], ml)}], alt:true, of:r, lo:false}); return; } }
      main.push({i, m:portion(r, s, K[i], ml)});
    });
    if (main.length) out.push({d, s, r, who:main, lo:isLo});
  } });
  if (withAdd) addonsFrom(out, plan).forEach(a => out.push(a));
  return out;
}
function addonOptions(i, F){
  const ex = personEx(state.people[i]);
  return ADDONS.filter(a => ING[a.id] && ingOK(a.id, F) && !ex.has(a.id)).map(a => Object.assign({}, a, {P:ING[a.id].p*a.g/100, kcal:ING[a.id].k*a.g/100}));
}
function addonsFrom(sv, plan){
  const F = filterCtx(), E = eaters(), out = [];
  const T = E.map(p => isAdult(p) ? targets(p).p : 0), opts = E.map((p, i) => isAdult(p) ? addonOptions(i, F) : []);
  const prot = plan.map(() => E.map(() => 0));
  sv.forEach(x => { if (x.r) x.who.forEach(w => { prot[x.d][w.i] += x.r.P*w.m; }); });
  plan.forEach((day, d) => E.forEach((p, i) => {
    if (!T[i] || !opts[i].length) return;
    const thr = Math.max(10, T[i]*.1); let gap = T[i] - prot[d][i]; const used = new Set();
    for (let n = 0; n < 2 && gap >= thr; n++){
      const av = opts[i].filter(a => !used.has(a.id)); if (!av.length) break;
      const cover = av.filter(a => a.P >= gap*.8).sort((a,b) => a.kcal - b.kcal);
      const a = cover.length ? cover[(d+i) % Math.min(2, cover.length)] : av.reduce((m, a) => a.P > m.P ? a : m);
      used.add(a.id); gap -= a.P; out.push({d, s:'add', add:a, who:[{i, m:1}], r:null, P:a.P});
    }
  }));
  return out;
}
function computeCart(plan = state.plan, lo = state.lo){
  const sv = servings(plan, lo), need = {}, uses = {};
  for (const x of sv){
    if (x.add){ const id = x.add.id; need[id] = (need[id]||0) + x.add.g; (uses[id] = uses[id] || new Set()).add('добрать белок'); continue; }
    let m = 0; for (const w of x.who) m += w.m;
    for (const id in x.r.ing) if (ING[id]){ need[id] = (need[id]||0) + x.r.ing[id]*m; (uses[id] = uses[id] || new Set()).add(x.r.n); }
  }
  const stores = pctx().stores, items = [], sub = {}; let total = 0, pay = 0, bought = 0;
  for (const id in need){
    const i = ING[id], st = state.cart[id] || {};
    let best = null;
    for (const k of stores){ const b = buyIn(k, id, need[id]); b.store = k; if (!best || b.cost < best.cost - .01 || (best.o.avg && !b.o.avg && b.cost <= best.cost + .01)) best = b; }
    items.push(Object.assign(best, {id, i, need:need[id], bought:!!st.b, home:!!st.h, dishes:[...(uses[id]||[])]}));
    total += best.cost; if (!st.h){ pay += best.cost; sub[best.store] = (sub[best.store]||0) + best.cost; } if (st.b || st.h) bought++;
  }
  items.sort((a,b) => CAT_ORDER.indexOf(a.i.cat) - CAT_ORDER.indexOf(b.i.cat) || (a.bought||a.home) - (b.bought||b.home) || a.i.n.localeCompare(b.i.n,'ru'));
  return {items, total, pay, bought, sub, stores};
}
function amountText(id, g){
  const i = ING[id];
  if (i.pc) return fmt1(Math.max(.5, Math.round(g/i.pc*2)/2)) + ' ' + i.pcName;
  if (id === 'oil') return fmt1(Math.max(.5, Math.round(g/13*2)/2)) + ' ст. л.';
  if (g < 20) return qty(id, Math.max(1, Math.round(g)));
  return qty(id, Math.round(g/5)*5);
}
function packLabel(x){ return x.o.item ? qty(x.id, x.o.size) : (x.i.label || qty(x.id, x.i.sale)); }
function leftText(x){
  if (!x.packs || x.left < Math.max(20, x.o.size*.1)) return '';
  if (x.i.pc) { const n = Math.floor(x.left/x.i.pc); return n >= 1 ? `${n} ${x.i.pcName}` : ''; }
  return qty(x.id, Math.round(x.left/10)*10);
}
function unitPriceText(x){ return x.o.size === 'w' ? `${fmt(x.o.price)} сом/${isMl(x.id)?'л':'кг'}` : `${fmt(x.o.price)} сом за ${packLabel(x)}`; }
function weekRange(){
  const a = parseIso(state.start), b = addDays(a, 6);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}` : `${dayMonth(a)} – ${dayMonth(b)}`;
}
function shareText(cart){
  const n = eaters().length, multi = cart.stores.length > 1;
  const lines = [`Корзина недели · ${cart.stores.map(storeName).join(' + ')}`, `${weekRange()} · ${n} ${plural(n,'человек','человека','человек')} · ≈ ${fmt(cart.pay)} сом`];
  for (const st of cart.stores){
    const list = cart.items.filter(x => !x.home && x.store === st); if (!list.length) continue;
    if (multi) lines.push('', `== ${storeName(st)} · ≈ ${fmt(cart.sub[st]||0)} сом ==`);
    let cat = '';
    list.slice().sort((a,b) => CAT_ORDER.indexOf(a.i.cat) - CAT_ORDER.indexOf(b.i.cat)).forEach(x => { if (x.i.cat !== cat){ cat = x.i.cat; lines.push('', CATS[cat]); } lines.push(`${x.bought?'✓':'•'} ${x.o.item ? x.o.item.name : x.i.n}: ${qtyText(x)}`); });
  }
  return lines.join('\n').replace(/\n{3,}/g,'\n\n');
}
const qtyText = x => x.o.size === 'w' ? qty(x.id, x.q) : (x.packs > 1 ? x.packs + ' × ' : '') + packLabel(x);
function needText(x){ if (x.o.size === 'w') return ''; return x.i.pc ? `нужно ≈ ${Math.ceil(x.need/x.i.pc)} ${x.i.pcName}` : `нужно ≈ ${qty(x.id, Math.ceil(x.need/10)*10)}`; }

/* ===================== Прогноз веса ===================== */
function currentWeight(){ const l = state.wlog; return l.length ? l[l.length-1].w : +state.people[0].weight || 70; }
function forecast(p = state.people[0]){
  if (!isAdult(p)) return null;
  const perWeek = (personKcal(p) - maintKcal(p))*7/7700, tgt = parseFloat(p.target), cur = currentWeight();
  const rate = Math.abs(perWeek) < .05 ? 'Калории по расходу, вес будет держаться' : `≈ ${perWeek < 0 ? '−' : '+'}${fmt1(Math.abs(perWeek))} кг в неделю`;
  let goal = '';
  if (tgt > 0){
    const rem = tgt - cur;
    if (Math.abs(rem) < .3) goal = 'Вы уже у цели';
    else if (Math.abs(perWeek) < .05 || Math.sign(rem) !== Math.sign(perWeek)) goal = `Чтобы прийти к ${fmt1(tgt)} кг, выберите цель «${rem < 0 ? 'Похудеть' : 'Набрать массу'}»`;
    else { const dt = addDays(new Date(), Math.ceil(rem/perWeek*7)); goal = `цель к ${dayMonth(dt)}${dt.getFullYear() !== new Date().getFullYear() ? ' ' + dt.getFullYear() : ''}`; }
  }
  return {rate, goal, perWeek};
}

/* ===================== Иконки ===================== */
const svg = (b, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
const IC = {
  logo:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8z"/><path d="M8 9l3-5M16 9l-3-5"/><path d="M9 13v3M15 13v3M12 13v3"/></svg>',
  plate:svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>'),
  cart:svg('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17" cy="20.5" r="1.2"/>'),
  user:svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  chart:svg('<path d="M4 4v16h16"/><path d="M7 15l4-4 3 3 5-6"/>'),
  refresh:svg('<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/>'),
  swap:svg('<path d="M7 4L3 8l4 4"/><path d="M3 8h13a5 5 0 0 1 0 10h-2"/>'),
  book:svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 8h6"/>'),
  check:'<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  tick:'<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  copy:svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  send:svg('<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>'),
  chat:svg('<path d="M4 20l1.5-4A8 8 0 1 1 9 19.3z"/>'),
  close:svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  back:svg('<path d="M15 5l-7 7 7 7"/>', 2.2),
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  ext:svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  moon:svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>')
};

/* ===================== Блоки форм ===================== */
const pressed = b => `aria-pressed="${b ? 'true' : 'false'}"`;
const big = () => !!state.big;
const ML = () => big() ? {p:'Белки',f:'Жиры',c:'Углеводы',u:' г'} : {p:'Б',f:'Ж',c:'У',u:''};
function seg(act, options, cur, pre = ''){ return `<div class="seg" role="group">${options.map(([v,l]) => `<button type="button" data-act="${act}" data-v="${pre}${v}" ${pressed(String(cur)===String(v))}>${l}</button>`).join('')}</div>`; }
function numField(id, label, bind, val, unit, min, max){
  return `<label class="field" for="${id}"><span class="label">${label}</span><div class="input-unit"><input class="input num" id="${id}" type="number" inputmode="decimal" min="${min}" max="${max}" data-bind="${bind}" value="${esc(val)}"><span>${unit}</span></div></label>`;
}
// Свой выбор вместо системного списка: кнопка как поле + панель снизу. Скрытый <select> хранит значение,
// поэтому сохранение идёт через тот же обработчик change, что и у остальных полей.
function pickField(id, bind, val, opts){
  const cur = opts.find(o => String(o[0]) === String(val)) || opts[0];
  return `<button type="button" class="select pick" id="${id}" data-act="pickOpen" data-v="${id}" aria-haspopup="dialog"><span>${esc(cur[1])}</span>${IC.chev}</button>` +
    `<select class="vh" id="${id}-sel" data-bind="${bind}" tabindex="-1" aria-hidden="true">${opts.map(o => `<option value="${o[0]}" data-sub="${esc(o[2] || '')}" ${String(o[0])===String(val)?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
}
function actSelect(id, bind, val){ return pickField(id, bind, val, ACTS); }
const toggle = (act, on, title, hint, v = '') => `<button type="button" class="toggle" data-act="${act}" ${v?`data-v="${v}"`:''} ${pressed(on)}><span><b>${title}</b>${hint?`<br><span class="hint">${hint}</span>`:''}</span><span class="switch" aria-hidden="true"></span></button>`;
const dislikeKeys = () => Object.keys(DISLIKES).filter(k => DISLIKES[k].ids.some(id => ING[id]));

function secAbout(){
  const p = state.people[0], t = targets(p), showGoal = state.onboarded || state.goalSeen;
  return `<div class="stack">
    <label class="field" for="p0-name"><span class="label">Как к вам обращаться</span><input class="input" id="p0-name" type="text" maxlength="24" placeholder="Например, Айгуль" data-bind="p.0.name" value="${esc(p.name)}"></label>
    <div><span class="label">Пол</span>${seg('psex', [['f','Женский'],['m','Мужской']], p.sex, '0:')}</div>
    <div class="grid3">${numField('p0-age','Возраст','p.0.age',p.age,'лет',14,90)}${numField('p0-h','Рост','p.0.height',p.height,'см',120,220)}${numField('p0-w','Вес','p.0.weight',p.weight,'кг',35,250)}</div>
    <label class="field" for="p0-act"><span class="label">Активность</span>${actSelect('p0-act','p.0.act',p.act)}</label>
    <div class="card flat herb-card">
      ${showGoal ? `<div class="eyebrow">Ваша норма с учётом цели</div>
      <div class="kcal-big num">${fmt(t.k)} <span class="kcal-unit">ккал в день</span></div>
      <div class="hint">Белки ${fmt(t.p)} г · жиры ${fmt(t.f)} г · углеводы ${fmt(t.c)} г</div>` :
      `<div class="eyebrow">Ваш расход сейчас</div>
      <div class="kcal-big num">${fmt(maintKcal(p))} <span class="kcal-unit">ккал в день</span></div>
      <div class="hint">Столько вы тратите за день. После выбора цели пересчитаем.</div>`}
    </div></div>`;
}
function secGoal(){
  const p = state.people[0], t = macroPct(p), tg = targets(p), custom = state.macro === 'custom', fc = forecast(p);
  return `<div class="stack-lg">
    <div class="grid2">${Object.entries(GOALS).map(([k,g]) => `<button type="button" class="option" data-act="goal" data-v="${k}" ${pressed(p.goal===k)}><b>${g.n}</b><small>${g.d}</small></button>`).join('')}</div>
    <div class="stack">
      ${numField('p0-target','Хочу весить','p.0.target',p.target,'кг',35,250)}
      ${fc ? `<div class="note num"><b>${fc.rate}</b>${fc.goal ? `, ${fc.goal}` : ''}.</div>` : ''}
    </div>
    <div class="stack">
      <div class="section-h"><h3 class="h2">Белки, жиры, углеводы</h3></div>
      <p class="hint">Белок считаем от веса: ${fmt1(protPerKg(p))} г на 1 кг, это ≈ ${fmt(tg.p)} г в день. Ниже выберите, как поделить остальное между жирами и углеводами.</p>
      <div class="chips">${Object.entries(MACROS).map(([k,m]) => `<button type="button" class="chip" data-act="macro" data-v="${k}" ${pressed(state.macro===k)}>${IC.tick}${m.n}</button>`).join('')}<button type="button" class="chip" data-act="macro" data-v="custom" ${pressed(custom)}>${IC.tick}Свои</button></div>
      <div class="macro-bar" aria-hidden="true"><i class="mp" style="width:${t.p}%"></i><i class="mf" style="width:${t.f}%"></i><i class="mc" style="width:${t.c}%"></i></div>
      <div class="legend"><span><i class="mp"></i>Белки <b id="lp">${t.p}%</b></span><span><i class="mf"></i>Жиры <b id="lf">${t.f}%</b></span><span><i class="mc"></i>Углеводы <b id="lc">${t.c}%</b></span></div>
      ${custom ? `<label class="field" for="r-f"><span class="label">Доля жиров</span><input class="range" id="r-f" type="range" min="15" max="45" step="1" data-range="mf" value="${fatPct()}"></label>` : ''}
    </div>
    ${toggle('autoProt', autoProtOn(), 'Добирать белок автоматически', 'Если в какой-то день белка мало, добавим простой продукт, например творог или яйца, в меню и корзину')}
  </div>`;
}
function personCard(p, i){
  const isChild = p.kind === 'child', open = !!ui.pdis[p.id], dk = dislikeKeys();
  const dl = (p.dislikes||[]).map(k => DISLIKES[k] ? DISLIKES[k].n.toLowerCase() : '').filter(Boolean);
  return `<div class="person">
    <div class="person-h"><b>${p.name ? esc(p.name) + ' · ' : ''}${isChild ? 'Ребёнок' : 'Взрослый'} · ${fmt(personKcal(p))} ккал</b><button type="button" class="link-btn" data-act="rmPerson" data-v="${p.id}">Убрать</button></div>
    <div class="grid2"><label class="field" for="p${i}-name"><span class="label">Имя</span><input class="input" id="p${i}-name" type="text" maxlength="24" data-bind="p.${i}.name" value="${esc(p.name)}" placeholder="${isChild?'Нурик':'Бакыт'}"></label>
    ${numField(`p${i}-age`,'Возраст',`p.${i}.age`,p.age,'лет',1,90)}</div>
    <div>${seg('psex', isChild ? [['f','Девочка'],['m','Мальчик']] : [['f','Женщина'],['m','Мужчина']], p.sex, i+':')}</div>
    ${isChild ? '' : `<div class="grid2">${numField(`p${i}-h`,'Рост',`p.${i}.height`,p.height,'см',120,220)}${numField(`p${i}-w`,'Вес',`p.${i}.weight`,p.weight,'кг',35,250)}</div>
    <div class="stack" style="gap:0.625rem"><label class="field" for="p${i}-act"><span class="label">Активность</span>${actSelect(`p${i}-act`,`p.${i}.act`,p.act)}</label>
    <label class="field" for="p${i}-goal"><span class="label">Цель</span>${pickField(`p${i}-goal`, `p.${i}.goal`, p.goal, Object.entries(GOALS).map(([k,g]) => [k, g.n, g.d]))}</label></div>`}
    <button type="button" class="more-btn" data-act="pdisOpen" data-v="${p.id}" aria-expanded="${open}"><span>Не любит: ${dl.length ? esc(dl.join(', ')) : 'ничего'}</span>${IC.chev}</button>
    ${open ? `<div class="chips">${dk.map(k => `<button type="button" class="chip" data-act="pdis" data-v="${i}:${k}" ${pressed((p.dislikes||[]).includes(k))}>${IC.tick}${DISLIKES[k].n}</button>`).join('')}</div>
      <p class="hint">Если в блюде есть то, что этот человек не ест, ему подберём своё блюдо на этот приём пищи.</p>` : ''}
  </div>`;
}
function secFamily(){
  const total = eaters().reduce((s,p) => s + personKcal(p), 0), n = eaters().length;
  return `<div class="stack">
    ${seg('family', [['solo','Только я'],['many','Несколько человек']], state.family ? 'many' : 'solo')}
    ${state.family ? `<p class="hint">Блюда общие, а порции считаются под норму каждого. Цель меню задаёт первый человек.</p>
      ${state.people.slice(1).map((p,i) => personCard(p, i+1)).join('')}
      <div class="grid2"><button type="button" class="btn btn-soft" data-act="addPerson" data-v="adult">+ Взрослый</button><button type="button" class="btn btn-soft" data-act="addPerson" data-v="child">+ Ребёнок</button></div>` :
      `<p class="hint">Меню и корзина будут на одного человека.</p>`}
    <div class="note num">Едят: <b>${n} ${plural(n,'человек','человека','человек')}</b> · вместе ≈ <b>${fmt(total)} ккал</b> в день</div>
  </div>`;
}
function secPrefs(){
  return `<div class="stack-lg">
    <div class="stack"><h3 class="h2">Любимые кухни</h3><div class="chips">${Object.entries(CUIS).map(([k,n])=>`<button type="button" class="chip" data-act="cuisine" data-v="${k}" ${pressed(state.cuisines.includes(k))}>${IC.tick}${n}</button>`).join('')}</div></div>
    <div class="stack"><h3 class="h2">Тип питания</h3>${seg('diet', [['all','Ем всё'],['pesc','Без мяса'],['veg','Вегетариан.']], state.diet)}
      <p class="hint">${state.diet==='pesc'?'Мясо исключено, рыба остаётся.':state.diet==='veg'?'Без мяса и рыбы. Молочное и яйца остаются.':'Свинины в рецептах нет, все блюда халяль-совместимые по составу.'}</p></div>
    <div class="stack"><h3 class="h2">Приёмов пищи в день</h3>${seg('meals', [['3','3, без перекуса'],['4','4, с перекусом']], state.meals)}</div>
    <div class="stack"><h3 class="h2">Готовить быстро</h3>${seg('quick', [['off','Не важно'],['always','Всегда'],['weekdays','По будням']], state.quick)}
      <p class="hint">Обед и ужин до 35 минут, завтрак до 20, перекус до 15.${state.quick==='weekdays'?' В субботу и воскресенье можно и плов, и лагман.':''}</p></div>
    <div class="stack">
      ${toggle('learner', state.learner, 'Я учусь готовить', 'В будни только лёгкие и средние блюда, сложные в выходные')}
      ${toggle('cook2', state.cook2, 'Готовлю на 2 дня', 'Ужин готовим с запасом, на следующий день обед из остатков')}
    </div>
    <div class="stack"><h3 class="h2">Здоровье</h3>
      ${toggle('health', state.health.diab, 'Сахар / диабет', 'Без сладких блюд и блюд с мёдом, меньше белой муки', 'diab')}
      ${toggle('health', state.health.bp, 'Давление', 'Без солёного, меньше жирного и жареного', 'bp')}
      <p class="hint">${state.health.diab||state.health.bp?'Тяжёлые блюда ставим только на обед, не на ужин. ':''}Это подсказки по меню, а не замена совету врача.</p></div>
    <div class="stack"><h3 class="h2">Не люблю</h3><div class="chips">${dislikeKeys().map(k=>`<button type="button" class="chip" data-act="dislike" data-v="${k}" ${pressed(state.dislikes.includes(k))}>${IC.tick}${DISLIKES[k].n}</button>`).join('')}</div>
      ${state.family ? '<p class="hint">Это для всех. Что не любит каждый, можно отметить в разделе «Кто ест».</p>' : ''}</div>
  </div>`;
}
function secAllergy(){
  const n = allowedCount(), low = pool('b').length < 3 || pool('l').length < 4;
  return `<div class="stack-lg">
    <div class="stack"><span class="label">Отметьте, что нельзя</span><div class="chips">${Object.entries(ALLERGY).map(([k,n])=>`<button type="button" class="chip danger" data-act="allergy" data-v="${k}" ${pressed(state.allergies.includes(k))}>${IC.tick}${n}</button>`).join('')}</div></div>
    <label class="field" for="custom-ex"><span class="label">Исключить продукты</span><input class="input" id="custom-ex" type="text" data-bind="customEx" value="${esc(state.customEx)}" placeholder="Через запятую: чеснок, баклажан"></label>
    <div class="${low?'warn':'note'} num">Подходит <b>${n}</b> ${plural(n,'блюдо','блюда','блюд')} из ${RECIPES.length}.${low?' Вариантов мало, меню будет повторяться. Ослабьте часть ограничений.':''}</div>
    <p class="hint">Блюда с отмеченными продуктами сразу убираются из меню и корзины. При серьёзной аллергии всё равно проверяйте состав на упаковке.</p>
  </div>`;
}
let estCache = {key:'', val:{}};
function estimates(){
  const key = JSON.stringify([state.people,state.family,state.macro,state.mf,state.cuisines,state.diet,state.meals,state.quick,state.learner,state.cook2,state.autoProt,state.health,state.dislikes,state.allergies,state.customEx,activeStores(),state.adj,pricesVer,state.start]);
  if (estCache.key !== key){ const val = {}; for (const m in MODES){ const r = generatePlan(m, 777, 0); val[m] = computeCart(r.plan, r.lo).total; } estCache = {key, val}; }
  return estCache.val;
}
function priceSourceLine(stores = activeStores()){
  if (!SD) return 'Цены средние по супермаркетам Бишкека и заложены в приложение. Любую цену можно поправить в корзине, приложение её запомнит.';
  const src = stores.map(k => { const inf = SD.info[k] || {}, u = safeUrl(inf.url), t = esc(inf.source || inf.n || k); return u ? `<a class="ext-link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>` : t; }).join(', ');
  return `Цены от ${SD.date ? esc(dayMonth(parseIso(SD.date)) + ' ' + parseIso(SD.date).getFullYear()) : 'последнего обновления'}, источник: ${src}. Любую цену можно поправить в корзине.`;
}
function storePicker(){
  const list = storeList();
  if (!SD || !state.split) return `<div class="chips">${list.map(([k,n])=>`<button type="button" class="chip" data-act="store" data-v="${k}" ${pressed(activeStores()[0]===k && !state.split)}>${IC.tick}${esc(n)}</button>`).join('')}</div>`;
  return `<div class="chips">${list.map(([k,n])=>`<button type="button" class="chip" data-act="store2" data-v="${k}" ${pressed(state.stores2.includes(k))}>${IC.tick}${esc(n)}</button>`).join('')}</div><p class="hint">Выберите до двух магазинов. Каждый продукт попадёт туда, где он дешевле.</p>`;
}
function startChips(){
  const t = parseIso(todayIso()), opts = [0,1,2,3,4,5,6].map(i => addDays(t, i));
  if (!opts.some(d => isoOf(d) === state.start)) opts.unshift(parseIso(state.start));
  return `<div class="chips">${opts.map(dt => { const iso = isoOf(dt), diff = Math.round((dt - t)/864e5); const l = diff === 0 ? 'Сегодня' : diff === 1 ? 'Завтра' : `${DAYS_SHORT[dowOf(dt)]} ${dt.getDate()}`; return `<button type="button" class="chip" data-act="start" data-v="${iso}" ${pressed(state.start===iso)}>${IC.tick}${l}</button>`; }).join('')}</div>`;
}
function secBudget(){
  const est = estimates();
  return `<div class="stack-lg">
    <div class="stack"><h3 class="h2">Где покупаете</h3>
      ${SD ? seg('split', [['one','Один магазин'],['two','Где дешевле']], state.split ? 'two' : 'one') : ''}
      ${storePicker()}</div>
    <div class="stack"><h3 class="h2">День покупки</h3>${startChips()}<p class="hint">Меню на 7 дней начнётся с этого дня.</p></div>
    <div class="stack"><div class="section-h"><h3 class="h2">Бюджет на неделю</h3><span class="hint">для ${eaters().length} чел.</span></div>
      <div class="stack gap8">${Object.entries(MODES).map(([k,m])=>`<button type="button" class="option option-row" data-act="mode" data-v="${k}" ${pressed(state.mode===k)}><span class="stack gap2 minw0"><b>${m.n}</b><small>${m.d}</small></span><span class="price">≈ ${fmt(est[k])} сом</span></button>`).join('')}</div></div>
    <div class="${SD ? '' : 'grid2'}">
      ${numField('cap','Жёсткий лимит (необязательно)','cap',state.cap,'сом',0,100000)}
      ${SD ? '' : `<label class="field" for="adj"><span class="label">Цены в вашем магазине</span>${pickField('adj', 'adj', state.adj, [-15,-10,-5,0,5,10,15].map(v => [v, v===0?'Как средние':(v>0?'+':'')+v+'%']))}</label>`}
    </div>
    <p class="hint">Бюджет считается по целым упаковкам. ${priceSourceLine()}</p>
  </div>`;
}
function secAccess(){
  return `<div class="stack">${toggle('big', big(), 'Крупный текст', 'Всё на экране станет крупнее, а белки, жиры и углеводы будут подписаны полностью')}</div>`;
}
const secInstall = () => `<ol class="steps-install"><li><b>iPhone:</b> откройте ссылку в Safari → «Поделиться» → «На экран „Домой“».</li><li><b>Android:</b> откройте в Chrome → меню ⋮ → «Добавить на главный экран».</li></ol><p class="hint">Иконка появится рядом с другими приложениями. Настройки и отметки сохраняются в этом браузере.</p>`;
const secReset = () => `<p class="hint">Удалит профиль, меню, корзину, свои цены и записи веса с этого телефона.</p><button type="button" class="btn btn-ghost" data-act="ask" data-v="reset">Сбросить все данные</button>`;
const STEPS = [
  {t:'Расскажите о себе', sub:'Посчитаем, сколько калорий вам нужно в день', f:secAbout},
  {t:'Цель и вес', sub:'От цели зависят калории, белок и подбор блюд', f:secGoal},
  {t:'Кто ещё ест', sub:'Порции и количество продуктов посчитаем на всех', f:secFamily},
  {t:'Пожелания в еде', sub:'Что любите, сколько раз едите и сколько времени готовить', f:secPrefs},
  {t:'Аллергии и запреты', sub:'Эти продукты не попадут ни в меню, ни в корзину', f:secAllergy},
  {t:'Магазин и бюджет', sub:'Бюджет считается из выбранного меню и цен', f:secBudget}
];

/* ===================== Экраны ===================== */
function viewOnboarding(){
  const i = state.step, s = STEPS[i], last = i === STEPS.length-1;
  return `<header class="top col">
      <div class="row-between">
        <div class="brand"><span class="logo">${IC.logo}</span><span class="eyebrow">Корзина недели · шаг ${i+1} из ${STEPS.length}</span></div>
        <div class="row gap8"><button type="button" class="btn btn-ghost btn-sm aa" data-act="big" ${pressed(big())} aria-label="Крупный текст">Аа</button>${i===0 ? `<button type="button" class="btn btn-ghost btn-sm" data-act="demo">Пример</button>` : ''}</div>
      </div>
      <div class="progress" aria-hidden="true">${STEPS.map((_,k)=>`<i class="${k<=i?'on':''}"></i>`).join('')}</div>
    </header>
    <div class="stack-lg pt6">
      <div class="stack gap6"><h1 class="title">${s.t}</h1><p class="hint sub">${s.sub}</p></div>
      ${s.f()}
    </div>
    <div class="ob-foot"><div class="inner">
      ${i>0 ? `<button type="button" class="btn btn-ghost" data-act="back" aria-label="Назад">${IC.back}</button>` : ''}
      <button type="button" class="btn btn-primary" data-act="${last?'finish':'next'}">${last ? 'Собрать меню и корзину' : 'Дальше'}</button>
    </div></div>`;
}
function dayTotals(d, sv, i = 0){
  const t = {k:0,p:0,f:0,c:0};
  for (const x of sv){ if (x.d !== d) continue; for (const w of x.who){ if (w.i !== i) continue;
    if (x.add){ const g = ING[x.add.id], m = x.add.g/100; t.k += g.k*m; t.p += g.p*m; t.f += g.f*m; t.c += g.c*m; }
    else { t.k += x.r.kcal*w.m; t.p += x.r.P*w.m; t.f += x.r.F*w.m; t.c += x.r.C*w.m; } } }
  return t;
}
const diffPill = r => `<span class="pill d-${diffOf(r)}">${DIFF[diffOf(r)]}</span>`;
function dayChip(i, d){
  const dt = addDays(parseIso(state.start), i), today = isoOf(dt) === todayIso();
  return `<button type="button" class="day ${today?'today':''}" data-act="day" data-v="${i}" ${pressed(i===d)} aria-label="${DAYS[dowOf(dt)]}, ${dayMonth(dt)}${today?', сегодня':''}"><span>${DAYS_SHORT[dowOf(dt)]} ${dt.getDate()}</span>`;
}
function viewMenu(){
  if (!state.plan) regenerate(false);
  const d = state.day, day = state.plan[d] || {}, p = state.people[0], tg = targets(p);
  const sv = servings(), cart = computeCart(), cap = capVal(), auto = autoProtOn();
  const tot = dayTotals(d, sv.filter(x => !x.add || auto));
  const L = ML();
  const bar = (lbl, v, target, unit) => `<div class="bar-item"><div class="lbl"><span>${lbl}</span></div><div class="val num">${fmt(v)}<span class="hint"> / ${fmt(target)}${unit}</span></div><div class="bar"><i style="width:${clamp(v/target*100,0,100)}%"></i></div></div>`;
  const slots = SLOT_ORDER.filter(s => s in day);
  const name = p.name ? esc(p.name) : 'вас';
  const dt = addDays(parseIso(state.start), d);
  const ended = Math.round((parseIso(todayIso()) - parseIso(state.start))/864e5) > 6;
  const adds = addonsFrom(servings(state.plan, state.lo, false), state.plan).filter(a => a.d === d);
  const prep = d < 6 ? Object.entries(state.plan[d+1]||{}).filter(([s,id]) => RM[id] && RM[id].prep && !(s === 'l' && state.lo[d+1])).map(([s,id]) => ({s, r:RM[id]})) : [];
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">${GOALS[p.goal].n} · ${weekRange()}</div><h1 class="title">Меню недели</h1></div></div>
      <button type="button" class="icon-btn" data-act="ask" data-v="regen" aria-label="Собрать всю неделю заново">${IC.refresh}</button></header>
    <div class="stack">
      ${state.dirty ? `<div class="warn stack gap8"><span>Настройки изменились. Обновим только то, что не подходит, ваши замены сохраним.</span><div class="row gap8 wrap"><button type="button" class="btn btn-primary btn-sm" data-act="update">Обновить меню</button><button type="button" class="btn btn-ghost btn-sm" data-act="ask" data-v="regen">Собрать всю неделю заново</button></div></div>` : ''}
      ${ended ? `<div class="warn stack gap8"><span>Эта неделя уже закончилась.</span><button type="button" class="btn btn-primary btn-sm" data-act="ask" data-v="newweek">Новая неделя с сегодняшнего дня</button></div>` : ''}
      ${state.note ? `<div class="alert">${esc(state.note)}</div>` : ''}
      <section class="card stack gap12">
        <div class="budget-line"><div><div class="eyebrow">Бюджет на неделю · ${esc(cart.stores.map(storeName).join(' + '))}</div><div class="big-money num">≈ ${fmt(cart.total)}<small>сом</small></div></div>
          <div class="stat ta-r"><b class="num">${fmt(cart.total/7)}</b><small>сом в день</small></div></div>
        ${cap ? `<div class="meter ${cart.total>cap?'over':''}"><i style="width:${clamp(cart.total/cap*100,0,100)}%"></i></div><div class="hint num">Лимит ${fmt(cap)} сом · ${cart.total<=cap ? 'остаётся ≈ '+fmt(cap-cart.total)+' сом' : 'превышение ≈ '+fmt(cart.total-cap)+' сом'}</div>` : ''}
      </section>
      <div class="days" role="group" aria-label="День недели">${[0,1,2,3,4,5,6].map(i => `${dayChip(i, d)}<small class="num">${fmt(dayTotals(i, sv.filter(x => !x.add || auto)).k)}</small></button>`).join('')}</div>
      <section class="card stack gap10">
        <div class="section-h m0"><h2 class="h2">${DAYS[dowOf(dt)]}, ${dayMonth(dt)}</h2><span class="hint">порции для ${name}</span></div>
        <div class="bars">${bar('Ккал',tot.k,tg.k,'')}${bar('Белки',tot.p,tg.p,' г')}${bar('Жиры',tot.f,tg.f,' г')}${bar(big()?'Углеводы':'Углев.',tot.c,tg.c,' г')}</div>
        ${adds.length ? `<div class="addon"><b>Добрать белок:</b> ${adds.map(a => `${state.family ? esc(personLabel(a.who[0].i)) + ': ' : ''}${esc(a.add.t)} <span class="hint">(≈ ${fmt(a.P)} г белка)</span>`).join('; ')}.
          ${auto ? `<div class="hint">Уже добавлено в меню и корзину.</div>` : `<button type="button" class="btn btn-soft btn-sm mt6" data-act="autoProt">Добавлять автоматически</button>`}</div>` : ''}
        ${prep.length ? prep.map(x => `<div class="prep"><b>Вечером:</b> ${esc(x.r.prep)}. <span class="hint">Завтра на ${SLOT_NAME[x.s].toLowerCase()}: ${esc(x.r.n)}</span></div>`).join('') : ''}
      </section>
      ${slots.map(s => mealCard(d, s, day[s], sv)).join('')}
      <p class="hint ta-c pv6">Нажмите «Заменить», если что-то не нравится. Корзина пересчитается сама.</p>
    </div>`;
}
function plateLine(x){
  if (!x) return '';
  if (x.who.length === 1 && !state.family) return `на тарелку ≈&nbsp;${fmt(plateG(x.r, x.who[0].m))}&nbsp;г`;
  return 'на тарелку: ' + x.who.map(w => `${esc(personLabel(w.i))} ≈&nbsp;${fmt(plateG(x.r, w.m))}&nbsp;г`).join(' · ');
}
function mealCard(d, s, id, sv){
  const r = RM[id];
  if (!r) return `<article class="meal empty-meal"><span class="slot">${SLOT_NAME[s]}</span><p class="hint">Нет подходящих блюд под ваши ограничения. Ослабьте фильтры в профиле.</p></article>`;
  const isLo = s === 'l' && state.lo[d], cookTwo = s === 'd' && d < 6 && state.lo[d+1];
  const main = sv.find(x => x.d === d && x.s === s && !x.alt && !x.add), alts = sv.filter(x => x.d === d && x.s === s && x.alt);
  const me = main && main.who.find(w => w.i === 0), m = me ? me.m : portion(r, s, personKcal(state.people[0]));
  const hm = main ? main.who.reduce((a,w) => a + w.m, 0) : 0, L = ML(), u = L.u;
  return `<article class="meal ${isLo?'lo':''}">
    <div class="meal-top"><span class="slot">${SLOT_NAME[s]}</span><span class="tags">${isLo ? '<span class="tag">разогреть</span>' : `<span class="tag">${r.time} мин</span>${diffPill(r)}`}</span></div>
    <h3>${isLo ? 'Остатки: ' : ''}${esc(r.n)}</h3>
    ${isLo ? '<p class="hint">Готовить не нужно, это вчерашний ужин, приготовленный с запасом.</p>' : ''}
    ${cookTwo ? '<p class="pill-row"><span class="pill d-easy">Готовим на 2 дня</span> <span class="hint">половину оставьте на завтрашний обед</span></p>' : ''}
    <div class="facts num"><span><b>${fmt(r.kcal*m)}</b> ккал</span><span>${L.p} <b>${fmt(r.P*m)}</b>${u}</span><span>${L.f} <b>${fmt(r.F*m)}</b>${u}</span><span>${L.c} <b>${fmt(r.C*m)}</b>${u}</span>${eaters().length>1 && hm ? `<span>${fmt1(hm)} ${portionsWord(hm)} на всех</span>` : ''}${isLo ? '' : `<span>≈ <b>${fmt(servingCost(r)*(hm||m))}</b> сом</span>`}</div>
    ${main ? `<div class="plate num">${plateLine(main)}</div>` : ''}
    ${alts.map(a => `<div class="alt-line"><span><b>${esc(personLabel(a.who[0].i))}</b> ест: ${esc(a.r.n)} <span class="hint">(≈ ${fmt(plateG(a.r, a.who[0].m))} г, не ест то, что в основном блюде)</span></span><button type="button" class="link-btn herb" data-act="openAlt" data-v="${d}:${s}:${a.who[0].i}">Рецепт</button></div>`).join('')}
    <div class="meal-actions"><button type="button" class="btn btn-soft btn-sm" data-act="open" data-v="${d}:${s}">${IC.book}Рецепт</button><button type="button" class="btn btn-ghost btn-sm" data-act="swap" data-v="${d}:${s}">${IC.swap}Заменить</button></div>
  </article>`;
}
function viewCart(){
  if (!state.plan) regenerate(false);
  const cart = computeCart(), cap = capVal(), multi = cart.stores.length > 1;
  const text = shareText(cart);
  const catGroups = list => { const g = {}; list.forEach(x => (g[x.i.cat] = g[x.i.cat] || []).push(x)); return CAT_ORDER.filter(c => g[c]).map(c => `<div class="group"><div class="group-h">${CATS[c]}<span>${fmt(g[c].filter(x=>!x.home).reduce((s,x)=>s+x.cost,0))} сом</span></div><div class="items">${g[c].map(itemRow).join('')}</div></div>`).join(''); };
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">${cart.bought} из ${cart.items.length} отмечено</div><h1 class="title">Корзина</h1></div></div>
    ${cart.bought ? `<button type="button" class="btn btn-ghost btn-sm" data-act="ask" data-v="clearMarks">Сбросить отметки</button>` : ''}</header>
    <div class="stack">
      <section class="card stack gap10">
        ${SD ? seg('split', [['one','Один магазин'],['two','Где дешевле']], state.split ? 'two' : 'one') : '<span class="label m0">Магазин</span>'}
        ${storePicker()}
      </section>
      <section class="receipt">
        <div class="rc-head"><span class="rc-store">${esc(cart.stores.map(storeName).join(' + '))}</span><span class="rc-meta">${weekRange()} · 7 дней · ${eaters().length} чел.</span></div>
        <div class="rc-total"><span class="lbl">К ОПЛАТЕ ≈</span><span class="sum">${fmt(cart.pay)} сом</span></div>
        ${multi ? cart.stores.map(st => `<div class="rc-sub"><span>${esc(storeName(st))}</span><span>${fmt(cart.sub[st]||0)} сом</span></div>`).join('') : ''}
        ${cart.pay !== cart.total ? `<div class="rc-sub"><span>Есть дома</span><span>−${fmt(cart.total-cart.pay)} сом</span></div>` : ''}
        ${cap ? `<div class="rc-sub"><span>Лимит</span><span>${fmt(cap)} сом</span></div>` : ''}
        <div class="rc-sub"><span>Позиций</span><span>${cart.items.length}</span></div>
        <p class="rc-src">${priceSourceLine(cart.stores)}</p>
        <div class="share">
          <button type="button" class="btn btn-primary" data-act="copy">${IC.copy}Скопировать список</button>
          <a class="btn btn-ghost" href="https://t.me/share/url?url=${encodeURIComponent(text)}" target="_blank" rel="noopener">${IC.send}Telegram</a>
          <a class="btn btn-ghost" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${IC.chat}WhatsApp</a>
        </div>
      </section>
      ${ui.shareText ? `<div class="card stack"><label class="label" for="copy-area">Выделите и скопируйте список</label><textarea class="copy-area" id="copy-area" readonly>${esc(ui.shareText)}</textarea></div>` : ''}
      <div class="h4"></div>
      ${multi ? cart.stores.map(st => { const list = cart.items.filter(x => x.store === st); return list.length ? `<section class="store-sec"><div class="store-h"><h2 class="h2">${esc(storeName(st))}</h2><span class="mono">${fmt(cart.sub[st]||0)} сом</span></div>${catGroups(list)}</section>` : ''; }).join('') : catGroups(cart.items)}
      <p class="hint pv10">Соль, сахар и специи не включены. Считаем целыми упаковками, остаток пригодится на следующей неделе. Нажмите на цену, чтобы указать свою. «Есть дома» убирает продукт из суммы.</p>
    </div>`;
}
function itemRow(x){
  const editing = ui.editing === x.o.key, open = !!ui.open[x.id], left = leftText(x), it = x.o.item, url = it && safeUrl(it.url);
  const n = x.dishes.length;
  return `<div class="item ${x.bought?'bought':''} ${x.home?'home':''}">
    <button type="button" class="check" data-act="buy" data-v="${x.id}" aria-label="Отметить: ${esc(x.i.n)}" ${pressed(x.bought)}><i>${IC.check}</i></button>
    <div class="minw0">
      <div class="item-name">${esc(x.i.n)}</div>
      ${it ? `<div class="item-store">${esc(it.name)}${url ? ` <a class="ext-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть товар на сайте магазина">${IC.ext}</a>` : ''}</div>` : ''}
      <div class="item-qty num">${qtyText(x)}${needText(x)?' · '+needText(x):''}</div>
      <div class="item-qty num">${unitPriceText(x)}${left ? ` · <span class="left">останется ≈ ${left}</span>` : ''}</div>
      ${x.o.avg ? '<div class="item-note">нет в каталоге магазина, средняя цена</div>' : ''}
      ${n ? `<button type="button" class="for-btn" data-act="more" data-v="${x.id}" aria-expanded="${open}">${open ? 'для: ' + esc(x.dishes.join(', ')) : `для ${n} ${plural(n,'блюда','блюд','блюд')}`} ${IC.chev}</button>` : ''}
    </div>
    <div class="item-right"><button type="button" class="price-btn ${x.o.custom?'custom':''}" data-act="editprice" data-v="${esc(x.o.key)}" aria-label="Изменить цену: ${fmt(x.cost)} сом">${fmt(x.cost)}</button>
      <button type="button" class="home-btn" data-act="home" data-v="${x.id}" ${pressed(x.home)}>${x.home?'✓ есть дома':'есть дома'}</button></div>
    ${editing ? `<div class="edit-row"><label class="hint" for="price-${esc(x.o.key)}">Цена, ${x.o.size==='w' ? 'сом/кг' : 'сом за упаковку'}</label><input class="input num" id="price-${esc(x.o.key)}" type="number" inputmode="decimal" min="0" data-price="${esc(x.o.key)}" value="${Math.round(x.o.price)}">
      <button type="button" class="btn btn-primary btn-sm" data-act="savePrice" data-v="${esc(x.o.key)}">Готово</button>${x.o.custom?`<button type="button" class="btn btn-ghost btn-sm" data-act="resetPrice" data-v="${esc(x.o.key)}">${SD && it ? 'Цена магазина' : 'Средняя'}</button>`:''}</div>` : ''}
  </div>`;
}
function weightChart(){
  const log = state.wlog.slice(-30), tgt = parseFloat(state.people[0].target);
  if (log.length < 2) return '<p class="hint">Когда записей будет хотя бы две, здесь появится график.</p>';
  const ws = log.map(x => x.w).concat(tgt > 0 ? [tgt] : []), lo = Math.min(...ws) - .5, hi = Math.max(...ws) + .5;
  const W = 320, H = 150, px = 34, py = 12, t0 = parseIso(log[0].d).getTime(), t1 = Math.max(t0 + 864e5, parseIso(log[log.length-1].d).getTime());
  const X = t => px + (t - t0)/(t1 - t0)*(W - px - 8), Y = w => py + (hi - w)/(hi - lo)*(H - py*2);
  const pts = log.map(x => `${X(parseIso(x.d).getTime()).toFixed(1)},${Y(x.w).toFixed(1)}`).join(' ');
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="График веса: от ${fmt1(log[0].w)} до ${fmt1(log[log.length-1].w)} кг">
    <line x1="${px}" y1="${H-py}" x2="${W-4}" y2="${H-py}" class="ax"/>
    <text x="${px-6}" y="${Y(hi-.5)+4}" class="tl" text-anchor="end">${fmt1(hi-.5)}</text><text x="${px-6}" y="${Y(lo+.5)+4}" class="tl" text-anchor="end">${fmt1(lo+.5)}</text>
    ${tgt > 0 ? `<line x1="${px}" y1="${Y(tgt)}" x2="${W-4}" y2="${Y(tgt)}" class="tg"/><text x="${W-6}" y="${Y(tgt)-5}" class="tl tgt" text-anchor="end">цель ${fmt1(tgt)}</text>` : ''}
    <polyline points="${pts}" class="ln"/>
    ${log.map(x => `<circle cx="${X(parseIso(x.d).getTime()).toFixed(1)}" cy="${Y(x.w).toFixed(1)}" r="3.5" class="pt"/>`).join('')}
  </svg>`;
}
function viewProgress(){
  const p = state.people[0], fc = forecast(p), cur = currentWeight(), tgt = parseFloat(p.target), log = state.wlog;
  const todayW = (log.find(x => x.d === todayIso()) || {}).w;
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">${GOALS[p.goal].n}</div><h1 class="title">Прогресс</h1></div></div></header>
    <div class="stack">
      <section class="card stack gap10">
        <div class="row-between"><div class="stat"><small>Сейчас</small><b class="num">${fmt1(cur)} кг</b></div><div class="stat ta-r"><small>Цель</small><b class="num">${tgt > 0 ? fmt1(tgt) + ' кг' : 'не задана'}</b></div></div>
        ${fc ? `<div class="note num"><b>${fc.rate}</b>${fc.goal ? `, ${fc.goal}` : ''}.</div>` : ''}
        ${tgt > 0 ? '' : `<button type="button" class="btn btn-soft btn-sm" data-act="goSec" data-v="goal">Указать цель в профиле</button>`}
        <p class="hint">Прогноз по калориям меню: 7700 ккал ≈ 1 кг. На деле вес меняется неровно, смотрите на тренд за 2–3 недели.</p>
      </section>
      <section class="card stack gap10">
        <h2 class="h2">Записать вес</h2>
        <div class="row gap8 end"><div class="grow">${numField('w-today','Мой вес сегодня','',todayW || cur,'кг',30,300).replace(' data-bind=""','')}</div><button type="button" class="btn btn-primary" data-act="addWeight">Записать</button></div>
        ${weightChart()}
        ${log.length ? `<div class="wlog">${log.slice().reverse().slice(0,12).map(x => `<div><span>${dayMonth(parseIso(x.d))}</span><span class="mono">${fmt1(x.w)} кг</span><button type="button" class="link-btn" data-act="rmWeight" data-v="${x.d}" aria-label="Удалить запись за ${dayMonth(parseIso(x.d))}">Убрать</button></div>`).join('')}</div>` : '<p class="hint">Пока записей нет. Взвешивайтесь утром, натощак, раз в несколько дней.</p>'}
      </section>
    </div>`;
}
const SECS = [['about','О вас',secAbout],['goal','Цель и вес',secGoal],['family','Кто ест',secFamily],['prefs','Пожелания и здоровье',secPrefs],['allergy','Аллергии и запреты',secAllergy],['budget','Магазин и бюджет',secBudget],['access','Удобство',secAccess],['install','Поставить на телефон',secInstall],['reset','Начать заново',secReset]];
function viewProfile(){
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">Всё хранится на этом телефоне</div><h1 class="title">Профиль</h1></div></div></header>
    <div class="stack">
      ${SECS.map(([k,t,f]) => { const open = state.openSec === k; return `<section class="card acc" id="acc-${k}"><h2 class="acc-h"><button type="button" class="acc-btn" data-act="sec" data-v="${k}" aria-expanded="${open}" ${open?`aria-controls="sec-${k}"`:''}><span class="h2">${t}</span>${IC.chev}</button></h2>${open ? `<div class="acc-body" id="sec-${k}">${f()}</div>` : ''}</section>`; }).join('')}
    </div>
    ${state.dirty ? `<div class="ob-foot above-tabs"><div class="inner"><button type="button" class="btn btn-ghost" data-act="ask" data-v="regen">Всё заново</button><button type="button" class="btn btn-primary" data-act="update">Обновить меню</button></div></div>` : ''}`;
}
function sheetWrap(label, inner){ return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" data-stop><div class="grab"></div>${inner}</div></div>`; }
function viewSheet(){
  if (!ui.sheet) return '';
  const {d, s, alt} = ui.sheet, sv = servings();
  let x = alt != null ? sv.find(y => y.d === d && y.s === s && y.alt && y.who[0].i === alt) : sv.find(y => y.d === d && y.s === s && !y.alt && !y.add);
  const r = x ? x.r : RM[state.plan?.[d]?.[s]]; if (!r) return '';
  const isLo = s === 'l' && state.lo[d] && alt == null, cookTwo = s === 'd' && d < 6 && state.lo[d+1] && alt == null;
  let hm = x ? x.who.reduce((a,w) => a + w.m, 0) : 1;
  if (cookTwo){ const n = sv.find(y => y.d === d+1 && y.s === 'l' && !y.alt && !y.add); if (n) hm += n.who.reduce((a,w) => a + w.m, 0); }
  const me = x && x.who.find(w => w.i === 0), m = me ? me.m : (x ? x.who[0].m : 1), L = ML(), dt = addDays(parseIso(state.start), d);
  const many = eaters().length > 1 || cookTwo;
  return sheetWrap(r.n, `
    <div class="row-between start"><div class="stack gap4"><span class="slot">${SLOT_NAME[s]} · ${DAYS[dowOf(dt)]}${alt != null ? ' · для: ' + esc(personLabel(alt)) : ''}</span><h2 class="title t21">${isLo ? 'Остатки: ' : ''}${esc(r.n)}</h2></div>
      <button type="button" class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${IC.close}</button></div>
    <div class="facts num hint sheet-facts"><span>${r.time} мин</span>${diffPill(r)}<span>${fmt(r.kcal*m)} ккал на ${me ? 'вашу ' : ''}порцию</span><span>${L.p} ${fmt(r.P*m)}${L.u} · ${L.f} ${fmt(r.F*m)}${L.u} · ${L.c} ${fmt(r.C*m)}${L.u}</span></div>
    ${x ? `<div class="plate num">${plateLine(x)}</div>` : ''}
    ${isLo ? '<div class="note mt10">Это вчерашний ужин, приготовленный с запасом. Просто разогрейте.</div>' : ''}
    ${cookTwo ? '<div class="note mt10">Готовьте сразу на 2 дня: продукты ниже уже с запасом на завтрашний обед.</div>' : ''}
    ${r.prep ? `<div class="prep mt10"><b>С вечера:</b> ${esc(r.prep)}</div>` : ''}
    ${keepsOf(r) >= 1 ? `<p class="hint mt10">Хранится в холодильнике до ${keepsOf(r)} ${plural(keepsOf(r),'дня','дней','дней')}.</p>` : ''}
    <div class="section-h mt16"><h3 class="h2">Продукты</h3><span class="hint">${many ? `на всех, ${fmt1(hm)} ${portionsWord(hm)}` : 'ваша порция'}</span></div>
    <div class="ing-list">${Object.entries(r.ing).filter(([id])=>ING[id]).map(([id,g])=>`<div><span>${esc(ING[id].n)}</span><span>${amountText(id, g*hm)}</span></div>`).join('')}</div>
    <div class="section-h mt20"><h3 class="h2">Как готовить</h3></div>
    <ol class="steps">${r.steps.map(t=>`<li><span>${esc(t)}</span></li>`).join('')}</ol>
    ${alt == null ? `<div class="mt20"><button type="button" class="btn btn-ghost btn-block" data-act="swap" data-v="${d}:${s}">${IC.swap}Заменить на другое блюдо</button></div>` : ''}`);
}
function viewReplace(){
  if (!ui.replace) return '';
  const {d, s} = ui.replace, cur = RM[state.plan[d][s]], opts = replaceOptions(d, s), k0 = personKcal(state.people[0]), L = ML();
  const G = genSetup(state.mode);
  return sheetWrap('Заменить блюдо', `
    <div class="row-between start"><div class="stack gap4"><span class="slot">${SLOT_NAME[s]} · заменить</span><h2 class="title t21">${cur ? esc(cur.n) : 'Выберите блюдо'}</h2></div>
      <button type="button" class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${IC.close}</button></div>
    <p class="hint mt6">Выберите, на что заменить. Корзина пересчитается сама.</p>
    <div class="opt-list">${opts.length ? opts.map(r => { const m = portion(r, s, k0); return `<button type="button" class="opt" data-act="pick" data-v="${d}:${s}:${r.id}">
      <b>${esc(r.n)}</b>
      <span class="facts num"><span><b>${fmt(r.kcal*m)}</b> ккал</span><span>${L.p} <b>${fmt(r.P*m)}</b>${big()?' г':''}</span><span>≈ <b>${fmt(slotCost(r, s, G))}</b> сом${eaters().length>1?' на всех':''}</span><span>${r.time} мин</span>${diffPill(r)}</span></button>`; }).join('') : '<p class="note">Других подходящих блюд нет. Ослабьте ограничения в профиле.</p>'}</div>`);
}
const CONFIRMS = {
  regen:{t:'Собрать всю неделю заново?', d:'Подберём все блюда заново. Ваши ручные замены пропадут. Отметки в корзине останутся у продуктов, которые снова понадобятся.', ok:'Собрать заново',
    fn:() => { regenerate(true); state.tab = 'menu'; toast('Меню и корзина собраны заново'); }},
  newweek:{t:'Начать новую неделю?', d:'Соберём меню на 7 дней с сегодняшнего дня. Отметки в корзине сбросим.', ok:'Начать',
    fn:() => { state.start = todayIso(); state.day = 0; state.cart = {}; regenerate(true); toast('Новая неделя собрана'); }},
  clearMarks:{t:'Сбросить отметки?', d:'Снимем все галочки «куплено» и «есть дома». Сами продукты останутся в списке.', ok:'Сбросить',
    fn:() => { const prev = JSON.parse(JSON.stringify(state.cart)); state.cart = {}; save(); ui.undo = () => { state.cart = prev; save(); }; toast('Отметки сброшены', true); }},
  reset:{t:'Удалить все данные?', d:'Профиль, меню, корзина, свои цены и записи веса удалятся с этого телефона. Это нельзя отменить.', ok:'Удалить', danger:true,
    fn:() => { try { localStorage.removeItem(LS); } catch(e){} state = defaults(); resetCaches(); scrollTop(); }}
};
function viewPick(){
  if (!ui.pick) return '';
  const {id, title, opts} = ui.pick;
  return sheetWrap(title, `<div class="row-between start"><h2 class="title t21">${esc(title)}</h2><button type="button" class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${IC.close}</button></div>
    <div class="pick-list" role="radiogroup" aria-label="${esc(title)}">${opts.map((o, i) => `<button type="button" class="pick-opt" role="radio" aria-checked="${o.on}" data-act="pickSet" data-v="${i}"><span class="stack gap2"><b>${esc(o.text)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span><i class="pick-dot">${IC.check}</i></button>`).join('')}</div>`);
}
function viewConfirm(){
  const c = CONFIRMS[ui.confirm]; if (!c) return '';
  return `<div class="sheet-wrap" data-act="cancel"><div class="sheet confirm" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d" data-stop><div class="grab"></div>
    <h2 class="title t21" id="cf-t">${c.t}</h2><p class="hint mt10 fs15" id="cf-d">${c.d}</p>
    <div class="grid2 mt20"><button type="button" class="btn btn-ghost" data-act="cancel">Отмена</button><button type="button" class="btn ${c.danger?'btn-danger':'btn-primary'}" data-act="confirmOk">${c.ok}</button></div></div></div>`;
}
function viewTabs(){
  const cart = state.plan ? computeCart() : null, left = cart ? cart.items.length - cart.bought : 0;
  const t = (id, label, icon) => `<button type="button" class="tab" data-act="tab" data-v="${id}" ${state.tab===id?'aria-current="page"':''}>${icon}<span>${label}</span>${id==='cart'&&left?`<span class="badge">${left}</span>`:''}</button>`;
  return `<nav class="tabs" aria-label="Разделы"><div class="inner">${t('menu','Меню',IC.plate)}${t('cart','Корзина',IC.cart)}${t('progress','Прогресс',IC.chart)}${t('profile','Профиль',IC.user)}</div></nav>`;
}

/* ===================== Рендер ===================== */
const app = document.getElementById('app'), layer = document.getElementById('layer');
function render(){
  const root = document.documentElement; if (root && root.classList) root.classList.toggle('big', big());
  let html;
  if (!state.onboarded){ html = viewOnboarding(); app.className = 'noTabs'; }
  else { html = state.tab === 'cart' ? viewCart() : state.tab === 'profile' ? viewProfile() : state.tab === 'progress' ? viewProgress() : viewMenu(); app.className = state.tab === 'profile' && state.dirty ? 'withFoot' : ''; }
  app.innerHTML = html;
  layer.innerHTML = (state.onboarded ? viewTabs() + viewSheet() + viewReplace() : '') + viewConfirm() + viewPick();
  document.body.style.overflow = ui.sheet || ui.replace || ui.confirm || ui.pick ? 'hidden' : '';
}
// Свежие цены из JSON после загрузки страницы: {date, stores:{key:{n,source,url}}, items:{key:{ingId:{name,size,price,url}}}}
function applyLivePrices(p){
  const next = p && typeof p === 'object' ? buildSD(p.date, p.stores, p.items) : null;
  if (!next) return false;
  SD = next;
  const sl = storeList().map(x => x[0]);
  state.store = STORE_RENAME[state.store] || state.store; if (!sl.includes(state.store)) state.store = sl[0];
  state.stores2 = state.stores2.map(k => STORE_RENAME[k] || k).filter(k => sl.includes(k)).slice(0,2);
  if (!state.stores2.length) state.split = false;
  resetCaches(); save(); render();
  return true;
}
let toastTimer;
const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role','status'); toastEl.hidden = true; document.body.appendChild(toastEl);
function toast(msg, undo){
  if (!undo) ui.undo = null;
  toastEl.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" class="toast-btn" data-act="undo">Отменить</button>' : ''}`;
  toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; ui.undo = null; }, undo ? 6000 : 2600);
}
function changed(kind = 'score'){ if (state.onboarded && state.plan){ state.dirty = true; if (!state.dirtyKinds.includes(kind)) state.dirtyKinds.push(kind); } estCache.key = ''; save(); }
function safety(){
  estCache.key = '';
  if (state.onboarded && state.plan){ const n = enforcePlan(); if (n) toast(`Заменили ${n} ${plural(n,'блюдо','блюда','блюд')} под новые ограничения`); }
  save();
}
function toggleIn(arr, v){ const i = arr.indexOf(v); i >= 0 ? arr.splice(i,1) : arr.push(v); }
const scrollTop = () => window.scrollTo(0, 0);
const closeAll = () => { ui.sheet = null; ui.replace = null; ui.confirm = null; ui.pick = null; };

const ACT = {
  tab:v => { state.tab = v; ui.editing = null; ui.shareText = null; closeAll(); save(); render(); scrollTop(); },
  next:() => { if (state.step === 1) state.goalSeen = true; state.step = Math.min(STEPS.length-1, state.step+1); save(); render(); scrollTop(); },
  back:() => { state.step = Math.max(0, state.step-1); save(); render(); scrollTop(); },
  demo:() => { state.onboarded = true; state.goalSeen = true; state.tab = 'menu'; state.day = 0; regenerate(false); render(); scrollTop(); toast('Это пример. Свои данные укажите в профиле'); },
  finish:() => { state.onboarded = true; state.goalSeen = true; state.tab = 'menu'; state.day = 0; regenerate(true); render(); scrollTop(); },
  big:() => { state.big = !state.big; save(); render(); },
  psex:v => { const [i, x] = v.split(':'); const p = state.people[+i]; if (!p) return; p.sex = x; changed(); render(); },
  goal:v => { state.people[0].goal = v; if (!state.macroTouched) state.macro = GOALS[v].macro; changed(); render(); },
  macro:v => { state.macro = v; state.macroTouched = true; if (v === 'custom') state.mf = state.mf || 30; changed(); render(); },
  autoProt:() => { state.autoProt = !autoProtOn(); save(); render(); if (state.onboarded) toast(state.autoProt ? 'Добавки для белка теперь в меню и корзине' : 'Добавки для белка выключены'); },
  family:v => { state.family = v === 'many'; if (state.family && state.people.length === 1) state.people.push(newPerson('adult',{sex:state.people[0].sex==='f'?'m':'f',age:32,height:175,weight:78})); changed(); render(); },
  addPerson:v => { state.people.push(newPerson(v)); changed(); render(); },
  rmPerson:v => { state.people = state.people.filter((p,i) => i===0 || p.id !== v); if (state.people.length === 1) state.family = false; changed(); render(); },
  cuisine:v => { toggleIn(state.cuisines, v); changed('filter'); render(); },
  diet:v => { state.diet = v; safety(); render(); },
  meals:v => { state.meals = +v; changed('filter'); render(); },
  quick:v => { state.quick = v; changed('filter'); render(); },
  learner:() => { state.learner = !state.learner; changed('filter'); render(); },
  cook2:() => { state.cook2 = !state.cook2; state.noLo = {}; changed('score'); render(); },
  health:v => { state.health[v] = !state.health[v]; safety(); render(); },
  dislike:v => { toggleIn(state.dislikes, v); safety(); render(); },
  pdis:v => { const [i, k] = v.split(':'); const p = state.people[+i]; if (!p) return; p.dislikes = p.dislikes || []; toggleIn(p.dislikes, k); estCache.key = ''; save(); render(); },
  pdisOpen:v => { ui.pdis[v] = !ui.pdis[v]; render(); },
  allergy:v => { toggleIn(state.allergies, v); safety(); render(); },
  split:v => { state.split = v === 'two'; if (state.split && !state.stores2.length) state.stores2 = storeList().map(x => x[0]).slice(0,2); estCache.key = ''; save(); render(); },
  store:v => { state.store = v; state.split = false; estCache.key = ''; save(); render(); },
  store2:v => { const a = state.stores2; if (a.includes(v)) a.splice(a.indexOf(v),1); else { a.push(v); if (a.length > 2) a.shift(); } estCache.key = ''; save(); render(); },
  start:v => { if (state.start === v) return; state.start = v; state.day = 0; changed('filter'); render(); },
  mode:v => { state.mode = v; changed(); render(); },
  day:v => { state.day = +v; save(); render(); },
  update:() => { const n = smartUpdate(); state.tab = 'menu'; render(); scrollTop(); toast(n ? `Обновили ${n} ${plural(n,'блюдо','блюда','блюд')}, ваши замены на месте` : 'Меню уже подходит под новые настройки'); },
  ask:v => { ui.confirm = v; render(); },
  cancel:() => { ui.confirm = null; render(); },
  confirmOk:() => { const c = CONFIRMS[ui.confirm]; ui.confirm = null; closeAll(); if (c) c.fn(); render(); },
  swap:v => { const [d, s] = v.split(':'); ui.sheet = null; ui.replace = {d:+d, s}; render(); },
  pick:v => { const [d, s, id] = v.split(':'); pickReplace(+d, s, id); ui.replace = null; render(); toast('Заменили на «' + RM[id].n + '»', true); },
  undo:() => { if (ui.undo){ ui.undo(); ui.undo = null; toastEl.hidden = true; render(); toast('Вернули как было'); } },
  open:v => { const [d, s] = v.split(':'); ui.sheet = {d:+d, s}; render(); },
  openAlt:v => { const [d, s, i] = v.split(':'); ui.sheet = {d:+d, s, alt:+i}; render(); },
  closeSheet:() => { ui.sheet = null; ui.replace = null; ui.pick = null; render(); },
  pickOpen:v => {
    const sel = document.getElementById(v + '-sel'); if (!sel) return;
    const lab = document.querySelector(`label[for="${v}"] .label`);
    ui.pick = {id: v, title: lab ? lab.textContent : 'Выберите', opts: [...sel.options].map(o => ({value: o.value, text: o.textContent, sub: o.dataset.sub || '', on: o.selected}))};
    render();
  },
  pickSet:v => {
    const p = ui.pick; if (!p) return; const sel = document.getElementById(p.id + '-sel'), o = p.opts[+v];
    ui.pick = null;
    if (sel && o && sel.value !== o.value){ sel.value = o.value; sel.dispatchEvent(new Event('change', {bubbles: true})); }
    render(); const btn = document.getElementById(p.id); if (btn) btn.focus({preventScroll: true});
  },
  buy:v => { const c = state.cart[v] = state.cart[v] || {}; c.b = !c.b; save(); render(); },
  home:v => { const c = state.cart[v] = state.cart[v] || {}; c.h = !c.h; save(); render(); },
  more:v => { ui.open[v] = !ui.open[v]; render(); },
  editprice:v => { ui.editing = ui.editing === v ? null : v; render(); const el = document.getElementById('price-'+v); if (el){ el.focus(); el.select(); } },
  savePrice:v => { const el = document.getElementById('price-'+v); const n = parseFloat(el && el.value); if (n > 0){ state.prices[v] = n; pricesVer++; estCache.key = ''; } ui.editing = null; save(); render(); },
  resetPrice:v => { delete state.prices[v]; pricesVer++; estCache.key = ''; ui.editing = null; save(); render(); },
  copy:() => {
    const text = shareText(computeCart());
    const fallback = () => { ui.shareText = text; render(); const ta = document.getElementById('copy-area'); if (ta){ ta.focus(); ta.select(); } };
    try { navigator.clipboard.writeText(text).then(() => toast('Список скопирован'), fallback); } catch(e){ fallback(); }
  },
  sec:v => { state.openSec = state.openSec === v ? '' : v; save(); render(); const el = document.getElementById('acc-'+v); if (el && el.scrollIntoView && state.openSec) el.scrollIntoView({block:'start'}); },
  goSec:v => { state.openSec = v; state.tab = 'profile'; save(); render(); const el = document.getElementById('acc-'+v); if (el && el.scrollIntoView) el.scrollIntoView({block:'start'}); },
  addWeight:() => {
    const el = document.getElementById('w-today'), w = parseFloat(el && String(el.value).replace(',','.'));
    if (!(w >= 30 && w <= 300)) return toast('Введите вес от 30 до 300 кг');
    const d = todayIso(), log = state.wlog.filter(x => x.d !== d); log.push({d, w: Math.round(w*10)/10}); log.sort((a,b) => a.d < b.d ? -1 : 1);
    state.wlog = log; state.people[0].weight = log[log.length-1].w; estCache.key = ''; save(); render(); toast('Записали ' + fmt1(w) + ' кг');
  },
  rmWeight:v => { const prev = state.wlog.slice(); state.wlog = state.wlog.filter(x => x.d !== v); save(); ui.undo = () => { state.wlog = prev; save(); }; render(); toast('Запись убрана', true); }
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if ((a === 'closeSheet' || a === 'cancel') && e.target.closest('[data-stop]') && !e.target.closest('button[data-act]')) return;
  const fn = ACT[a]; if (!fn) return;
  e.preventDefault();
  fn(el.dataset.v, el);
});
const BIND_KIND = {name:null, target:null, age:'score', height:'score', weight:'score', act:'score', goal:'score'};
document.addEventListener('change', e => {
  const el = e.target; const b = el.dataset && el.dataset.bind; if (!b) return;
  const parts = b.split('.'); let val = el.value;
  const numeric = el.type === 'number' || el.tagName === 'SELECT' && /act|adj/.test(b);
  if (numeric) val = val === '' ? '' : parseFloat(val);
  if (parts[0] === 'p'){ const p = state.people[+parts[1]]; if (!p) return; p[parts[2]] = val; const k = BIND_KIND[parts[2]]; if (k) changed(k); else { estCache.key = ''; save(); } }
  else { state[b] = val; if (b === 'adj'){ estCache.key = ''; save(); } else if (b === 'customEx') safety(); else changed(); }
  softRender();
});
let pendingRender = false;
const inField = () => { const a = document.activeElement; return a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.type !== 'range'; };
function softRender(){ setTimeout(() => { if (inField()) { pendingRender = true; return; } pendingRender = false; const y = window.scrollY; render(); window.scrollTo(0, y); }, 0); }
document.addEventListener('focusout', () => { if (pendingRender) softRender(); });
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.range) softRender(); });
document.addEventListener('input', e => {
  const el = e.target, k = el.dataset && el.dataset.range; if (!k) return;
  state[k] = +el.value;
  const t = macroPct(); const set = (id,v) => { const n = document.getElementById(id); if (n) n.textContent = v+'%'; };
  set('lp',t.p); set('lf',t.f); set('lc',t.c);
  document.querySelectorAll('.macro-bar').forEach(bar => { const [a,b,c] = bar.children; a.style.width=t.p+'%'; b.style.width=t.f+'%'; c.style.width=t.c+'%'; });
  changed();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (ui.sheet || ui.replace || ui.confirm || ui.pick)){ closeAll(); render(); }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.price){ ACT.savePrice(e.target.dataset.price); }
  if (e.key === 'Enter' && e.target.id === 'w-today'){ e.preventDefault(); ACT.addWeight(); }
});
