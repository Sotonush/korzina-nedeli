// Иконки и блоки форм. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
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
// Порции по-русски: «1 порция», «2 порции», «5 порций», «4,2 порции», без «,0». acc — винительный падеж («готовим 1 порцию», «на 21 порцию»).
function portionsText(n, acc = false){
  const v = Math.round((+n || 0)*10)/10;
  if (Math.abs(v - Math.round(v)) > 1e-9) return `${fmt1(v)} порции`;
  return `${fmt(v)} ${plural(v, acc ? 'порцию' : 'порция', 'порции', 'порций')}`;
}
// Кухонная техника: по умолчанию всё есть (state.equip может отсутствовать в старых сохранениях).
const equipState = () => Object.assign({blender:true, oven:true}, state.equip && typeof state.equip === 'object' ? state.equip : {});
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
      <div class="kcal-big num"><span id="live-k0">${fmt(t.k)}</span> <span class="kcal-unit">ккал в день</span></div>
      <div class="hint" id="live-m0">${aboutMacros(t)}</div>` :
      `<div class="eyebrow">Ваш расход сейчас</div>
      <div class="kcal-big num"><span id="live-maint">${fmt(maintKcal(p))}</span> <span class="kcal-unit">ккал в день</span></div>
      <div class="hint">Столько вы тратите за день. После выбора цели пересчитаем.</div>`}
    </div></div>`;
}
function secGoal(){
  const p = state.people[0], t = macroPct(p), tg = targets(p), custom = state.macro === 'custom', fc = forecast(p);
  return `<div class="stack-lg">
    <div class="grid2">${Object.entries(GOALS).map(([k,g]) => `<button type="button" class="option" data-act="goal" data-v="${k}" ${pressed(p.goal===k)}><b>${g.n}</b><small>${g.d}</small></button>`).join('')}</div>
    <div class="stack">
      ${numField('p0-target','Хочу весить','p.0.target',p.target,'кг',35,250)}
      ${fc ? `<div class="note num"><b>${fc.rate}</b>${fc.goal ? `, ${fc.goal}` : ''}.<br>${fc.basis}</div>` : ''}
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
  const noA = Object.keys(state.allergyWho||{}).filter(a => state.allergies.includes(a) && state.allergyWho[a].includes(p.id)).map(a => ALLERGY[a].toLowerCase());
  return `<div class="person">
    <div class="person-h"><b><span id="live-pn${i}">${p.name ? esc(p.name) + ' · ' : ''}</span>${isChild ? 'Ребёнок' : 'Взрослый'} · <span class="num" id="live-pk${i}">${fmt(personKcal(p))}</span> ккал</b><button type="button" class="link-btn" data-act="rmPerson" data-v="${p.id}">Убрать</button></div>
    <div class="grid2"><label class="field" for="p${i}-name"><span class="label">Имя</span><input class="input" id="p${i}-name" type="text" maxlength="24" data-bind="p.${i}.name" value="${esc(p.name)}" placeholder="${isChild?'Арсен':'Бакыт'}"></label>
    ${numField(`p${i}-age`,'Возраст',`p.${i}.age`,p.age,'лет',1,isChild?17:90)}</div>
    <div>${seg('psex', isChild ? [['f','Девочка'],['m','Мальчик']] : [['f','Женщина'],['m','Мужчина']], p.sex, i+':')}</div>
    ${isChild ? `<div class="grid2">${numField(`p${i}-h`,'Рост (необяз.)',`p.${i}.height`,p.height,'см',50,200)}${numField(`p${i}-w`,'Вес (необяз.)',`p.${i}.weight`,p.weight,'кг',8,150)}</div>
    <label class="field" for="p${i}-cact"><span class="label">Активность</span>${pickField(`p${i}-cact`, `p.${i}.cact`, p.cact || 'mid', [['low','Малоподвижный','Мало гуляет, больше сидит'],['mid','Обычный','Школа, прогулки, игры'],['high','Очень активный','Спорт или секция несколько раз в неделю']])}</label>
    <p class="hint">Норма по возрасту и полу (EFSA). С весом посчитаем точнее.</p>` : ''}
    ${noA.length ? `<p class="hint">Нельзя: ${esc(noA.join(', '))}</p>` : ''}
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
    <div class="note num">Едят: <b>${n} ${plural(n,'человек','человека','человек')}</b> · вместе ≈ <b><span id="live-tot">${fmt(total)}</span> ккал</b> в день</div>
  </div>`;
}
const aboutMacros = t => `Белки ${fmt(t.p)} г · жиры ${fmt(t.f)} г · углеводы ${fmt(t.c)} г`;
// Пока человек печатает возраст, рост или вес, калории в карточках и итог «Едят: …» меняются сразу.
// Обновляем только текст, поле с фокусом не перерисовываем.
function liveKcal(){
  const set = (id, v) => { const n = document.getElementById(id); if (n && n.textContent !== v) n.textContent = v; };
  const p0 = state.people[0];
  set('live-k0', fmt(targets(p0).k)); set('live-m0', aboutMacros(targets(p0))); set('live-maint', fmt(maintKcal(p0)));
  state.people.forEach((p, i) => { set('live-pk' + i, fmt(personKcal(p))); set('live-pn' + i, p.name ? p.name + ' · ' : ''); });
  set('live-tot', fmt(eaters().reduce((s, p) => s + personKcal(p), 0)));
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
    <div class="stack"><h3 class="h2">Что есть на кухне</h3>
      ${toggle('equip', equipState().blender, 'Есть блендер', 'Если выключить, не предложим блюда, где нужен блендер', 'blender')}
      ${toggle('equip', equipState().oven, 'Есть духовка', 'Если выключить, не предложим запеканки и другие блюда из духовки', 'oven')}
    </div>
    <div class="stack"><h3 class="h2">Здоровье</h3>
      ${toggle('health', state.health.diab, 'Сахар / диабет', 'Без сладкого и мёда, белая мука не чаще 2 раз в неделю, углеводы видны у каждого блюда', 'diab')}
      ${diabAsk()}
      ${toggle('health', state.health.bp, 'Давление', 'Без солёного, жирное не чаще 1 раза в неделю, меньше жареного', 'bp')}
      <p class="hint">${state.health.diab||state.health.bp?'Тяжёлые и жирные блюда, супы и мясо с картошкой — только на обед, не на ужин. Жиры за день не выше нормы +10%. Лепёшка с каймаком — не чаще раза в неделю. ':''}Это подсказки по меню, а не замена совету врача.</p></div>
    <div class="stack"><h3 class="h2">Не люблю</h3><div class="chips">${dislikeKeys().map(k=>`<button type="button" class="chip" data-act="dislike" data-v="${k}" ${pressed(state.dislikes.includes(k))}>${IC.tick}${DISLIKES[k].n}</button>`).join('')}</div>
      ${state.family ? '<p class="hint">Это для всех. Что не любит каждый, можно отметить в разделе «Кто ест».</p>' : ''}</div>
  </div>`;
}
// При диабете предлагаем (не навязываем) режим «Меньше углеводов».
const diabAsk = () => state.health.diab && state.macro !== 'lowcarb' && !state.diabNo ? `<div class="note stack gap8"><span>При диабете обычно советуют меньше углеводов. Переключить БЖУ на «Меньше углеводов»?</span><div class="row gap8 wrap"><button type="button" class="btn btn-primary btn-sm" data-act="lowcarb">Переключить</button><button type="button" class="btn btn-ghost btn-sm" data-act="diabNo">Не сейчас</button></div></div>` : '';
function allergyWhoBlock(){
  if (!state.family || !state.allergies.length) return '';
  const ppl = eaters();
  return `<div class="stack"><span class="label">Для кого (только для заметки, исключаем для всех)</span>${state.allergies.map(a => { const who = state.allergyWho[a] || []; const names = ppl.filter(p => who.includes(p.id)).map(p => personLabel(state.people.indexOf(p)));
    return `<div class="who-row"><b>${esc(ALLERGY[a])}</b>${names.length ? ` <span class="hint">нельзя: ${esc(names.join(', '))}</span>` : ''}<div class="chips">${ppl.map(p => `<button type="button" class="chip chip-sm" data-act="allWho" data-v="${a}:${p.id}" ${pressed(who.includes(p.id))}>${IC.tick}${esc(personLabel(state.people.indexOf(p)))}</button>`).join('')}</div></div>`; }).join('')}</div>`;
}
function secAllergy(){
  const n = allowedCount(), low = pool('b').length < 3 || pool('l').length < 4;
  return `<div class="stack-lg">
    <div class="stack"><span class="label">Отметьте, что нельзя</span><div class="chips">${Object.entries(ALLERGY).map(([k,n])=>`<button type="button" class="chip danger" data-act="allergy" data-v="${k}" ${pressed(state.allergies.includes(k))}>${IC.tick}${n}</button>`).join('')}</div></div>
    ${allergyWhoBlock()}
    <label class="field" for="custom-ex"><span class="label">Исключить продукты</span><input class="input" id="custom-ex" type="text" data-bind="customEx" value="${esc(state.customEx)}" placeholder="Через запятую: чеснок, баклажан"></label>
    <div class="${low?'warn':'note'} num">Подходит <b>${n}</b> ${plural(n,'блюдо','блюда','блюд')} из ${RECIPES.length}.${low?' Вариантов мало, меню будет повторяться. Ослабьте часть ограничений.':''}</div>
    <p class="hint">Блюда с отмеченными продуктами сразу убираются из меню и корзины. При серьёзной аллергии всё равно проверяйте состав на упаковке.</p>
  </div>`;
}
let estCache = {key:'', val:{}};
function estimates(){
  const key = JSON.stringify([state.people,state.family,state.macro,state.mf,state.cuisines,state.diet,state.meals,state.quick,state.learner,state.cook2,state.autoProt,state.health,state.dislikes,state.allergies,state.customEx,activeStores(),state.adj,pricesVer,state.start,state.ecoKeep,equipState(),state.chilled]);
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
  const pairs = pairTotals(), cur = activeStores().slice().sort().join(',');
  return `<div class="chips">${list.map(([k,n])=>`<button type="button" class="chip" data-act="store2" data-v="${k}" ${pressed(state.stores2.includes(k))}>${IC.tick}${esc(n)}</button>`).join('')}</div>
    ${pairs.length > 1 ? `<div class="stack gap6"><span class="label m0">Сравнение пар магазинов</span><div class="pairs">${pairs.map((p, i) => `<button type="button" class="pair" data-act="pair" data-v="${p.stores.join(',')}" ${pressed(p.stores.slice().sort().join(',') === cur)}><span>${esc(p.stores.map(storeName).join(' + '))}${i === 0 ? ' <small>дешевле всего</small>' : ''}</span><b class="num">${fmt(p.total)}</b></button>`).join('')}</div></div>` : ''}
    <p class="hint">Выберите два магазина или пару из списка. Во второй магазин переносим продукт, только если вся покупка там дешевле хотя бы на ${SPLIT_MIN} сом или на ${Math.round(SPLIT_PCT*100)}% (и не меньше чем на ${SPLIT_ABS} сом). Остальное — в первом.</p>`;
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
      <div class="stack gap8">${Object.entries(MODES).map(([k,m])=>`<button type="button" class="option option-row" data-act="mode" data-v="${k}" ${pressed(state.mode===k)}><span class="stack gap2 minw0"><b>${m.n}</b><small>${m.d}</small></span><span class="price">≈ ${fmt(est[k])} сом</span></button>`).join('')}</div>
</div>
    <div class="${SD ? '' : 'grid2'}">
      ${numField('cap','Жёсткий лимит (необязательно)','cap',state.cap,'сом',0,100000)}
      ${SD ? '' : `<label class="field" for="adj"><span class="label">Цены в вашем магазине</span>${pickField('adj', 'adj', state.adj, [-15,-10,-5,0,5,10,15].map(v => [v, v===0?'Как средние':(v>0?'+':'')+v+'%']))}</label>`}
    </div>
    ${capFloor()}
    ${ecoKeepBlock()}
    ${chillPicker()}
    <p class="hint">Бюджет считается по целым упаковкам. ${priceSourceLine()}</p>
  </div>`;
}
// Под лимитом: минимум на неделю и честное предупреждение, если лимит ниже минимума.
function capFloor(){
  const n = eaters().length, min = minCostEst(), cap = capVal();
  return `<div class="stack gap6"><div class="hint num">Минимум для ${n} ${plural(n,'человека','человек','человек')} на неделю ≈ <b>${fmt(min)}</b> сом</div>
    ${cap > 0 && cap < min - .5 ? `<div class="warn num">С таким лимитом сбалансированное меню не собрать: не хватает ≈ <b>${fmt(min - cap)}</b> сом.</div>` : ''}</div>`;
}
// «Эконом»: что из дорогого оставить — под полем лимита и свёрнуто, чтобы поле не уезжало из-под пальца.
function ecoKeepBlock(){
  if (state.mode !== 'eco') return '';
  const open = !!ui.ecoOpen, on = state.ecoKeep.map(k => PREMIUM[k] && PREMIUM[k].n).filter(Boolean);
  return `<div class="stack gap6"><button type="button" class="more-btn" data-act="ecoOpen" aria-expanded="${open}"><span>Что оставить в «Экономе»: ${on.length ? esc(on.join(', ')) : 'ничего дорогого'}</span>${IC.chev}</button>
    ${open ? `<span class="hint">В «Экономе» не берём дорогие продукты. Отметьте, что всё-таки любите и хотите оставить:</span><div class="chips">${Object.entries(PREMIUM).map(([k, p]) => `<button type="button" class="chip chip-sm" data-act="ecoKeep" data-v="${k}" ${pressed(state.ecoKeep.includes(k))}>${IC.tick}${p.n}</button>`).join('')}</div>` : ''}</div>`;
}
// Курица: замороженная (дешевле) или охлаждённая; в подсказке — разница цены, если она есть в данных.
function chillPicker(){
  if (!chickenIds().length) return '';
  const df = chillDiff(), ds = df.map(x => Math.round(x.d)), lo = Math.min(...ds), hi = Math.max(...ds), sg = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
  const hint = df.length ? `Охлаждённая в «${esc(storeName(activeStores()[0]))}»: ${lo === hi ? sg(lo) : sg(lo) + '…' + sg(hi)} сом/кг к цене замороженной.` : 'Охлаждённой курицы пока нет в каталоге — где её нет, посчитаем по замороженной.';
  return `<div class="stack gap6"><span class="label m0">Курица</span>${seg('chilled', [['0','Замороженная (дешевле)'],['1','Охлаждённая']], chilledOn() ? '1' : '0')}<p class="hint">${hint}</p></div>`;
}
function secAccess(){
  return `<div class="stack">${toggle('big', big(), 'Крупный текст', 'Всё на экране станет крупнее, а белки, жиры и углеводы будут подписаны полностью')}</div>`;
}
const secInstall = () => `<ol class="steps-install"><li><b>iPhone:</b> откройте ссылку в Safari → «Поделиться» → «На экран „Домой“».</li><li><b>Android:</b> откройте в Chrome → меню ⋮ → «Добавить на главный экран».</li></ol><p class="hint">Иконка появится рядом с другими приложениями. Настройки и отметки сохраняются в этом браузере.</p>`;
const secReset = () => `<div class="reset-zone"><button type="button" class="danger-text" data-act="ask" data-v="reset">Удалить все данные</button><p class="hint">Профиль, меню, корзина, свои цены и записи веса удалятся с этого телефона.</p></div>`;
const STEPS = [
  {t:'Расскажите о себе', sub:'Посчитаем, сколько калорий вам нужно в день', f:secAbout},
  {t:'Цель и вес', sub:'От цели зависят калории, белок и подбор блюд', f:secGoal},
  {t:'Кто ещё ест', sub:'Порции и количество продуктов посчитаем на всех', f:secFamily},
  {t:'Пожелания в еде', sub:'Что любите, сколько раз едите и сколько времени готовить', f:secPrefs},
  {t:'Аллергии и запреты', sub:'Эти продукты не попадут ни в меню, ни в корзину', f:secAllergy},
  {t:'Магазин и бюджет', sub:'Бюджет считается из выбранного меню и цен', f:secBudget}
];
