// Справочники, утилиты, рецепты, состояние, нормы, цены. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
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
// Суп на тарелку, мл: взрослым 350–450, детям 250–300. Если калорий супа мало — хлеб к супу (до N г), остальное добирают другие приёмы.
const SOUP_ML = {adult:[350,450], child:[250,300]};
const BREAD_MAX = {adult:100, child:50};
const BREADS = ['bread','bread_rye','lepeshka','lavash'];
// Обычно есть дома: не считаем в сумме, пока пользователь не нажмёт «купить».
const PANTRY = ['tea','oil','salt','sugar','tomato_paste','honey','soy_sauce','vinegar','spices','soda','black_pepper','bay_leaf','cumin','zira','paprika'];
const PANTRY_RE = /spice|salt|sugar|pepper_black|black_pepper|zira|cumin|paprika|bay_leaf|soda|vanil|cinnamon/;
// «Эконом»: дорогие продукты, которые не берём, если пользователь их не оставил.
const PREMIUM = {
  mushrooms:{n:'Грибы', re:/^mushroom/},
  nuts:{n:'Орехи', re:/^(nuts|walnut|almond|cashew|hazelnut|pistachio)/},
  berries:{n:'Ягоды', re:/^berr/},
  redfish:{n:'Красная рыба', re:/salmon|trout|semga|forel|red_fish/},
  turkey:{n:'Индейка', re:/^turkey/},
  icheese:{n:'Импортный сыр', re:/parmesan|mozzarella|feta|brie|cheddar|cheese_imp/},
  peanut:{n:'Арахисовая паста', re:/^peanut/},
  tuna:{n:'Тунец (консервы)', re:/^tuna/}
};
const premiumId = id => { for (const k in PREMIUM) if (PREMIUM[k].re.test(id)) return k; return null; };
// Тепличные овощи, если в данных ещё нет season:'summer'.
const SUMMER_FALLBACK = ['tomato','cucumber','pepper','zucchini','eggplant'];
const WINTER_ALT = 'капуста, морковь, свёкла';
// Дети: средняя потребность в энергии, ккал/день. По EFSA (2013) Scientific Opinion on Dietary Reference Values
// for energy (Average Requirements; 1–3 года при PAL ≈ 1,4, 4–17 лет при PAL 1,6), значения округлены.
// Активность: малоподвижный ≈ PAL 1,4, очень активный ≈ PAL 1,8 (множители 0,875 и 1,125).
const CHILD_KCAL = {
  m:[0,780,1030,1170,1330,1400,1480,1590,1690,1790,1890,1980,2100,2240,2400,2540,2640,2710],
  f:[0,720,960,1090,1240,1310,1380,1470,1560,1650,1740,1830,1910,1990,2050,2090,2110,2120]
};
const CHILD_ACT = {low:{n:'Малоподвижный',pal:1.4}, mid:{n:'Обычный',pal:1.6}, high:{n:'Очень активный',pal:1.8}};

/* ===================== Утилиты ===================== */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const fmt1 = n => (Math.round(n*10)/10).toLocaleString('ru-RU');
const fmtD = n => (Math.round(n*10)/10).toLocaleString('ru-RU', {minimumFractionDigits:1, maximumFractionDigits:1});
const r1 = n => Math.round(n*10)/10;
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
// Первое блюдо: флаг из данных, иначе по названию.
const isSoup = r => r.soup === true || (r.soup !== false && /суп|шорпо|борщ|кесме/i.test(r.n));
const isRedMeat = id => id !== 'liver' && !!ING[id] && (ING[id].t||[]).some(t => t === 'beef' || t === 'mutton');
const STARCH = new Set(['potato','rice','noodles','pasta','flour','kesme','lepeshka','lavash','bread']);
const isMeatFish = id => { const t = ING[id] && ING[id].t || []; return t.includes('meat') || t.includes('fish'); };
// «Мясо/рыба + картошка» (хек с картофелем, жаркоп, окорочка с картошкой): сытно, при диабете/давлении только в обед.
function potatoProtein(r){
  if ((r.ing.potato||0) < 100) return false;
  let g = 0; for (const id in r.ing) if (isMeatFish(id)) g += r.ing[id];
  return g >= 80;
}
// Тяжёлое для ужина (при диабете/давлении): флаги heavy/fatty, «мясо/рыба + картошка», а для обеденных блюд ещё супы и «красное мясо + картошка/тесто/рис».
function heavyDinner(r){
  if (hasF(r,'heavy') || hasF(r,'fatty')) return true;
  if (potatoProtein(r)) return true;
  if ((r.types||[]).includes('d')) return false;
  if (isSoup(r)) return true;
  let red = false, st = false;
  for (const id in r.ing){ if (isRedMeat(id)) red = true; if (STARCH.has(id) || STARCH.has(id.split('_')[0])) st = true; }
  return red && st;
}
// Основа блюда: из данных (r.base), иначе продукт, дающий больше всего калорий (без масла, мёда и соусов).
const BASE_SKIP = new Set(['oil','butter','honey','smetana','kaymak','peanut_butter','sugar']);
function normBase(id){
  const i = ING[id], t = i && i.t || [];
  if (t.includes('chicken')) return 'chicken';
  if (id === 'liver') return 'liver';
  if (t.includes('mutton')) return 'mutton';
  if (t.includes('beef') && !/pelmeni|chuchvara/.test(id)) return 'beef';
  if (t.includes('fish')) return 'fish';
  return id.split('_')[0];
}
function baseOf(r){
  if (r._base !== undefined) return r._base;
  if (typeof r.base === 'string' && r.base) return r._base = r.base;
  let best = '', bk = -1;
  for (const id in r.ing){ const i = ING[id]; if (!i || BASE_SKIP.has(id) || i.cat === 'pantry') continue; const k = i.k*r.ing[id]; if (k > bk){ bk = k; best = id; } }
  return r._base = best ? normBase(best) : r.id;
}
const fruitIds = r => { if (r._fr) return r._fr; return r._fr = Object.keys(r.ing).filter(id => ING[id] && ING[id].cat === 'fruit' && id !== 'lemon'); };
// Ключи разнообразия блюда: основа + крупа-гарнир (≥ 40 г) + мясо/рыба (≥ 50 г) + много картошки (keys — «раз в день»).
// Недельный лимит (wkeys) — по основе и крупе-гарниру; курицу дополнительно ограничивает «не больше 4 дней».
// «Печень с гречкой» и «гречка с курицей» делят ключ buckwheat — значит, не в один день и не чаще лимита в неделю.
const GRAIN_KEYS = new Set(['buckwheat','rice','bulgur','pasta','noodles','millet','oats','semolina','dough','couscous','barley','corn_grits']);
const GRAIN_ALIAS = {rice_long:'rice', rice_round:'rice', kesme:'noodles', flour:'dough', spaghetti:'pasta', vermicelli:'pasta'};
function grainKey(id){ const i = ING[id]; if (!i || i.cat !== 'grain' || (i.t||[]).includes('legume') || id === 'starch') return null; return GRAIN_ALIAS[id] || id.split('_')[0]; }
function meatKey(id){
  const i = ING[id]; if (!i || /pelmeni|chuchvara/.test(id)) return null; const t = i.t || [];
  if (/liver/.test(id)) return 'liver';
  for (const k of ['chicken','turkey','mutton','beef','fish']) if (t.includes(k)) return k;
  return t.includes('meat') ? id.split('_')[0] : null;
}
// Лимит в неделю (сколько раз готовим): крупы 2, курица и картошка 4, остальное 3.
const keyLim = k => GRAIN_KEYS.has(k) ? 2 : 3;
function vk(r){
  if (r._vk) return r._vk;
  const b = baseOf(r), set = new Set([b]), wk = new Set([b]); let chick = false;
  for (const id in r.ing){
    const g = r.ing[id], gk = grainKey(id), mk = meatKey(id);
    if (gk && g >= (gk === 'dough' ? 60 : 40)){ set.add(gk); wk.add(gk); }
    if (mk && g >= 50){ set.add(mk); if (mk === 'chicken') chick = true; }
    if (id === 'potato' && g >= 150) set.add('potato');
  }
  return r._vk = {keys:[...set], set, wkeys:[...wk], wset:wk, chick};
}
// Солёное: флаг salty, а ещё любое блюдо с квашеной капустой, солёными/маринованными овощами, сельдью.
const SALTY_RE = /sauerkraut|pickle|kvash|marin|olive|kimchi|herring|seledk|brynza/;
function saltyR(r){
  if (r._sl !== undefined) return r._sl;
  return r._sl = hasF(r,'salty') || Object.keys(r.ing).some(id => SALTY_RE.test(id) || (ING[id] && /квашен|солён|солен|маринов|сельд/i.test(ING[id].n)));
}
// Белая мука: флаг whiteflour или заметное количество белого хлеба, лепёшки, лаваша, макарон, лапши, теста.
const WHITE_IDS = new Set(['bread','lepeshka','lavash','pasta','noodles','kesme','flour','pelmeni','chuchvara','samsa','baton']);
function whiteR(r){
  if (r._wf !== undefined) return r._wf;
  let g = 0; for (const id in r.ing) if (WHITE_IDS.has(id)) g += r.ing[id];
  return r._wf = hasF(r,'whiteflour') || g >= 40;
}
const flagOn = (r, f) => f === 'whiteflour' ? whiteR(r) : f === 'salty' ? saltyR(r) : hasF(r, f);
// Готовые замороженные пельмени/чучвара.
const frozenR = r => Object.keys(r.ing).some(id => /pelmeni|chuchvara|vareniki|frozen_dumpl/.test(id));
// Техника: из данных (r.needs), иначе по названию.
function needsOf(r){
  if (Array.isArray(r.needs)) return r.needs;
  if (r._nd) return r._nd;
  const n = r.n || '', out = [];
  if (/хумус|суп-пюре|крем-суп|смузи|блендер/i.test(n)) out.push('blender');
  if (/духовк|запеч|запекан|противн|самса|в фольге/i.test(n)) out.push('oven');
  return r._nd = out;
}
const equipOf = () => Object.assign({blender:true, oven:true}, state && state.equip && typeof state.equip === 'object' ? state.equip : {});
const kaymakStyle = r => !!(r.ing.kaymak || (r.ing.lepeshka && (r.types||[]).includes('b') && hasF(r,'fatty')));
// Шаги рецепта: [[160|мл]] — количество на 1 порцию, показываем × число порций.
const NOSCALE = /мин|час|°|см|сек|раз/;
function fmtAmount(v, unit){
  const u = String(unit||'').trim();
  if (u === 'мл' || u === 'л'){ const ml = u === 'л' ? v*1000 : v; if (ml >= 1000) return fmt1(ml/1000) + ' л'; return fmt(ml >= 100 ? Math.round(ml/10)*10 : ml >= 20 ? Math.round(ml/5)*5 : Math.max(1, Math.round(ml))) + ' мл'; }
  if (u === 'г' || u === 'кг'){ const g = u === 'кг' ? v*1000 : v; if (g >= 1000) return fmt1(g/1000) + ' кг'; return fmt(g >= 100 ? Math.round(g/10)*10 : g >= 20 ? Math.round(g/5)*5 : Math.max(1, Math.round(g))) + ' г'; }
  const half = Math.max(.5, Math.round(v*2)/2);
  return (v >= 10 ? fmt(v) : fmt1(half)) + (u ? ' ' + u : '');
}
function stepText(t, hm){
  return esc(String(t ?? '')).replace(/\[\[\s*([\d.,]+)\s*\|\s*([^\]]*?)\s*\]\]/g, (m0, n, u) => {
    const v = parseFloat(String(n).replace(',', '.'));
    if (!(v >= 0)) return esc(u);
    if (NOSCALE.test(u)) return fmt1(v) + (u ? ' ' + u : '');
    return fmtAmount(v * (hm > 0 ? hm : 1), u);
  }).replace(/\[\[|\]\]/g, '');
}
// Зима: октябрь–май. Летние (тепличные) продукты зимой дорогие.
const summerIds = () => { if (summerIds.v) return summerIds.v; const has = Object.values(ING).some(i => i && i.season); return summerIds.v = new Set(has ? Object.keys(ING).filter(id => ING[id].season === 'summer') : SUMMER_FALLBACK.filter(id => ING[id])); };
const isWinter = () => { const m = parseIso(state && state.start).getMonth(); return m >= 9 || m <= 4; };
const PANTRY_NAME = {oil:'масло', flour:'мука', tea:'чай', vinegar:'уксус', salt:'соль', sugar:'сахар'};
const pantryName = id => PANTRY_NAME[id] || (ING[id] ? ING[id].n.split(/[,(«0-9]/)[0].trim().toLowerCase() : id);
const shortName = id => (ING[id] ? ING[id].n : id).split(/[ ,(]/)[0];

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
// Цель по умолчанию — по ИМТ: < 18,5 набрать массу, 18,5–25 держать вес, > 25 похудеть.
// goalAuto — цель, которую поставили мы; пока пользователь её не поменял, она следует за ростом и весом.
const bmiOf = p => { const w = +p.weight, h = +p.height/100; return w > 0 && h > .5 ? w/(h*h) : 0; };
function bmiGoal(p){ const b = bmiOf(p); return !b ? 'keep' : b < 18.5 ? 'gain' : b > 25 ? 'lose' : 'keep'; }
function syncGoal(p){
  if (!p || !p.goalAuto || !isAdult(p)) return;
  if (p.goal !== p.goalAuto){ delete p.goalAuto; return; }
  // Основной человек: после шага «Цель» в онбординге выбор считается сделанным.
  if (typeof state !== 'undefined' && state && state.people && state.people[0] === p && (state.goalSeen || state.onboarded)){ delete p.goalAuto; return; }
  const g = bmiGoal(p); if (g === p.goal) return;
  p.goal = g; p.goalAuto = g;
  if (state && state.people && state.people[0] === p && !state.macroTouched && GOALS[g]) state.macro = GOALS[g].macro;
}
function newPerson(kind, extra){
  if (kind === 'child') return Object.assign({id:uid(),kind:'child',name:'',sex:'m',age:8,height:'',weight:'',cact:'mid',dislikes:[]}, extra||{});
  const p = Object.assign({id:uid(),kind:'adult',name:'',sex:'f',age:30,height:165,weight:65,act:1.375,goal:'keep',target:'',dislikes:[]}, extra||{});
  if (!extra || !('goal' in extra)){ p.goal = bmiGoal(p); p.goalAuto = p.goal; }
  return p;
}
function defaults(){
  return {v:2,onboarded:false,step:0,goalSeen:false,tab:'menu',day:0,start:todayIso(),
    people:[newPerson('adult',{weight:70})],
    family:false,macro:'balanced',mp:35,mf:30,macroTouched:false,
    cuisines:['kg','home','eu','asia','zoh'],diet:'all',meals:4,quick:'off',learner:false,cook2:false,autoProt:null,
    health:{diab:false,bp:false},dislikes:[],allergies:[],customEx:'',
    store:storeList()[0][0],split:false,stores2:[],adj:0,mode:'opt',cap:'',prices:{},
    seed:20261120,plan:null,lo:[],man:{},noLo:{},noSnack:{},note:'',cart:{},dirty:false,dirtyKinds:[],createdAt:null,
    big:false,openSec:'about',wlog:[],allergyWho:{},ecoKeep:[],diabNo:false};
}
function migrate(s){
  const st = Object.assign(defaults(), s);
  if (typeof st.quick === 'boolean') st.quick = st.quick ? 'always' : 'off';
  if (!['off','always','weekdays'].includes(st.quick)) st.quick = 'off';
  st.allergies = [...new Set((Array.isArray(st.allergies)?st.allergies:[]).map(a => a === 'peanut' ? 'nuts' : a))].filter(a => ALLERGY[a]);
  st.dislikes = (Array.isArray(st.dislikes)?st.dislikes:[]).filter(k => DISLIKES[k]);
  if (!Array.isArray(st.people) || !st.people.length) st.people = defaults().people;
  st.people = st.people.map(p => { const q = Object.assign({id:uid(),kind:'adult',name:'',sex:'f',age:30,dislikes:[]}, p && typeof p === 'object' ? p : {}); if (!Array.isArray(q.dislikes)) q.dislikes = []; if (q.kind === 'adult' && q.target == null) q.target = ''; if (!q.sex) q.sex = 'm';
    if (q.kind === 'child'){ if (!CHILD_ACT[q.cact]) q.cact = 'mid'; if (q.height == null) q.height = ''; if (q.weight == null) q.weight = ''; }
    return q; });
  st.health = Object.assign({diab:false,bp:false}, st.health && typeof st.health === 'object' ? st.health : {});
  if (!MACROS[st.macro] && st.macro !== 'custom') st.macro = 'balanced';
  ['lo','wlog','stores2','dirtyKinds','cuisines','ecoKeep'].forEach(k => { if (!Array.isArray(st[k])) st[k] = k === 'cuisines' ? Object.keys(CUIS) : []; });
  ['man','noLo','noSnack','cart','prices','allergyWho'].forEach(k => { if (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k])) st[k] = {}; });
  for (const a in st.allergyWho) if (!Array.isArray(st.allergyWho[a])) delete st.allergyWho[a];
  st.ecoKeep = st.ecoKeep.filter(k => PREMIUM[k]);
  if (!MODES[st.mode]) st.mode = 'opt';
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
const ui = {sheet:null, replace:null, confirm:null, editing:null, shareText:null, open:{}, pdis:{}, undo:null, fill:false};
// Блюда, которых больше нет в данных: убираем и при первом показе меню подбираем замену.
function dropUnknown(st){ let n = 0; if (st.plan) st.plan.forEach(day => { for (const s in day) if (day[s] && !RM[day[s]]){ day[s] = null; n++; } }); return n; }
if (dropUnknown(state)) ui.fill = true;
function save(){ try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e){} }
let pricesVer = 0;

/* ===================== Нормы ===================== */
const eaters = () => state.family ? state.people : [state.people[0]];
const isAdult = p => p.kind !== 'child';
// Ребёнок: табличное значение EFSA по полу и возрасту × активность. Если указан вес (от 3 лет) — уточняем по
// Шофилду (WHO/FAO/UNU 1985/2004: 3–10 лет м 22,7·вес+495, д 22,5·вес+499; 10–18 лет м 17,5·вес+651, д 12,2·вес+746) × PAL,
// но не дальше ±20% от таблицы. Рост пока только для справки.
function childKcal(p){
  const a = clamp(Math.round(+p.age||8), 1, 17), sx = p.sex === 'f' ? 'f' : 'm', act = CHILD_ACT[p.cact] || CHILD_ACT.mid;
  const table = CHILD_KCAL[sx][a] * (a <= 3 ? 1 : act.pal/1.6);
  const w = parseFloat(p.weight);
  if (a >= 3 && w >= 10 && w <= 150){
    const bmr = a < 10 ? (sx === 'm' ? 22.7*w + 495 : 22.5*w + 499) : (sx === 'm' ? 17.5*w + 651 : 12.2*w + 746);
    return Math.round(clamp(bmr*act.pal*1.01, table*.8, table*1.2)/10)*10;
  }
  return Math.round(table/10)*10;
}
function bmrAct(p){ const w=+p.weight||70, h=+p.height||170, a=+p.age||30; return (10*w + 6.25*h - 5*a + (p.sex === 'm' ? 5 : -161)) * (+p.act||1.375); }
function maintKcal(p){ if (!isAdult(p)) return childKcal(p); return Math.round(Math.max(p.sex==='m'?1500:1200, bmrAct(p))/10)*10; }
function personKcal(p){ if (!isAdult(p)) return childKcal(p); if (p.goalAuto) syncGoal(p); return Math.round(Math.max(p.sex==='m'?1500:1200, bmrAct(p)*(GOALS[p.goal]||GOALS.keep).k)/10)*10; }
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
const soupRange = (r, child) => { const [a, b] = SOUP_ML[child ? 'child' : 'adult'], y = yieldOf(r) || 1; return [a/y, b/y]; };
function portion(r, slot, kcal, meals = planMeals(), child = false){
  const m = kcal*shareOf(slot, meals)/r.kcal;
  if (isSoup(r)){ const [a, b] = soupRange(r, child); return Math.round(clamp(m, a, b)*100)/100 || .05; }
  return Math.round(clamp(m, .5, 2.2)*20)/20;
}
const autoProtOn = () => (syncGoal(state.people[0]), state.autoProt == null) ? ['lose','gain'].includes(state.people[0].goal) : !!state.autoProt;
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
// Цена для планировщика — та же, что в корзине (охлаждённая курица и т. п., если корзина это умеет).
const offerOf = (store, id) => typeof cartOffer === 'function' ? cartOffer(store, id) : offer(store, id);
let pc = {sd:undefined};
function pctx(){
  const s2 = state.stores2;
  if (pc.sd !== SD || pc.prices !== state.prices || pc.pv !== pricesVer || pc.store !== state.store || pc.split !== state.split || pc.adj !== state.adj || pc.s2a !== s2[0] || pc.s2b !== s2[1] || pc.ch !== (state.chilled ?? false))
    pc = {sd:SD, prices:state.prices, pv:pricesVer, store:state.store, split:state.split, adj:state.adj, s2a:s2[0], s2b:s2[1], ch:(state.chilled ?? false), stores:activeStores(), gp:{}, ps:{}, sc:{}};
  return pc;
}
function gramPrice(id){
  const c = pctx(); const v = c.gp[id]; if (v !== undefined) return v;
  let best = Infinity; for (const st of c.stores){ const o = offerOf(st, id); const g = o.price / (o.size === 'w' ? 1000 : o.size); if (g < best) best = g; }
  return c.gp[id] = best;
}
function packSize(id){ const c = pctx(); const v = c.ps[id]; if (v !== undefined) return v; const o = offerOf(c.stores[0], id); return c.ps[id] = o.size === 'w' ? 0 : o.size; }
function servingCost(r){ const c = pctx(); if (r.id in c.sc) return c.sc[r.id]; let s = 0; for (const id in r.ing) if (ING[id]) s += r.ing[id]*gramPrice(id); return c.sc[r.id] = s; }
function buyIn(store, id, need){
  const o = offer(store, id), i = ING[id];
  if (o.size === 'w'){ const q = Math.max(i.cat === 'veg' && i.k < 100 ? 300 : 100, Math.ceil(need/100)*100); return {o, cost:q/1000*o.price, q, packs:0, left:0}; }
  const packs = Math.max(1, Math.ceil(need/o.size - .03));
  return {o, cost:packs*o.price, q:packs*o.size, packs, left:Math.max(0, packs*o.size - need)};
}
const capVal = () => parseFloat(state.cap) || 0;
