// Экраны и тексты: node tools/tests/ui.test.js
const { load, check, done } = require('./harness');
const A = load(), ev = A.ev;
const fresh = mut => { ev('state = Object.assign(defaults(), {onboarded:true, goalSeen:true}); resetCaches();'); if (mut) ev(mut); ev('resetCaches()'); };
const family4 = `state.family = true; state.people = [
  newPerson('adult', {name:'Айгерим', weight:68, goal:'lose'}), newPerson('adult', {name:'Марат', sex:'m', age:38, height:178, weight:85}),
  newPerson('child', {name:'Айару', sex:'f', age:12}), newPerson('child', {name:'Арсен', sex:'m', age:6})];`;

// 1. Порции по-русски
{
  const P = (n, acc) => ev(`portionsText(${n}, ${!!acc})`);
  const cases = [[9, '9 порций'], [9.0, '9 порций'], [8.96, '9 порций'], [4.2, '4,2 порции'], [4.24, '4,2 порции'], [1, '1 порция'], [2, '2 порции'],
    [5, '5 порций'], [11, '11 порций'], [21, '21 порция'], [22, '22 порции'], [0.5, '0,5 порции'], [1.5, '1,5 порции']];
  for (const [n, want] of cases) check(`portionsText(${n}) = «${want}»`, P(n) === want, P(n));
  check('винительный: «на 1 порцию»', P(1, true) === '1 порцию', P(1, true));
  check('винительный: «на 21 порцию»', P(21, true) === '21 порцию', P(21, true));
  check('винительный: «на 5 порций»', P(5, true) === '5 порций', P(5, true));
  check('винительный: дробное «4,2 порции»', P(4.2, true) === '4,2 порции', P(4.2, true));
}

// 2. Переключатель «чьи калории»: имена, выбор, запоминание
{
  fresh(family4); ev('regenerate(true)');
  const html = ev('viewMenu()');
  const sw = (/<div class="chips person-sw"[\s\S]*?<\/div>/.exec(html) || [''])[0];
  check('переключатель есть в семье', !!sw);
  for (const n of ['Айгерим', 'Марат', 'Айару', 'Арсен']) check('в переключателе есть ' + n, sw.includes(n + '</button>'));
  check('по умолчанию выбран первый человек', /data-v="0" aria-pressed="true"/.test(sw));
  ev("ACT.viewPerson('2')");
  check('выбор сохраняется в state.viewPerson', ev('state.viewPerson') === 2);
  const h2 = ev('viewMenu()');
  check('выбранная кнопка нажата', /data-act="viewPerson" data-v="2" aria-pressed="true"/.test(h2));
  check('подпись дня — для выбранного человека', h2.includes('порции: Айару'));
  const kT = ev('fmt(targets(state.people[2]).k)');
  check('цель по калориям — норма выбранного человека', h2.includes(' / ' + kT + '</span>'), kT);
  const k2 = ev('fmt(dayTotals(state.day, servings(), 2).k)'), k0 = ev('fmt(dayTotals(state.day, servings(), 0).k)');
  check('ккал за день — выбранного человека', h2.includes(`<div class="val num">${k2}<`) && (k2 === k0 || !h2.includes(`<div class="val num">${k0}<`)), [k2, k0]);
  ev("state.viewPerson = 9"); check('индекс вне семьи — первый человек', ev('viewPersonIdx()') === 0);
  ev("state.viewPerson = 'x'"); check('мусор в viewPerson — первый человек', ev('viewPersonIdx()') === 0);
  fresh(); ev('regenerate(true)');
  check('один человек — переключателя нет', !ev('viewMenu()').includes('person-sw'));
}

// 3. Техника на кухне
{
  fresh();
  check('по умолчанию блендер и духовка есть', ev('JSON.stringify(equipState())') === '{"blender":true,"oven":true}');
  const prefs = ev('secPrefs()');
  check('переключатель «Есть блендер»', prefs.includes('Есть блендер') && /data-act="equip" data-v="blender" aria-pressed="true"/.test(prefs));
  check('переключатель «Есть духовка»', prefs.includes('Есть духовка') && /data-act="equip" data-v="oven" aria-pressed="true"/.test(prefs));
  ev("ACT.equip('blender')"); check('выключили блендер', ev('state.equip.blender') === false && ev('state.equip.oven') === true);
  check('кнопка блендера показывает «выкл»', /data-act="equip" data-v="blender" aria-pressed="false"/.test(ev('secPrefs()')));
  ev("ACT.equip('blender')"); check('включили блендер обратно', ev('state.equip.blender') === true);
  ev("ACT.equip('oven')"); check('выключили духовку', ev('state.equip.oven') === false);
  ev("ACT.equip('toaster')"); check('неизвестная техника не добавляется', ev("'toaster' in state.equip") === false);
  fresh('state.onboarded = true; regenerate(true);'); ev("ACT.equip('oven')");
  check('смена техники помечает меню к обновлению', ev('state.dirty') === true && ev("state.dirtyKinds.includes('filter')"));
}

// 4. Совет для большой партии
{
  fresh();
  const fry = ev("RECIPES.find(r => fryingDish(r) && !r.batch).id"), calm = ev("(RECIPES.find(r => !fryingDish(r) && !r.batch) || {}).id");
  check('есть жареное блюдо для проверки', !!fry);
  check('от 6 порций — общий совет для жарки', ev(`sheetBatchTip(RM['${fry}'], 6)`) === ev('SHEET_BATCH_FRY'));
  check('меньше 6 порций — без совета', ev(`sheetBatchTip(RM['${fry}'], 5.9)`) === '');
  if (calm) check('не жареное без batch — без совета', ev(`sheetBatchTip(RM['${calm}'], 9)`) === '');
  ev(`RM['${fry}'].batch = 'Готовьте в казане 5 л'`);
  check('recipe.batch важнее общего совета', ev(`sheetBatchTip(RM['${fry}'], 6.2)`) === 'Готовьте в казане 5 л');
  ev(`delete RM['${fry}'].batch`);
  // В листе рецепта: семья + «на 2 дня» → больше 6 порций
  fresh(family4 + ' state.cook2 = true;'); ev('regenerate(true)');
  const dd = ev('state.lo.indexOf(true) - 1');
  check('есть ужин на 2 дня', dd >= 0);
  if (dd >= 0){
    const id = ev(`state.plan[${dd}].d`), hm = ev(`twoDay(${dd}, servings()).total`);
    ev(`RM['${id}'].batch = 'Больше 6 порций — готовьте в казане 5 л и обжаривайте в 2 захода'`);
    ev(`ui.sheet = {d:${dd}, s:'d'}`); const sh = ev('viewSheet()');
    check('в рецепте виден совет из batch (≥ 6 порций)', hm >= 6 && sh.includes('готовьте в казане 5 л'), hm);
    check('в рецепте порции без «,0» и по-русски', !/\d,0 порци/.test(sh) && sh.includes(ev(`portionsText(${hm})`)), hm);
    ev(`delete RM['${id}'].batch; ui.sheet = null`);
    // Лист замены: ужин на 2 дня — цены на одной основе
    ev(`ui.replace = {d:${dd}, s:'d'}`); const rp = ev('viewReplace()'); ev('ui.replace = null');
    check('лист замены: метка «На 2 дня»', rp.includes('На 2 дня') && rp.includes('за оба дня'));
    check('лист замены: у вариантов указан срок цены', /сом на 2 дня|сом за 1 день/.test(rp.replace(/<[^>]+>/g, '')));
  }
  fresh(); ev('regenerate(true)'); ev("ui.sheet = {d:0, s:'l'}");
  check('один человек — совета нет', !ev('viewSheet()').includes('batch-tip')); ev('ui.sheet = null');
}

// 5. Поля: значение не теряется при перерисовке, лимит сохраняется
{
  fresh('state.onboarded = false; state.step = 5;');
  ev(`commitBind({dataset:{bind:'cap'}, value:'4000', type:'number', tagName:'INPUT'})`);
  check('лимит сохраняется при commitBind', ev('state.cap') === 4000);
  check('повторный commit без изменений не трогает состояние', ev(`commitBind({dataset:{bind:'cap', saved:'4000'}, value:'4000', type:'number', tagName:'INPUT'})`) === false);
  fresh(family4); ev(`commitBind({dataset:{bind:'p.1.weight'}, value:'90', type:'number', tagName:'INPUT'})`);
  check('вес человека сохраняется', ev('state.people[1].weight') === 90);
  const fam = ev('secFamily()');
  check('калории в карточке и итог «Едят» помечены для живого обновления', fam.includes('id="live-pk1"') && fam.includes('id="live-tot"'));
  check('liveKcal без DOM не падает', (() => { try { ev('liveKcal()'); return true; } catch (e) { return false; } })());
}

// 6. Онбординг: шапка переносит кнопки, а не уходит за край
{
  fresh('state.onboarded = false; state.step = 0;');
  const ob = ev('viewOnboarding()');
  check('шапка онбординга с переносом', ob.includes('row-between ob-top') && ob.includes('ob-ctrl'));
  check('«Пример» на первом шаге', ob.includes('data-act="demo"'));
}
done('ui');
