// Экраны. Файлы src/js/*.js склеиваются по порядку имён в один скрипт (tools/sources.js).
/* ===================== Экраны ===================== */
function viewOnboarding(){
  const i = state.step, s = STEPS[i], last = i === STEPS.length-1;
  return `<header class="top col">
      <div class="row-between">
        <div class="brand"><span class="logo">${IC.logo}</span><span class="eyebrow">Корзина недели · шаг ${i+1} из ${STEPS.length}</span></div>
        <div class="row gap8"><button type="button" class="btn btn-ghost btn-sm aa" data-act="big" ${pressed(big())} aria-label="Крупный текст"><span class="aa-a" aria-hidden="true">Аа</span>${big() ? 'Обычный' : 'Крупнее'}</button>${i===0 ? `<button type="button" class="btn btn-ghost btn-sm" data-act="demo">Пример</button>` : ''}</div>
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
    if (x.add){ const g = ING[x.add.id]; if (!g) continue; const m = x.add.g/100; t.k += g.k*m; t.p += g.p*m; t.f += g.f*m; t.c += g.c*m; }
    else { t.k += x.r.kcal*w.m; t.p += x.r.P*w.m; t.f += x.r.F*w.m; t.c += x.r.C*w.m; } } }
  return t;
}
const diffPill = r => `<span class="pill d-${diffOf(r)}">${DIFF[diffOf(r)]}</span>`;
const dayShort = d => DAYS_SHORT[dowOf(addDays(parseIso(state.start), d))];
function dayChip(i, d, k){
  const dt = addDays(parseIso(state.start), i), today = isoOf(dt) === todayIso();
  return `<button type="button" class="day ${today?'today':''}" data-act="day" data-v="${i}" ${pressed(i===d)} aria-label="${DAYS[dowOf(dt)]}, ${dayMonth(dt)}${today?', сегодня':''}, ${fmt(k)} ккал"><span>${DAYS_SHORT[dowOf(dt)]} ${dt.getDate()}</span><small class="num">${fmt(k)}</small><small class="kc">ккал</small></button>`;
}
// Больше белка заменой блюда (лучше, чем добавка): лучший вариант на этот день.
function protSwap(d){
  if (!state.plan) return null;
  const G = genSetup(state.mode), day = state.plan[d] || {}; let best = null;
  for (const s of SLOT_ORDER){
    const cur = RM[day[s]]; if (!cur || (s === 'l' && state.lo[d]) || skipSlot(d, s) || state.man[d+':'+s]) continue;
    const loNext = s === 'd' && d < 6 && state.lo[d+1], pc = cur.P*portion(cur, s, G.k0, G.ml);
    for (const r of replaceOptions(d, s, G)){
      if (loNext && keepsOf(r) < 2) continue;
      const gain = r.P*portion(r, s, G.k0, G.ml) - pc;
      if (gain >= 8 && (!best || gain > best.gain)) best = {d, s, id:r.id, prev:cur.id, gain};
    }
  }
  return best;
}
function tipLabel(t){
  if (t.kind === 'snack') return `уберите перекус в ${dayShort(t.d)} <b class="num">−${fmt(t.save)} сом</b>`;
  return `${dayShort(t.d)}: замените «${esc(RM[t.prev].n)}» на «${esc(RM[t.id].n)}» <b class="num">−${fmt(t.save)} сом</b>`;
}
// Живая подсказка про лимит: только если меню не укладывается, и без того, что уже включено.
function capAdvice(cart){
  const cap = capVal(); if (!cap || cart.total <= cap) return '';
  const tips = capTips(), gen = [];
  if (SD && SD.keys.length > 1 && !state.split) gen.push(`<button type="button" class="link-btn herb" data-act="split" data-v="two">включить «Где дешевле»</button>`);
  if (state.mode !== 'eco') gen.push(`<button type="button" class="link-btn herb" data-act="tipEco">режим «Эконом»</button>`);
  gen.push(`<button type="button" class="link-btn herb" data-act="goSec" data-v="budget">поднять лимит</button>`);
  return `<div class="alert stack gap8"><b>Не укладываемся в лимит ${fmt(cap)} сом: не хватает ≈ ${fmt(cart.total - cap)} сом.</b>
    ${tips.length ? `<span>Чтобы уложиться в лимит:</span><ul class="tips">${tips.map(t => `<li><span>${tipLabel(t)}</span><button type="button" class="btn btn-soft btn-sm" data-act="${t.kind === 'snack' ? 'noSnack' : 'pick'}" data-v="${t.kind === 'snack' ? t.d : `${t.d}:${t.s}:${t.id}`}">Применить</button></li>`).join('')}</ul>` : ''}
    <div class="hint">Ещё можно: ${gen.join(', ')}.</div></div>`;
}
function viewMenu(){
  if (!state.plan) regenerate(false);
  if (ui.fill){ ui.fill = false; enforcePlan(); }
  const d = state.day, day = state.plan[d] || {}, p = state.people[0], tg = targets(p);
  const sv = servings(), cart = computeCart(), cap = capVal(), auto = autoProtOn();
  const tot = dayTotals(d, sv);
  const B = [['Ккал','',tot.k,tg.k,''],['Белки','белка',tot.p,tg.p,' г'],['Жиры','жиров',tot.f,tg.f,' г'],[big()?'Углеводы':'Углев.','углеводов',tot.c,tg.c,' г']];
  const off = (v, t) => t > 0 && Math.abs(v/t - 1) > .1;
  const bar = ([lbl, , v, target, unit]) => `<div class="bar-item ${off(v, target) ? 'off' : ''}"><div class="lbl"><span>${lbl}</span></div><div class="val num">${fmt(v)}<span class="hint"> / ${fmt(target)}${unit}</span></div><div class="bar"><i style="width:${clamp(v/target*100,0,100)}%"></i></div></div>`;
  const offs = B.filter(b => off(b[2], b[3])).map(([, gen, v, t, u]) => `${gen ? gen + ' ' : ''}${v > t ? 'больше' : 'меньше'} нормы на ${fmt(Math.abs(v - t))}${u || ' ккал'}`);
  const slots = SLOT_ORDER.filter(s => s in day);
  const name = p.name ? esc(p.name) : 'вас';
  const dt = addDays(parseIso(state.start), d);
  const ended = Math.round((parseIso(todayIso()) - parseIso(state.start))/864e5) > 6;
  const adds = (auto ? sv : servings(state.plan, state.lo, true)).filter(a => a.d === d && a.add && !a.bread);
  const ps = adds.length || tot.p < tg.p*.9 ? protSwap(d) : null;
  const prep = d < 6 ? Object.entries(state.plan[d+1]||{}).filter(([s,id]) => RM[id] && RM[id].prep && !(s === 'l' && state.lo[d+1])).map(([s,id]) => ({s, r:RM[id]})) : [];
  const dk = [0,1,2,3,4,5,6].map(i => dayTotals(i, sv).k);
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">${GOALS[p.goal].n} · ${weekRange()}</div><h1 class="title">Меню недели</h1></div></div>
      <button type="button" class="icon-btn" data-act="ask" data-v="regen" aria-label="Пересобрать всю неделю">${IC.refresh}</button></header>
    <div class="stack">
      ${state.dirty ? `<div class="warn stack gap8"><span>Настройки изменились. Обновим только то, что не подходит, ваши замены сохраним.</span><div class="row gap8 wrap"><button type="button" class="btn btn-primary btn-sm" data-act="update">Обновить меню</button><button type="button" class="btn btn-ghost btn-sm" data-act="ask" data-v="regen">Пересобрать неделю</button></div></div>` : ''}
      ${ended ? `<div class="warn stack gap8"><span>Эта неделя уже закончилась.</span><button type="button" class="btn btn-primary btn-sm" data-act="ask" data-v="newweek">Новая неделя с сегодняшнего дня</button></div>` : ''}
      ${diabAsk()}
      <section class="card stack gap12">
        <div class="budget-line"><div><div class="eyebrow">Бюджет на неделю · ${esc(cart.stores.map(storeName).join(' + '))}</div><div class="big-money num">≈ ${fmt(cart.total)}<small>сом</small></div></div>
          <div class="stat ta-r"><b class="num">${fmt(cart.total/7)}</b><small>сом в день</small></div></div>
        ${cap ? `<div class="meter ${cart.total>cap?'over':''}"><i style="width:${clamp(cart.total/cap*100,0,100)}%"></i></div><div class="hint num">Лимит ${fmt(cap)} сом · ${cart.total<=cap ? 'остаётся ≈ '+fmt(cap-cart.total)+' сом' : 'превышение ≈ '+fmt(cart.total-cap)+' сом'}</div>` : ''}
        ${cart.all > cart.total + 1 ? `<div class="hint num">Без того, что есть дома (≈ ${fmt(cart.all - cart.total)} сом)</div>` : ''}
      </section>
      ${capAdvice(cart)}
      <div class="days-wrap"><div class="days" role="group" aria-label="День недели, калории за день">${dk.map((k, i) => dayChip(i, d, k)).join('')}</div></div>
      <section class="card stack gap10">
        <div class="section-h m0"><h2 class="h2">${DAYS[dowOf(dt)]}, ${dayMonth(dt)}</h2><span class="hint">порции для ${name}</span></div>
        <div class="bars">${B.map(bar).join('')}</div>
        ${offs.length ? `<div class="bar-note num">${esc(offs.join(' · '))}</div>` : ''}
        ${adds.length || ps ? `<div class="addon"><b>Добрать белок:</b>
          ${ps ? ` лучше заменить «${esc(RM[ps.prev].n)}» на «${esc(RM[ps.id].n)}» <span class="hint">(+${fmt(ps.gain)} г белка)</span> <button type="button" class="btn btn-soft btn-sm mt6" data-act="pick" data-v="${ps.d}:${ps.s}:${ps.id}">Заменить</button>` : ''}
          ${adds.length ? `<div class="${ps ? 'mt6' : ''}">${ps ? 'Или добавка: ' : ''}${adds.map(a => `${state.family ? esc(personLabel(a.who[0].i)) + ': ' : ''}${esc(a.add.t)} <span class="hint">(≈ ${fmt(a.P)} г белка)</span>`).join('; ')}.</div>
          ${auto ? `<div class="hint">Уже в меню и корзине, порции блюд чуть уменьшили, чтобы калории остались в норме.</div>` : `<button type="button" class="btn btn-soft btn-sm mt6" data-act="autoProt">Добавлять автоматически</button>`}` : ''}</div>` : ''}
        ${prep.length ? prep.map(x => `<div class="prep"><b>Вечером:</b> ${esc(x.r.prep)}. <span class="hint">Завтра на ${SLOT_NAME[x.s].toLowerCase()}: ${esc(x.r.n)}</span></div>`).join('') : ''}
      </section>
      ${slots.map(s => mealCard(d, s, day[s], sv)).join('')}
      <p class="hint ta-c pv6">Нажмите «Заменить», если что-то не нравится. Корзина пересчитается сама.</p>
    </div>`;
}
function plateLine(x){
  if (!x) return '';
  const u = isSoup(x.r) ? 'мл' : 'г';
  if (x.who.length === 1 && !state.family) return `на тарелку ≈&nbsp;${fmt(plateG(x.r, x.who[0].m))}&nbsp;${u}`;
  return 'на тарелку: ' + x.who.map(w => `${esc(personLabel(w.i))} ≈&nbsp;${fmt(plateG(x.r, w.m))}&nbsp;${u}`).join(' · ');
}
function breadLine(list, r){
  if (!list.length) return '';
  const to = r && isSoup(r) ? 'к супу' : 'к блюду';
  if (list.length === 1 && !state.family) return `${esc(list[0].add.t)} ${to}`;
  return to + ': ' + list.map(b => `${esc(personLabel(b.who[0].i))} ${esc(b.add.t)}`).join(' · ');
}
function mealCard(d, s, id, sv){
  const r = RM[id];
  if (skipSlot(d, s)) return `<article class="meal empty-meal"><span class="slot">${SLOT_NAME[s]}</span><p class="hint">Перекус убран, чтобы уложиться в бюджет. Калории распределили по другим приёмам пищи.</p><div><button type="button" class="btn btn-ghost btn-sm" data-act="snackBack" data-v="${d}">Вернуть перекус</button></div></article>`;
  if (!r) return `<article class="meal empty-meal"><span class="slot">${SLOT_NAME[s]}</span><p class="hint">Нет подходящих блюд под ваши ограничения. Ослабьте фильтры в профиле.</p></article>`;
  const isLo = s === 'l' && state.lo[d], two = s === 'd' ? twoDay(d, sv) : null, prevTwo = isLo && d > 0 ? twoDay(d-1, sv) : null;
  const main = sv.find(x => x.d === d && x.s === s && !x.alt && !x.add), alts = sv.filter(x => x.d === d && x.s === s && x.alt);
  const breads = sv.filter(x => x.d === d && x.s === s && x.bread);
  const me = main && main.who.find(w => w.i === 0), m = me ? me.m : portion(r, s, personKcal(state.people[0]));
  const hm = main ? main.who.reduce((a,w) => a + w.m, 0) : 0, L = ML(), u = L.u, diab = !!state.health.diab;
  const carbs = diab ? `<span class="carb-hl">Углеводы <b>${fmt(r.C*m)}</b> г</span>` : `<span>${L.c} <b>${fmt(r.C*m)}</b>${u}</span>`;
  return `<article class="meal ${isLo?'lo':''}">
    <div class="meal-top"><span class="slot">${SLOT_NAME[s]}</span><span class="tags">${isLo ? '<span class="tag">разогреть</span>' : `<span class="tag">${r.time} мин</span>${diffPill(r)}`}</span></div>
    <h3>${isLo ? 'Остатки: ' : ''}${esc(r.n)}</h3>
    ${isLo ? `<p class="hint">Готовить не нужно: ${prevTwo ? `${fmtD(prevTwo.tom)} порции из вчерашнего ужина` : 'это вчерашний ужин, приготовленный с запасом'}, просто разогрейте.</p>` : ''}
    ${two ? `<p class="pill-row"><span class="pill d-easy">Готовим на 2 дня</span> <span class="hint num">${twoDayText(two)}</span></p>` : ''}
    <div class="facts num"><span><b>${fmt(r.kcal*m)}</b> ккал</span><span>${L.p} <b>${fmt(r.P*m)}</b>${u}</span><span>${L.f} <b>${fmt(r.F*m)}</b>${u}</span>${carbs}${eaters().length>1 && hm ? `<span>${fmt1(hm)} ${portionsWord(hm)} на всех</span>` : ''}${isLo ? '' : `<span>≈ <b>${fmt(servingCost(r)*(two ? two.total : hm||m))}</b> сом</span>`}</div>
    ${main ? `<div class="plate num">${plateLine(main)}</div>` : ''}
    ${breads.length ? `<div class="plate num bread-line">${breadLine(breads, r)}</div>` : ''}
    ${alts.map(a => `<div class="alt-line"><span><b>${esc(personLabel(a.who[0].i))}</b> ест: ${esc(a.r.n)} <span class="hint">(≈ ${fmt(plateG(a.r, a.who[0].m))} ${isSoup(a.r) ? 'мл' : 'г'}, не ест то, что в основном блюде)</span></span><button type="button" class="link-btn herb" data-act="openAlt" data-v="${d}:${s}:${a.who[0].i}">Рецепт</button></div>`).join('')}
    <div class="meal-actions"><button type="button" class="btn btn-soft btn-sm" data-act="open" data-v="${d}:${s}">${IC.book}Рецепт</button><button type="button" class="btn btn-ghost btn-sm" data-act="swap" data-v="${d}:${s}">${IC.swap}Заменить</button></div>
  </article>`;
}
// Зимой подсказываем, чем заменить дорогие тепличные овощи (с кнопкой, если есть подходящее «зимнее» блюдо).
function summerHints(cart){
  if (!isWinter() || !state.plan) return '';
  const S = summerIds(), list = cart.items.filter(x => S.has(x.id) && !x.home).sort((a, b) => b.cost - a.cost).slice(0, 2);
  if (!list.length) return '';
  const G = genSetup(state.mode);
  return list.map(x => {
    let act = null;
    outer: for (let d = 0; d < 7; d++) for (const s of SLOT_ORDER){
      const r = RM[state.plan[d] && state.plan[d][s]]; if (!r || !r.ing[x.id] || (s === 'l' && state.lo[d]) || skipSlot(d, s)) continue;
      const loNext = s === 'd' && d < 6 && state.lo[d+1];
      const o = replaceOptions(d, s, G).find(c => !Object.keys(c.ing).some(id => S.has(id)) && (!loNext || keepsOf(c) >= 2));
      if (o){ act = {d, s, id:o.id, prev:r}; break outer; }
    }
    const nm = shortName(x.id), pl = /[ыи]$/.test(nm);
    return `<div class="tip-card"><span><b>${esc(nm)} зимой ${pl ? 'дорогие' : 'дорогой'}</b> — можно заменить: ${WINTER_ALT}.</span>${act ? `<button type="button" class="btn btn-soft btn-sm tip-btn" data-act="pick" data-v="${act.d}:${act.s}:${act.id}">${dayShort(act.d)}: «${esc(act.prev.n)}» → «${esc(RM[act.id].n)}»</button>` : ''}</div>`;
  }).join('');
}
function viewCart(){
  if (!state.plan) regenerate(false);
  const cart = computeCart(), cap = capVal(), multi = cart.stores.length > 1;
  const text = shareText(cart);
  const catGroups = list => { const g = {}; list.forEach(x => (g[x.i.cat] = g[x.i.cat] || []).push(x)); return CAT_ORDER.filter(c => g[c]).map(c => `<div class="group"><div class="group-h">${CATS[c]}<span>${fmt(g[c].filter(x=>!x.home).reduce((s,x)=>s+x.cost,0))} сом</span></div><div class="items">${g[c].map(itemRow).join('')}</div></div>`).join(''); };
  const known = cart.items.filter(x => x.store), approx = cart.items.filter(x => !x.store);
  const pn = cart.items.filter(x => x.pantry);
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">${cart.bought} из ${cart.items.length} отмечено</div><h1 class="title">Корзина</h1></div></div>
    ${cart.bought > pn.length ? `<button type="button" class="btn btn-ghost btn-sm" data-act="ask" data-v="clearMarks">Сбросить отметки</button>` : ''}</header>
    <div class="stack">
      <section class="card stack gap10">
        ${SD ? seg('split', [['one','Один магазин'],['two','Где дешевле']], state.split ? 'two' : 'one') : '<span class="label m0">Магазин</span>'}
        ${storePicker()}
      </section>
      ${capAdvice(cart)}
      ${summerHints(cart)}
      <section class="receipt">
        <div class="rc-head"><span class="rc-store">${esc(cart.stores.map(storeName).join(' + '))}</span><span class="rc-meta">${weekRange()} · 7 дней · ${eaters().length} чел.</span></div>
        <div class="rc-total"><span class="lbl">К ОПЛАТЕ ≈</span><span class="sum">${fmt(cart.pay)} сом</span></div>
        ${multi ? cart.stores.map(st => `<div class="rc-sub"><span>${esc(storeName(st))}</span><span>${fmt(cart.sub[st]||0)} сом</span></div>`).join('') : ''}
        ${cart.sub.approx && SD ? `<div class="rc-sub"><span>Цена примерная</span><span>${fmt(cart.sub.approx)} сом</span></div>` : ''}
        ${cart.all - cart.pay > .5 ? `<div class="rc-sub"><span>Есть дома</span><span>−${fmt(cart.all-cart.pay)} сом</span></div>` : ''}
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
      ${pn.length ? `<div class="note">Обычно есть дома: ${esc(pn.map(x => pantryName(x.id)).join(', '))} — не учтены в сумме. Если нужно купить, нажмите «купить» у продукта.</div>` : ''}
      ${multi ? cart.stores.map(st => { const list = known.filter(x => x.store === st); return list.length ? `<section class="store-sec"><div class="store-h"><h2 class="h2">${esc(storeName(st))}</h2><span class="mono">${fmt(cart.sub[st]||0)} сом</span></div>${catGroups(list)}</section>` : ''; }).join('') : catGroups(known)}
      ${approx.length ? `<section class="store-sec"><div class="store-h approx-h"><h2 class="h2">${APPROX_T}</h2><span class="mono">${fmt(cart.sub.approx||0)} сом</span></div><p class="hint mt6">${multi ? 'Этих продуктов нет в каталогах выбранных магазинов.' : 'Этого продукта нет в каталоге магазина.'} Посчитали по средней цене по Бишкеку.</p>${catGroups(approx)}</section>` : ''}
      <p class="hint pv10">Считаем целыми упаковками, остаток пригодится на следующей неделе. Нажмите на цену, чтобы указать свою. «Есть дома» убирает продукт из суммы.</p>
    </div>`;
}
function itemRow(x){
  const editing = ui.editing === x.o.key, open = !!ui.open[x.id], left = leftText(x), it = x.o.item, url = it && safeUrl(it.url);
  const n = x.dishes.length;
  const homeLbl = x.home ? (x.pantry ? 'купить' : '✓ есть дома') : 'есть дома';
  return `<div class="item ${x.bought?'bought':''} ${x.home?'home':''}">
    <button type="button" class="check" data-act="buy" data-v="${x.id}" aria-label="Отметить: ${esc(x.i.n)}" ${pressed(x.bought)}><i>${IC.check}</i></button>
    <div class="minw0">
      <div class="item-name">${esc(x.i.n)}</div>
      ${it ? `<div class="item-store">${esc(it.name)}${url ? ` <a class="ext-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть товар на сайте магазина">${IC.ext}</a>` : ''}</div>` : ''}
      <div class="item-qty num">${qtyText(x)}${needText(x)?' · '+needText(x):''}</div>
      <div class="item-qty num">${unitPriceText(x)}${left ? ` · <span class="left">останется ≈ ${left}</span>` : ''}</div>
      ${x.o.avg ? '<div class="item-note">нет в каталоге, средняя цена</div>' : it && it.approx ? '<div class="item-note">цена примерная</div>' : ''}
      ${n ? `<button type="button" class="for-btn" data-act="more" data-v="${x.id}" aria-expanded="${open}">${open ? 'для: ' + esc(x.dishes.join(', ')) : `для ${n} ${plural(n,'блюда','блюд','блюд')}`} ${IC.chev}</button>` : ''}
    </div>
    <div class="item-right"><button type="button" class="price-btn ${x.o.custom?'custom':''}" data-act="editprice" data-v="${esc(x.o.key)}" aria-label="Изменить цену: ${fmt(x.cost)} сом">${fmt(x.cost)}</button>
      <button type="button" class="home-btn ${x.pantry ? 'buy' : ''}" data-act="home" data-v="${x.id}" ${pressed(x.home)} ${x.pantry ? 'aria-label="Купить: добавить в сумму"' : ''}>${homeLbl}</button></div>
    ${editing ? `<div class="edit-row"><label class="hint" for="price-${esc(x.o.key)}">Цена, ${x.o.size==='w' ? (isMl(x.id) ? 'сом/л' : 'сом/кг') : 'сом за упаковку'}</label><input class="input num" id="price-${esc(x.o.key)}" type="number" inputmode="decimal" min="0" data-price="${esc(x.o.key)}" value="${Math.round(x.o.price)}">
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
        ${fc ? `<div class="note num"><b>${fc.rate}</b>${fc.goal ? `, ${fc.goal}` : ''}.<br>${fc.basis}</div>` : ''}
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
const SECS = [['about','О вас',secAbout],['goal','Цель и вес',secGoal],['family','Кто ест',secFamily],['prefs','Пожелания и здоровье',secPrefs],['allergy','Аллергии и запреты',secAllergy],['budget','Магазин и бюджет',secBudget],['access','Удобство',secAccess],['install','Поставить на телефон',secInstall]];
function viewProfile(){
  return `<header class="top"><div class="brand"><span class="logo">${IC.logo}</span><div><div class="eyebrow">Всё хранится на этом телефоне</div><h1 class="title">Профиль</h1></div></div></header>
    <div class="stack">
      ${SECS.map(([k,t,f]) => { const open = state.openSec === k; return `<section class="card acc" id="acc-${k}"><h2 class="acc-h"><button type="button" class="acc-btn" data-act="sec" data-v="${k}" aria-expanded="${open}" ${open?`aria-controls="sec-${k}"`:''}><span class="h2">${t}</span>${IC.chev}</button></h2>${open ? `<div class="acc-body" id="sec-${k}">${f()}</div>` : ''}</section>`; }).join('')}
      ${secReset()}
    </div>
    ${state.dirty ? `<div class="ob-foot above-tabs"><div class="inner"><button type="button" class="btn btn-ghost" data-act="ask" data-v="regen">Пересобрать неделю</button><button type="button" class="btn btn-primary" data-act="update">Обновить меню</button></div></div>` : ''}`;
}
function sheetWrap(label, inner){ return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}" data-stop><div class="grab"></div>${inner}</div></div>`; }
function viewSheet(){
  if (!ui.sheet) return '';
  const {d, s, alt} = ui.sheet, sv = servings();
  let x = alt != null ? sv.find(y => y.d === d && y.s === s && y.alt && y.who[0].i === alt) : sv.find(y => y.d === d && y.s === s && !y.alt && !y.add);
  const r = x ? x.r : RM[state.plan?.[d]?.[s]]; if (!r) return '';
  const isLo = s === 'l' && state.lo[d] && alt == null, two = s === 'd' && alt == null ? twoDay(d, sv) : null, prevTwo = isLo && d > 0 ? twoDay(d-1, sv) : null;
  // Сколько порций готовим: те же числа, что в карточке ужина и в «Остатках» завтра.
  const hm = two ? two.total : r1(x ? x.who.reduce((a,w) => a + w.m, 0) : 1) || 1;
  const me = x && x.who.find(w => w.i === 0), m = me ? me.m : (x ? x.who[0].m : 1), L = ML(), dt = addDays(parseIso(state.start), d);
  const many = eaters().length > 1 || !!two;
  const breads = alt == null ? sv.filter(y => y.d === d && y.s === s && y.bread) : sv.filter(y => y.d === d && y.s === s && y.bread && y.who[0].i === alt);
  const bg = breads.reduce((a, b) => a + b.add.g, 0);
  return sheetWrap(r.n, `
    <div class="row-between start"><div class="stack gap4"><span class="slot">${SLOT_NAME[s]} · ${DAYS[dowOf(dt)]}${alt != null ? ' · для: ' + esc(personLabel(alt)) : ''}</span><h2 class="title t21">${isLo ? 'Остатки: ' : ''}${esc(r.n)}</h2></div>
      <button type="button" class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${IC.close}</button></div>
    <div class="facts num hint sheet-facts"><span>${r.time} мин</span>${diffPill(r)}<span>${fmt(r.kcal*m)} ккал на ${me ? 'вашу ' : ''}порцию</span><span>${L.p} ${fmt(r.P*m)}${L.u} · ${L.f} ${fmt(r.F*m)}${L.u} · ${state.health.diab ? 'Углеводы' : L.c} ${fmt(r.C*m)}${state.health.diab ? ' г' : L.u}</span></div>
    ${x ? `<div class="plate num">${plateLine(x)}</div>` : ''}
    ${breads.length ? `<div class="plate num bread-line">${breadLine(breads, r)}</div>` : ''}
    ${isLo ? `<div class="note mt10">Это вчерашний ужин, приготовленный с запасом${prevTwo ? `: ${fmtD(prevTwo.tom)} порции` : ''}. Просто разогрейте.</div>` : ''}
    ${two ? `<div class="note mt10 num"><span class="pill d-easy">Готовим на 2 дня</span> <b>${twoDayText(two)}</b>. Продукты ниже уже с запасом на завтрашний обед.</div>` : ''}
    ${r.prep ? `<div class="prep mt10"><b>С вечера:</b> ${esc(r.prep)}</div>` : ''}
    ${keepsOf(r) >= 1 ? `<p class="hint mt10">Хранится в холодильнике до ${keepsOf(r)} ${plural(keepsOf(r),'дня','дней','дней')}.</p>` : ''}
    <div class="section-h mt16"><h3 class="h2">Продукты</h3><span class="hint num">${many ? `на всех, ${fmtD(hm)} порции` : 'ваша порция'}</span></div>
    <div class="ing-list">${Object.entries(r.ing).filter(([id])=>ING[id]).map(([id,g])=>`<div><span>${esc(ING[id].n)}</span><span>${amountText(id, g*hm)}</span></div>`).join('')}${bg && ING[breads[0].add.id] ? `<div><span>${esc(ING[breads[0].add.id].n)} (${isSoup(r) ? 'к супу' : 'к блюду'})</span><span>${amountText(breads[0].add.id, bg)}</span></div>` : ''}</div>
    <div class="section-h mt20"><h3 class="h2">Как готовить</h3>${many ? `<span class="hint num">на ${fmtD(hm)} порции</span>` : ''}</div>
    <ol class="steps">${(Array.isArray(r.steps) ? r.steps : []).map(t=>`<li><span>${stepText(t, hm)}</span></li>`).join('')}</ol>
    ${alt == null ? `<div class="mt20"><button type="button" class="btn btn-ghost btn-block" data-act="swap" data-v="${d}:${s}">${IC.swap}Заменить на другое блюдо</button></div>` : ''}`);
}
function viewReplace(){
  if (!ui.replace) return '';
  const G = genSetup(state.mode), {d, s} = ui.replace, cur = RM[state.plan[d][s]], opts = replaceOptions(d, s, G), k0 = personKcal(state.people[0]), L = ML();
  const cm = cur ? portion(cur, s, k0) : 0, cP = cur ? cur.P*cm : 0, cC = cur ? cur.C*cm : 0, cCost = cur ? slotCost(cur, s, G) : 0, diab = !!state.health.diab;
  const diffs = (r, m) => {
    const out = [], dP = r.P*m - cP, dC = r.C*m - cC, dS = slotCost(r, s, G) - cCost;
    if (!cur) return '';
    if (Math.abs(dP) >= 3) out.push(`белка ${dP > 0 ? '+' : '−'}${fmt(Math.abs(dP))} г`);
    if (diab && Math.abs(dC) >= 5) out.push(`углеводов ${dC > 0 ? '+' : '−'}${fmt(Math.abs(dC))} г`);
    out.push(Math.abs(dS) < 5 ? 'та же цена' : dS > 0 ? `дороже на ${fmt(dS)} сом` : `дешевле на ${fmt(-dS)} сом`);
    return `<span class="diff num">${out.join(' · ')}</span>`;
  };
  return sheetWrap('Заменить блюдо', `
    <div class="row-between start"><div class="stack gap4"><span class="slot">${SLOT_NAME[s]} · заменить</span><h2 class="title t21">${cur ? esc(cur.n) : 'Выберите блюдо'}</h2></div>
      <button type="button" class="icon-btn" data-act="closeSheet" aria-label="Закрыть">${IC.close}</button></div>
    <p class="hint mt6">Выберите, на что заменить. Разница — по сравнению с текущим блюдом. Корзина пересчитается сама.</p>
    <div class="opt-list">${opts.length ? opts.map(r => { const m = portion(r, s, k0); return `<button type="button" class="opt" data-act="pick" data-v="${d}:${s}:${r.id}">
      <b>${esc(r.n)}</b>
      ${diffs(r, m)}
      <span class="facts num"><span><b>${fmt(r.kcal*m)}</b> ккал</span><span>${L.p} <b>${fmt(r.P*m)}</b>${big()?' г':''}</span>${diab ? `<span>Углеводы <b>${fmt(r.C*m)}</b> г</span>` : ''}<span>≈ <b>${fmt(slotCost(r, s, G))}</b> сом${eaters().length>1?' на всех':''}</span><span>${r.time} мин</span>${diffPill(r)}</span></button>`; }).join('') : '<p class="note">Других подходящих блюд нет. Ослабьте ограничения в профиле.</p>'}</div>`);
}
const CONFIRMS = {
  regen:{t:'Пересобрать неделю?', d:'Подберём все блюда заново. Ваши ручные замены пропадут. Отметки в корзине останутся у продуктов, которые снова понадобятся. Профиль и записи веса не удаляются.', ok:'Пересобрать',
    fn:() => { regenerate(true); state.tab = 'menu'; toast('Неделя пересобрана'); }},
  newweek:{t:'Начать новую неделю?', d:'Соберём меню на 7 дней с сегодняшнего дня. Отметки в корзине сбросим.', ok:'Начать',
    fn:() => { state.start = todayIso(); state.day = 0; state.cart = {}; regenerate(true); toast('Новая неделя собрана'); }},
  clearMarks:{t:'Сбросить отметки?', d:'Снимем все галочки «куплено» и «есть дома». Чай, масло и другое, что обычно есть дома, снова не будет учтено в сумме.', ok:'Сбросить',
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
