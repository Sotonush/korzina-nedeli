// Рендер и обработка нажатий. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
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
  equip:v => { if (v !== 'blender' && v !== 'oven') return; const e = equipState(); e[v] = !e[v]; state.equip = e; changed('filter'); render(); },
  viewPerson:v => { state.viewPerson = Math.max(0, Math.round(+v) || 0); save(); render(); },
  health:v => { state.health[v] = !state.health[v]; if (v === 'diab' && state.health.diab) state.diabNo = false; safety(); render(); },
  lowcarb:() => { state.macro = 'lowcarb'; state.macroTouched = true; state.diabNo = true; changed(); render(); toast('БЖУ: меньше углеводов. Нажмите «Обновить меню»'); },
  diabNo:() => { state.diabNo = true; save(); render(); },
  allWho:v => { const [a, id] = v.split(':'); const l = state.allergyWho[a] = state.allergyWho[a] || []; toggleIn(l, id); save(); render(); },
  ecoKeep:v => { toggleIn(state.ecoKeep, v); changed(); render(); },
  tipEco:() => { state.mode = 'eco'; estCache.key = ''; const n = smartUpdate(); render(); toast(n ? `Режим «Эконом»: заменили ${n} ${plural(n,'блюдо','блюда','блюд')}` : 'Режим «Эконом» включён'); },
  noSnack:v => { const snap = snapshot(); state.noSnack[+v] = 1; keepCart(); save(); ui.undo = () => { Object.assign(state, snap); keepCart(); save(); }; render(); toast('Перекус в ' + dayShort(+v) + ' убран', true); },
  snackBack:v => { delete state.noSnack[+v]; save(); render(); },
  pair:v => { const [a, b] = v.split(','); if (!a || !b) return; state.split = true; state.stores2 = [a, b]; estCache.key = ''; save(); render(); },
  dislike:v => { toggleIn(state.dislikes, v); safety(); render(); },
  pdis:v => { const [i, k] = v.split(':'); const p = state.people[+i]; if (!p) return; p.dislikes = p.dislikes || []; toggleIn(p.dislikes, k); estCache.key = ''; save(); render(); },
  pdisOpen:v => { ui.pdis[v] = !ui.pdis[v]; render(); },
  allergy:v => { toggleIn(state.allergies, v); safety(); render(); },
  split:v => { state.split = v === 'two'; if (state.split && state.stores2.length < 2){ const pt = pairTotals(); state.stores2 = pt.length ? pt[0].stores.slice() : storeList().map(x => x[0]).slice(0,2); } estCache.key = ''; save(); render(); },
  store:v => { state.store = v; state.split = false; estCache.key = ''; save(); render(); },
  // Третий магазин не выкидывает молча один из выбранных: спрашиваем, какой заменить.
  store2:v => { const a = state.stores2;
    if (a.includes(v)){ if (a.length > 1) a.splice(a.indexOf(v),1); }
    else if (a.length < 2) a.push(v);
    else { ui.pick = {id:'', title:`Вместо какого магазина взять «${storeName(v)}»?`, opts:a.map(k => ({value:k, text:'Вместо «' + storeName(k) + '»', sub:'Останутся: ' + storeName(a.find(x => x !== k)) + ' + ' + storeName(v), on:false})), fn:k => { const i = state.stores2.indexOf(k); if (i >= 0) state.stores2[i] = v; }}; render(); return; }
    estCache.key = ''; save(); render(); },
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
    if (p.fn){ if (o) p.fn(o.value); estCache.key = ''; save(); render(); return; }
    if (sel && o && sel.value !== o.value){ sel.value = o.value; sel.dispatchEvent(new Event('change', {bubbles: true})); }
    render(); const btn = document.getElementById(p.id); if (btn) btn.focus({preventScroll: true});
  },
  buy:v => { const c = state.cart[v] = state.cart[v] || {}; c.b = !c.b; save(); render(); },
  home:v => { const x = computeCart().items.find(y => y.id === v), c = state.cart[v] = state.cart[v] || {}; c.h = !(x ? x.home : !!c.h); save(); render(); },
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
  // На телефоне нажатие кнопки не всегда снимает фокус с поля, и change не приходит до перерисовки:
  // сохраняем набранное значение сами, иначе оно пропадёт вместе со старой разметкой.
  const af = document.activeElement;
  if (af && af !== el && af.dataset && af.dataset.bind && af.tagName === 'INPUT') commitBind(af);
  fn(el.dataset.v, el);
});
const BIND_KIND = {name:null, target:null, age:'score', height:'score', weight:'score', act:'score', goal:'score', cact:'score'};
const bindValue = el => { const b = el.dataset.bind, numeric = el.type === 'number' || el.tagName === 'SELECT' && /(^|\.)(act|adj)$/.test(b); return numeric ? (el.value === '' ? '' : parseFloat(el.value)) : el.value; };
// Записать значение поля в состояние. Возвращает false, если записывать некуда или значение не изменилось.
function commitBind(el){
  const b = el.dataset && el.dataset.bind; if (!b) return false;
  const parts = b.split('.'), val = bindValue(el);
  if (parts[0] === 'p'){ const p = state.people[+parts[1]]; if (!p) return false; const same = p[parts[2]] === val && el.dataset.saved === String(val); p[parts[2]] = val; el.dataset.saved = String(val); if (same) return false; const k = BIND_KIND[parts[2]]; if (k) changed(k); else { estCache.key = ''; save(); } }
  else { const same = state[b] === val && el.dataset.saved === String(val); state[b] = val; el.dataset.saved = String(val); if (same) return false; if (b === 'adj'){ estCache.key = ''; save(); } else if (b === 'customEx') safety(); else changed(); }
  return true;
}
document.addEventListener('change', e => { if (commitBind(e.target)) softRender(); });
// Пока печатают в поле человека или лимита — сразу пишем в состояние (без перерисовки) и обновляем калории на экране.
document.addEventListener('input', e => {
  const el = e.target, b = el.dataset && el.dataset.bind; if (!b || el.tagName !== 'INPUT') return;
  const parts = b.split('.'), val = bindValue(el);
  if (parts[0] === 'p'){ const p = state.people[+parts[1]]; if (!p) return; p[parts[2]] = val; if (typeof liveKcal === 'function') liveKcal(); }
  else if (b === 'cap') state.cap = val;
  else return;
  save();
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
