// Прогон логики без браузера: заглушки DOM, разные сценарии и проверки.
// Тестовые цены магазинов: PRICES=tools/fixtures/prices.sample.js node tools/test.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const el=()=>({innerHTML:'',className:'',hidden:false,style:{},setAttribute(){},appendChild(){},children:[]});
const ctx={console,Math,JSON,Date,Intl,setTimeout,clearTimeout,
  document:{getElementById:el,createElement:el,body:el(),addEventListener(){},querySelectorAll:()=>[],activeElement:null},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},window:{scrollTo(){},scrollY:0},navigator:{}};
vm.createContext(ctx);
const rd=f=>{const p=path.isAbsolute(f)?f:path.join(root,f);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):''};
const pricesFile=process.env.PRICES||'src/prices.js';
const code=[rd('src/data.js'),rd(pricesFile),rd('src/app.js'),rd('src/progress.js')].join('\n')+
`\n;globalThis.T={get state(){return state},set state(v){state=v},get SD(){return SD},defaults,migrate,generatePlan,computeCart,servings,addonsFrom,pool,poolFor,RM,ING,RECIPES,
viewMenu,viewCart,viewProfile,viewProgress,viewOnboarding,viewSheet,viewReplace,viewConfirm,STEPS,SECS,ui,ACT,regenerate,swapMeal,enforcePlan,smartUpdate,replaceOptions,pickReplace,
personKcal,targets,filterCtx,resetCaches,applyLivePrices,isWk,keepsOf,hasF,honeyCentred,diffOf,QUICK_LIM,shareText,qtyText,render,genSetup,activeStores,buyIn};`;
vm.runInContext(code,ctx);
const T=ctx.T;
let fails=0,checks=0;
const ok=(c,msg)=>{checks++;if(!c){fails++;console.log('  FAIL:',msg);}};
const ids=plan=>plan.flatMap(d=>Object.values(d)).filter(Boolean);
const fresh=mut=>{T.state=Object.assign(T.defaults(),{onboarded:true,goalSeen:true});T.resetCaches();mut&&mut(T.state);T.resetCaches();};
function renderAll(){
  for(const tab of ['menu','cart','progress','profile']){T.state.tab=tab;T.render();}
  T.state.tab='menu';
  T.SECS.forEach(([k])=>{T.state.openSec=k;T.viewProfile();});
  const ob=T.state.onboarded;T.state.onboarded=false;T.STEPS.forEach((s,i)=>{T.state.step=i;T.viewOnboarding()});T.state.onboarded=ob;
  T.ui.sheet={d:0,s:'l'};T.viewSheet();T.ui.sheet=null;
  T.ui.replace={d:1,s:'d'};T.viewReplace();T.ui.replace=null;
  for(const c of ['regen','clearMarks','reset','newweek']){T.ui.confirm=c;T.viewConfirm();}T.ui.confirm=null;
}
function variety(plan,lo){ // соседние дни и не больше 2 раз
  const cnt={};let near=0;
  plan.forEach((day,d)=>{for(const s in day){const id=day[s];if(!id||(s==='l'&&lo[d]))continue;cnt[id]=(cnt[id]||0)+1;
    const nx=plan[d+1];if(nx)for(const s2 in nx){if(nx[s2]===id&&!(s2==='l'&&lo[d+1]))near++;}}});
  return {max:Math.max(0,...Object.values(cnt)),near};
}
const dayProt=(plan,lo)=>{const sv=T.servings(plan,lo,false);return plan.map((_,d)=>sv.filter(x=>x.d===d).reduce((a,x)=>a+x.who.filter(w=>w.i===0).reduce((b,w)=>b+x.r.P*w.m,0),0));};
function run(name,mut){
  fresh(mut);
  const t0=Date.now();T.regenerate(true);const ms=Date.now()-t0;
  const c=T.computeCart();
  const plan=T.state.plan,empty=plan.flatMap(d=>Object.values(d)).filter(x=>!x).length,uniq=new Set(ids(plan)).size;
  renderAll();
  const v=variety(plan,T.state.lo);
  console.log(name.padEnd(28),'итого',Math.round(c.total),'сом | позиций',c.items.length,'| пустых',empty,'| разных',uniq,'| макс.повт',v.max,'| соседних',v.near,'|',ms+'мс',T.state.note?'| NOTE':'');
  return {c,ms,v,plan};
}
console.log('Цены магазинов:',T.SD?`есть (${T.SD.keys.join(', ')}) из ${pricesFile}`:'нет, средние');

console.log('\n== Базовые сценарии ==');
let maxMs=0;
const R=(n,m)=>{const r=run(n,m);maxMs=Math.max(maxMs,r.ms);return r;};
R('по умолчанию');
for(const m of ['eco','opt','comfort']) R('режим '+m,s=>s.mode=m);
R('мужчина, набор',s=>{Object.assign(s.people[0],{sex:'m',weight:80,height:182,goal:'gain'});s.macro='mass'});
R('семья 2+1',s=>{s.family=true;s.people.push({id:'a',kind:'adult',sex:'m',age:35,height:178,weight:85,act:1.55,goal:'keep',dislikes:[]},{id:'b',kind:'child',sex:'f',age:7,dislikes:[]})});
R('вег+глютен+молоко',s=>{s.diet='veg';s.allergies=['gluten','dairy']});
R('без мяса+быстро+3 приёма',s=>{s.diet='pesc';s.quick='always';s.meals=3});
R('много запретов',s=>{s.allergies=['egg','fish','nuts','legume'];s.dislikes=['mutton','beef','mushrooms'];s.customEx='чеснок, лук'});

console.log('\n== Аллергия: орехи и арахис ==');
fresh(s=>{s.allergies=['nuts']});T.regenerate(true);
{const bad=ids(T.state.plan).filter(id=>Object.keys(T.RM[id].ing).some(i=>(T.ING[i].t||[]).some(t=>t==='nuts'||t==='peanut')));
ok(bad.length===0,'в меню блюда с орехами/арахисом: '+bad.join(','));
ok(!T.pool('s').some(r=>r.ing.peanut_butter),'перекусы с арахисовой пастой не исключены');
const m=T.migrate({v:1,onboarded:true,allergies:['peanut','nuts','egg'],quick:true,store:'frunze',people:[{id:'x',kind:'adult',sex:'f',age:30,height:165,weight:70,act:1.375,goal:'lose'}],plan:null});
ok(JSON.stringify(m.allergies)==='["nuts","egg"]','миграция peanut -> nuts: '+JSON.stringify(m.allergies));
ok(m.quick==='always','миграция quick true -> always');
ok(m.store==='asia','миграция frunze -> asia');
console.log('  ok');}

console.log('\n== Мгновенная замена при новом запрете ==');
fresh();T.regenerate(true);
{const before=JSON.parse(JSON.stringify(T.state.plan));const chick=new Set(['chicken_breast','chicken_thigh','chicken_leg']);
 const hit=[];before.forEach((d,i)=>{for(const s in d){const r=T.RM[d[s]];if(r&&Object.keys(r.ing).some(x=>chick.has(x)))hit.push(i+s);}});
 T.ACT.dislike('chicken');
 const after=T.state.plan;let changed=[];after.forEach((d,i)=>{for(const s in d)if(d[s]!==before[i][s])changed.push(i+s);});
 ok(!ids(after).some(id=>Object.keys(T.RM[id].ing).some(x=>chick.has(x))),'курица осталась в меню');
 ok(changed.every(k=>hit.includes(k)||k.endsWith('l')),'заменены лишние слоты: '+changed.filter(k=>!hit.includes(k)).join(','));
 ok(!T.state.dirty,'после запрета меню не должно ждать «Обновить»');
 console.log('  блюд с курицей',hit.length,'| заменено',changed.length);}

console.log('\n== Здоровье ==');
fresh(s=>{s.health={diab:true,bp:true}});T.regenerate(true);
{const pl=T.state.plan;
 ok(!ids(pl).some(id=>T.hasF(T.RM[id],'sweet')||T.honeyCentred(T.RM[id])),'диабет: сладкое/мёд в меню');
 ok(!ids(pl).some(id=>T.hasF(T.RM[id],'salty')),'давление: солёное в меню');
 ok(!pl.some(d=>d.d&&T.hasF(T.RM[d.d],'heavy')),'тяжёлое на ужин при флаге здоровья');
 const wf=ids(pl).filter(id=>T.hasF(T.RM[id],'whiteflour')).length;console.log('  блюд с белой мукой',wf,'| жирных/жареных',ids(pl).filter(id=>T.hasF(T.RM[id],'fatty')||T.hasF(T.RM[id],'fried')).length);}
for(let seed=0;seed<8;seed++){fresh(s=>{s.seed=seed*7919;s.mode=['eco','opt','comfort'][seed%3]});T.state.seed=seed*7919;T.regenerate(false);
 ok(!T.state.plan.some(d=>Object.values(d).filter(id=>id&&T.hasF(T.RM[id],'heavy')).length>1),'два тяжёлых блюда в один день (seed '+seed+')');}
// включение флага после сборки -> сразу заменяет
fresh();T.regenerate(true);T.ACT.health('diab');
ok(!ids(T.state.plan).some(id=>T.hasF(T.RM[id],'sweet')),'флаг диабета не заменил сладкое сразу');
console.log('  ok');

console.log('\n== Быстро только по будням ==');
fresh(s=>{s.quick='weekdays';s.start='2026-11-16'});T.regenerate(true);
{const pl=T.state.plan,L=T.QUICK_LIM;let bad=0,longWk=0;
 pl.forEach((d,i)=>{for(const s in d){const r=T.RM[d[s]];if(!r||(s==='l'&&T.state.lo[i]))continue;if(!T.isWk(i)&&r.time>L[s])bad++;if(T.isWk(i)&&r.time>L[s])longWk++;}});
 ok(bad===0,'долгие блюда в будни: '+bad);
 ok(T.isWk(5)&&T.isWk(6)&&!T.isWk(0),'неверные выходные для старта 16.11 (Пн)');
 ok(T.poolFor('l',true).some(r=>r.id==='plov')&&!T.poolFor('l',false).some(r=>r.id==='plov'),'плов: доступен только в выходные');
 ok(!T.poolFor('s',false).some(r=>r.time>15),'лимит времени не применяется к перекусам');
 console.log('  долгих блюд в выходные',longWk);}
fresh(s=>{s.learner=true;s.start='2026-11-16'});T.regenerate(true);
ok(!T.state.plan.some((d,i)=>!T.isWk(i)&&Object.values(d).some(id=>id&&T.diffOf(T.RM[id])==='hard')),'сложные блюда в будни при «Учусь готовить»');

console.log('\n== Готовлю на 2 дня ==');
fresh(s=>{s.cook2=true});T.regenerate(true);
{const pl=T.state.plan,lo=T.state.lo,n=lo.filter(Boolean).length;
 ok(n>0,'нет ни одного обеда из остатков');
 lo.forEach((f,d)=>{if(f){ok(d>0&&pl[d].l===pl[d-1].d,'остатки не совпадают с ужином '+d);ok(T.keepsOf(T.RM[pl[d].l])>=2,'остатки из блюда с keeps<2');}});
 T.state.day=lo.indexOf(true);ok(T.viewMenu().includes('Остатки:'),'в меню нет «Остатки:»');
 const d=lo.indexOf(true)-1;T.ui.sheet={d,s:'d'};ok(T.viewSheet().includes('на 2 дня'),'в рецепте ужина нет пометки про 2 дня');T.ui.sheet=null;
 console.log('  обедов из остатков',n);}

console.log('\n== Лимит бюджета с разнообразием и белком ==');
for(const [nm,mut] of [['соло 1500',s=>{s.cap=1500}],['соло 2500',s=>{s.cap=2500}],['семья 3000',s=>{s.cap=3000;s.family=true;s.people.push({id:'a',kind:'adult',sex:'m',age:35,height:178,weight:85,act:1.55,goal:'keep',dislikes:[]})}]]){
  fresh(s=>{mut(s);});const capv=T.state.cap;T.state.cap='';T.regenerate(true);const free=T.computeCart().total,p0=dayProt(T.state.plan,T.state.lo);
  T.state.cap=capv;const t0=Date.now();T.regenerate(false);const ms=Date.now()-t0;maxMs=Math.max(maxMs,ms);
  const c=T.computeCart(),v=variety(T.state.plan,T.state.lo),p1=dayProt(T.state.plan,T.state.lo),tp=T.targets(T.state.people[0]).p;
  ok(v.near===0,nm+': одно блюдо в соседние дни ('+v.near+')');ok(v.max<=2,nm+': блюдо чаще 2 раз ('+v.max+')');
  ok(c.total<=capv||T.state.note,nm+': не уложились и нет объяснения');
  const avg0=p0.reduce((a,b)=>a+b,0)/7,avg1=p1.reduce((a,b)=>a+b,0)/7;
  ok(avg1>=Math.min(avg0,tp*.95)-3,nm+`: белок упал ${Math.round(avg0)} -> ${Math.round(avg1)}`);
  console.log(' ',nm.padEnd(12),'без лимита',Math.round(free),'| с лимитом',Math.round(c.total),'| белок/день',Math.round(avg0),'->',Math.round(avg1),'(цель',Math.round(tp)+')','| повт',v.max,'| соседн',v.near,'|',ms+'мс',T.state.note?'| объяснение есть':'');
}

console.log('\n== Белок: цель от веса и добавки ==');
fresh(s=>{s.people[0].goal='lose';s.people[0].weight=80});T.regenerate(true);
{const tg=T.targets(T.state.people[0]);ok(Math.abs(tg.p-128)<1,'белок 1,6 г/кг x 80 = 128, а получилось '+tg.p);
 const add=T.servings().filter(x=>x.add);const c=T.computeCart();
 console.log('  цель',Math.round(tg.p),'г | добавок за неделю',add.length,add.slice(0,3).map(a=>a.add.t).join('; '));
 if(add.length)ok(c.items.some(x=>x.dishes.includes('добрать белок')),'добавки не попали в корзину');
 T.state.autoProt=false;ok(!T.servings().some(x=>x.add),'добавки остались при выключенном переключателе');}

console.log('\n== Нелюбимое у одного человека ==');
fresh(s=>{s.family=true;s.people.push({id:'bk',kind:'adult',name:'Бакыт',sex:'m',age:35,height:178,weight:85,act:1.55,goal:'keep',dislikes:['chicken','fish']})});T.regenerate(true);
{const sv=T.servings(),alts=sv.filter(x=>x.alt),chick=new Set(['chicken_breast','chicken_thigh','chicken_leg','fish','tuna']);
 const mains=sv.filter(x=>!x.alt&&x.r&&Object.keys(x.r.ing).some(i=>chick.has(i)));
 ok(mains.every(x=>!x.who.some(w=>w.i===1)),'Бакыт получил блюдо, которое не ест');
 ok(alts.every(x=>!Object.keys(x.r.ing).some(i=>chick.has(i))),'замена для Бакыта тоже с курицей/рыбой');
 ok(mains.length===0||alts.length>0,'нет отдельных блюд для Бакыта');
 const c=T.computeCart();ok(alts.every(a=>Object.keys(a.r.ing).every(i=>c.items.some(x=>x.id===i))),'продукты отдельного блюда не в корзине');
 const d=alts.length?alts[0].d:0;T.state.day=d;ok(!alts.length||T.viewMenu().includes('Бакыт</b> ест'),'в меню нет строки «Бакыт ест»');
 console.log('  блюд с запретным для Бакыта',mains.length,'| отдельных блюд',alts.length);}

console.log('\n== Замена через лист, отмена, умное обновление ==');
fresh();T.regenerate(true);
{const before=T.state.plan[2].l,opts=T.replaceOptions(2,'l');ok(opts.length>=3&&opts.length<=5,'вариантов замены '+opts.length);
 T.ACT.pick('2:l:'+opts[1].id);ok(T.state.plan[2].l===opts[1].id&&T.state.man['2:l'],'замена не применилась');
 T.ACT.undo();ok(T.state.plan[2].l===before,'отмена не вернула блюдо');
 T.ACT.pick('2:l:'+opts[0].id);const snap=JSON.stringify(T.state.plan);
 T.ACT.cuisine('eu');ok(T.state.dirty,'после смены кухонь нет пометки «изменились»');
 T.ACT.update();ok(T.state.plan[2].l===opts[0].id,'умное обновление потеряло ручной выбор');
 const ch=JSON.parse(snap).reduce((n,d,i)=>n+Object.keys(d).filter(s=>d[s]!==T.state.plan[i][s]).length,0);
 console.log('  после «Обновить меню» изменено слотов',ch);
 ok(T.viewConfirm()===''&&(T.ACT.ask('regen'),T.ui.confirm==='regen'),'подтверждение пересборки не показано');T.ACT.cancel();ok(T.state.plan[2].l===opts[0].id,'отмена пересборки всё равно пересобрала');}

console.log('\n== Магазины ==');
fresh();T.regenerate(true);
const liveId=T.computeCart().items[0].id,live={date:'2026-11-21',stores:{a1:{n:'Тест-1',source:'s',url:'https://e.com'}},items:{a1:{[liveId]:{name:'Товар',size:1000,price:77,url:'https://e.com/m'}}}};
const livePrice=()=>T.computeCart().items.find(x=>x.id===liveId).o.price;
if(T.SD){
  const k=T.SD.keys;T.state.store=k[0];T.resetCaches();let c=T.computeCart();
  ok(c.items.some(x=>x.o.item),'нет товаров из каталога магазина');ok(c.items.every(x=>x.o.item||x.o.avg),'нет пометки «средняя цена»');
  ok(T.viewCart().includes('Цены от'),'нет строки «Цены от»');
  T.state.split=true;T.state.stores2=[k[0],k[1]];T.resetCaches();c=T.computeCart();
  ok(c.stores.length===2,'режим «Где дешевле» не включился');
  const sub=Object.values(c.sub).reduce((a,b)=>a+b,0);ok(Math.abs(sub-c.pay)<1,'сумма по магазинам не равна итогу');
  // каждый товар попал в магазин, где он дешевле
  const worse=c.items.filter(x=>{const other=c.stores.find(s=>s!==x.store);return T.buyIn(other,x.id,x.need).cost<x.cost-.01;});
  ok(worse.length===0,'товары не в самом дешёвом магазине: '+worse.map(x=>x.id).join(','));
  ok(T.viewCart().includes('store-sec'),'корзина не разделена по магазинам');
  console.log('  по магазинам',Object.entries(c.sub).map(([s,v])=>s+' '+Math.round(v)).join(' / '),'| в каталоге',c.items.filter(x=>x.o.item).length,'из',c.items.length);
  T.state.split=false;T.state.store='nonexistent';ok(T.applyLivePrices(live),'applyLivePrices не принял данные');
  ok(T.state.store==='a1'&&T.SD.keys.join()==='a1','applyLivePrices не выбрал первый магазин');
  ok(livePrice()===77,'applyLivePrices: цена не применилась');
}else{
  ok(T.activeStores()[0]==='avg','без цен должен быть один вариант «средние цены»');
  ok(T.applyLivePrices(live),'applyLivePrices не принял данные');
  ok(T.state.store==='a1'&&livePrice()===77,'applyLivePrices: магазин/цена не применились');
  ok(T.viewCart().includes('нет в каталоге магазина'),'нет пометки о средней цене');
  console.log('  магазинов с ценами нет, проверен applyLivePrices (запустите с PRICES=tools/fixtures/prices.sample.js для режима «Где дешевле»)');
}

console.log('\n== Мелочи ==');
fresh(s=>{s.big=true;s.family=true;s.people.push({id:'n',kind:'child',name:'Нурик',sex:'m',age:12,dislikes:[]})});T.regenerate(true);
{const html=T.viewMenu();ok(html.includes('Белки <b>'),'крупный текст: нет слова «Белки»');ok(/порции на всех|порций на всех|порция на всех/.test(html),'нет «N порции на всех»');ok(html.includes('на тарелку'),'нет «на тарелку»');
 ok(T.personKcal(T.state.people[1])>T.personKcal(Object.assign({},T.state.people[1],{sex:'f'})),'пол ребёнка не учитывается');
 const c=T.computeCart(),milk=c.items.find(x=>T.ING[x.id].unit==='ml');ok(!milk||/л/.test(T.qtyText(milk)),'жидкости не в литрах');
 T.state.cart[c.items[0].id]={b:true};const c2=T.computeCart(),g=c2.items.filter(x=>x.i.cat===c.items[0].i.cat);ok(g[g.length-1].id===c.items[0].id||g.filter(x=>x.bought).length>1,'купленное не внизу группы');
 T.state.onboarded=false;T.state.goalSeen=false;T.state.step=0;ok(T.viewOnboarding().includes('пересчитаем'),'шаг 1: нет «после выбора цели пересчитаем»');ok(!T.viewOnboarding().includes('Миффлин'),'шаг 1: осталось название формулы');}
// старое сохранение v1 целиком
{const old={v:1,onboarded:true,step:5,tab:'menu',day:3,people:[{id:'x',kind:'adult',name:'Айгуль',sex:'f',age:30,height:165,weight:70,act:1.375,goal:'lose'},{id:'c',kind:'child',name:'',sex:'m',age:7}],
  family:true,macro:'protein',mp:35,mf:30,cuisines:['kg','home'],diet:'all',meals:4,quick:true,dislikes:['fish'],allergies:['peanut'],customEx:'',store:'globus',adj:5,mode:'opt',cap:'',prices:{milk:90},seed:1,
  plan:Array.from({length:7},()=>({b:'syrniki',l:'plov',d:'kotlety_pure',s:'kefir_banana'})),note:'',cart:{milk:{b:true}},dirty:true,createdAt:Date.now()};
 let st;try{st=T.migrate(old);T.state=st;T.resetCaches();renderAll();T.computeCart();ok(true,'');}catch(e){ok(false,'старое сохранение не загрузилось: '+e.message);}
 ok(st&&st.plan&&st.start&&st.dirtyKinds.length,'миграция плана/даты/пометки');console.log('  старое сохранение v1 открылось, старт недели',st&&st.start);}
// прогресс веса
fresh(s=>{s.people[0].target=62});T.regenerate(true);
{T.state.wlog=[{d:'2026-11-01',w:72},{d:'2026-11-10',w:71.2},{d:'2026-11-20',w:70.4}];const h=T.viewProgress();ok(h.includes('<polyline'),'нет графика веса');ok(/кг в неделю/.test(h)&&/цель к/.test(h),'нет прогноза «кг в неделю, цель к»');}

console.log('\n== Скорость ==');
fresh(s=>{s.family=true;s.cap=2500;s.cook2=true;s.people.push({id:'a',kind:'adult',sex:'m',age:35,height:178,weight:85,act:1.55,goal:'keep',dislikes:['fish']},{id:'b',kind:'child',sex:'f',age:7,dislikes:[]})});
{let t0=Date.now();T.regenerate(true);const g=Date.now()-t0;t0=Date.now();for(let i=0;i<20;i++){T.computeCart();}const cc=(Date.now()-t0)/20;t0=Date.now();T.render();const rr=Date.now()-t0;
 console.log(`  пересборка с лимитом (семья, 2 дня) ${g} мс | корзина ${cc.toFixed(1)} мс | рендер меню ${rr} мс | худший сценарий выше ${maxMs} мс`);
 ok(g<400,'пересборка слишком медленная на десктопе: '+g);}

console.log(`\n${checks} проверок, ошибок: ${fails}`);
process.exit(fails?1:0);
