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
const code=[rd('src/data.js'),rd(pricesFile),require('./sources').appSource()].join('\n')+
`\n;globalThis.T={get state(){return state},set state(v){state=v},get SD(){return SD},get RAWP(){return typeof STORE_ITEMS!=='undefined'?{date:PRICES_DATE,stores:STORE_INFO,items:STORE_ITEMS}:null},defaults,migrate,generatePlan,computeCart,servings,addonsFrom,pool,poolFor,RM,ING,RECIPES,
viewMenu,viewCart,viewProfile,viewProgress,viewOnboarding,viewSheet,viewReplace,viewConfirm,STEPS,SECS,ui,ACT,regenerate,swapMeal,enforcePlan,smartUpdate,replaceOptions,pickReplace,
personKcal,targets,filterCtx,resetCaches,applyLivePrices,isWk,keepsOf,hasF,honeyCentred,diffOf,QUICK_LIM,shareText,qtyText,render,genSetup,activeStores,buyIn,
isSoup,isAdult,plateG,yieldOf,dayTotals,forecast,menuKcal,maintKcal,storeItem,pairTotals,needText,unitPriceText,stepText,twoDay,twoDayText,fmtD,heavyDinner,kaymakStyle,baseOf,fruitIds,premOf,capTips,childKcal,summerIds,dropUnknown};`;
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
const dayProt=(plan,lo)=>{const sv=T.servings(plan,lo,false);return plan.map((_,d)=>sv.filter(x=>x.d===d&&x.r).reduce((a,x)=>a+x.who.filter(w=>w.i===0).reduce((b,w)=>b+x.r.P*w.m,0),0));};
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
 const add=T.servings().filter(x=>x.add&&!x.bread);const c=T.computeCart();
 console.log('  цель',Math.round(tg.p),'г | добавок за неделю',add.length,add.slice(0,3).map(a=>a.add.t).join('; '));
 if(add.length)ok(c.items.some(x=>x.dishes.includes('добрать белок')),'добавки не попали в корзину');
 T.state.autoProt=false;ok(!T.servings().some(x=>x.add&&!x.bread),'добавки остались при выключенном переключателе');}

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
  // во второй магазин — только при экономии >= 30 сом или 10%, в первом не осталось того, что заметно дешевле во втором
  const [m1,m2]=c.stores,has=(k,id)=>!!(T.SD.items[k]&&T.SD.items[k][id]&&+T.SD.items[k][id].price>0);
  const badMove=c.items.filter(x=>x.store===m2&&has(m1,x.id)&&(()=>{const a=T.buyIn(m1,x.id,x.need).cost,sv=a-x.cost;return !(sv>=30||sv>=a*.1);})());
  const missed=c.items.filter(x=>x.store===m1&&has(m2,x.id)&&(()=>{const b=T.buyIn(m2,x.id,x.need).cost,sv=x.cost-b;return sv>=30||(sv>0&&sv>=x.cost*.1);})());
  ok(badMove.length===0,'перенесено во 2-й магазин без выгоды: '+badMove.map(x=>x.id).join(','));
  ok(missed.length===0,'не перенесено, хотя выгодно: '+missed.map(x=>x.id).join(','));
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

// ======================= Новые запросы клиента (12 пунктов) =======================
const famKid=s=>{s.family=true;s.people.push({id:'k1',kind:'child',name:'Арсен',sex:'m',age:6,dislikes:[]})};
const anyR=(pl,lo,f)=>{const out=[];pl.forEach((day,d)=>{for(const s in day){const r=T.RM[day[s]];if(r&&!(s==='l'&&lo[d])&&f(r,s,d))out.push(d+s+':'+r.id);}});return out;};

console.log('\n== 1. Суп: порция и хлеб ==');
{const soups=T.RECIPES.filter(r=>T.isSoup(r));ok(soups.length>=3,'супов найдено мало: '+soups.length);
 let seen=0,bread=0,badA=0,badC=0;
 for(let seed=0;seed<12&&seen<6;seed++){fresh(s=>{famKid(s);s.seed=seed*131;});T.state.seed=seed*131;T.regenerate(false);
  const opts=T.poolFor('l',T.isWk(2)).filter(r=>T.isSoup(r));if(opts.length)T.pickReplace(2,'l',opts[seed%opts.length].id);
  const sv=T.servings();
  for(const x of sv){if(!x.r||!T.isSoup(x.r))continue;seen++;for(const w of x.who){const ml=T.plateG(x.r,w.m),child=!T.isAdult(T.state.people[w.i]);
    if(child&&(ml>300||ml<240))badC++;if(!child&&(ml>450||ml<340))badA++;}}
  bread+=sv.filter(x=>x.bread).length;
  const c=T.computeCart();if(sv.some(x=>x.bread))ok(c.items.some(x=>x.dishes.includes('хлеб к обеду')),'хлеб к супу не попал в корзину');
  T.state.day=2;const h=T.viewMenu();if(sv.some(x=>x.bread&&x.d===2))ok(/\+ (хлеб|лепёшка|лаваш) \d+ г/.test(h),'нет строки «+ хлеб N г» в меню');
 }
 ok(seen>0,'суп ни разу не попал в меню');ok(badA===0,'взрослая порция супа вне 350–450 мл: '+badA);ok(badC===0,'детская порция супа вне 250–300 мл: '+badC);
 ok(bread>0,'хлеб к супу ни разу не добавлен');
 const x=T.servings().find(y=>y.r&&!y.alt);const m=x.who[0].m;ok(Math.abs(T.plateG(x.r,m)-T.yieldOf(x.r)*m)<=5,'граммы на тарелке не совпадают с рецептом');
 console.log('  тарелок супа',seen,'| добавок хлеба',bread);}

console.log('\n== 2. Калории дня и прогноз ==');
{let worst=0,over=0,n=0;
 const scen=[['похудение',s=>{}],['похудение 3 приёма',s=>{s.meals=3}],['семья',s=>{famKid(s);s.people.push({id:'a2',kind:'adult',sex:'m',age:40,height:180,weight:95,act:1.55,goal:'lose',dislikes:[]})}],['набор',s=>{Object.assign(s.people[0],{sex:'m',weight:80,height:182,goal:'gain'})}],['лимит+эконом',s=>{s.cap=1800;s.mode='eco'}],['2 дня',s=>{s.cook2=true}]];
 for(const [nm,mut] of scen)for(let seed=0;seed<4;seed++){fresh(s=>{mut(s);s.seed=seed*7+1});T.state.seed=seed*7+1;T.regenerate(false);
  const sv=T.servings(),E=T.state.family?T.state.people:[T.state.people[0]];
  for(let d=0;d<7;d++)E.forEach((p,i)=>{const t=T.dayTotals(d,sv,i),K=T.personKcal(p),r=t.k/K;n++;worst=Math.max(worst,Math.abs(r-1));if(p.goal==='lose'&&r>1.05)over++;if(Math.abs(r-1)>.05)console.log('   ',nm,'день',d,p.id,Math.round(t.k),'/',K);});}
 ok(worst<=.05,'калории дня отклоняются от нормы больше 5%: '+(worst*100).toFixed(1)+'%');ok(over===0,'похудение: день выше нормы +5%: '+over);
 fresh(s=>{s.people[0].goal='lose';s.people[0].weight=95;s.autoProt=true});T.regenerate(true);
 {const sv=T.servings(),K=T.personKcal(T.state.people[0]);const adds=sv.filter(x=>x.add&&!x.bread);
  ok([0,1,2,3,4,5,6].every(d=>T.dayTotals(d,sv,0).k<=K*1.05),'с добавками для белка день выше +5%');
  console.log('  худшее отклонение',(worst*100).toFixed(1)+'%','по',n,'дням | добавок при весе 95 кг',adds.length);}
 T.state.day=0;const h=T.viewMenu();ok(!/bar-item off/.test(h)||/нормы на/.test(h),'нет подписи «больше/меньше нормы на …»');
 const fc=T.forecast(),mk=T.menuKcal(),p=T.state.people[0];
 ok(mk>0&&Math.abs(fc.perWeek-(mk-T.maintKcal(p))*7/7700)<1e-9,'прогноз не по калориям меню');ok(/По меню/.test(T.viewProgress()),'в «Прогрессе» нет пояснения «По меню …»');
 console.log('  меню в среднем',Math.round(mk),'ккал, норма',T.personKcal(p),'| прогноз',fc.rate);}

console.log('\n== 3 и 8. Магазины: наличие, порог, пары ==');
if(T.RAWP)T.applyLivePrices(T.RAWP); // вернуть настоящие магазины после проверки applyLivePrices
if(T.SD&&T.SD.keys.length>=2){
 fresh();T.regenerate(true);const k=T.SD.keys;
 for(const pair of [[k[0],k[1]],[k[1],k[k.length-1]]]){T.state.split=true;T.state.stores2=pair.slice();T.resetCaches();const c=T.computeCart();
  const wrong=c.items.filter(x=>x.store&&!T.storeItem(x.store,x.id));ok(wrong.length===0,'продукт в магазине, где его нет: '+wrong.map(x=>x.store+':'+x.id).join(','));
  const lost=c.items.filter(x=>!x.store&&pair.some(s=>T.storeItem(s,x.id)));ok(lost.length===0,'есть в магазине, но попал в «примерные»: '+lost.map(x=>x.id).join(','));
  const ap=c.items.filter(x=>!x.store);if(ap.length)ok(T.viewCart().includes('Цена примерная — уточните в магазине'),'нет группы «Цена примерная»');
  ok(T.viewCart().includes('сом/кг')||T.viewCart().includes('сом/л'),'нет цены за кг/л');
  console.log('  ',pair.join('+'),'| примерных',ap.length,ap.map(x=>x.id).join(' '));}
 const pt=T.pairTotals();ok(pt.length===k.length*(k.length-1)/2,'не все пары магазинов');ok(pt.every((p,i)=>!i||p.total>=pt[i-1].total),'пары не по возрастанию');
 console.log('  пары:',pt.map(p=>p.stores.join('+')+' '+Math.round(p.total)).join(' · '));
 if(k.length>=3){T.state.stores2=[k[0],k[1]];T.ACT.store2(k[2]);ok(T.state.stores2.length===2&&T.state.stores2.includes(k[0])&&T.state.stores2.includes(k[1]),'третий магазин молча выкинул выбранный');
  ok(T.ui.pick&&T.ui.pick.opts.length===2,'нет вопроса, какой магазин заменить');T.ACT.pickSet('0');ok(T.state.stores2.includes(k[2])&&!T.state.stores2.includes(k[0]),'замена магазина не применилась');
  T.ACT.pair(pt[0].stores.join(','));ok(T.state.stores2.join()===pt[0].stores.join(),'пара не выбралась');}
 T.state.split=false;T.state.store=k[k.length-1];T.resetCaches();const c1=T.computeCart();
 ok(c1.items.every(x=>x.store?!!T.storeItem(x.store,x.id):true),'один магазин: продукт без данных отнесён в магазин');
 const eg=c1.items.find(x=>x.id==='eggs');if(eg)ok(/^\d+ × 10 шт$/.test(T.qtyText(eg))&&/шт/.test(T.needText(eg)),'яйца не в «N × 10 шт»: '+T.qtyText(eg));
 const ml=c1.items.find(x=>T.ING[x.id].unit==='ml'&&x.o.size!=='w');if(ml)ok(/(мл|л)/.test(T.qtyText(ml))&&/сом\/л/.test(T.unitPriceText(ml)),'жидкость не в мл/л: '+T.qtyText(ml));
}else console.log('  нет цен магазинов — пропуск');

console.log('\n== 4. Шаги рецепта и «на 2 дня» ==');
{const st=(t,h)=>T.stepText(t,h);
 ok(st('Залейте [[160|мл]] кипятка',1)==='Залейте 160 мл кипятка','токен ×1: '+st('Залейте [[160|мл]] кипятка',1));
 ok(st('Залейте [[160|мл]] кипятка',2)==='Залейте 320 мл кипятка','токен ×2');
 ok(st('Залейте [[160|мл]] кипятка',9.4)==='Залейте 1,5 л кипятка','мл → л: '+st('Залейте [[160|мл]] кипятка',9.4));
 ok(st('[[300|г]] муки',4)==='1,2 кг муки','г → кг: '+st('[[300|г]] муки',4));
 ok(st('[[1|ст. л.]] масла',1.3)==='1,5 ст. л. масла','ст. л. до 0,5: '+st('[[1|ст. л.]] масла',1.3));
 ok(st('[[1|шт]] луковица',.4)==='0,5 шт луковица','шт минимум 0,5: '+st('[[1|шт]] луковица',.4));
 ok(st('Варите [[20|мин]]',3)==='Варите 20 мин','минуты не масштабируются');
 ok(st('[[37|г]] соли',3)==='110 г соли','округление граммов: '+st('[[37|г]] соли',3));
 ok(!/\[\[|\]\]/.test(st('Битый [[токен',2)+st('[[abc|г]]',2)),'сырые скобки токена видны');
 fresh();T.regenerate(true);let raw=0;T.RECIPES.forEach(r=>(r.steps||[]).forEach(t=>{if(/\[\[|\]\]/.test(T.stepText(t,1.7)))raw++;}));ok(raw===0,'в рецептах остались сырые токены: '+raw);
 fresh(s=>{s.cook2=true;famKid(s)});T.regenerate(true);
 const lo=T.state.lo,dd=lo.indexOf(true)-1;ok(dd>=0,'нет ужина на 2 дня');
 if(dd>=0){const sv=T.servings(),t=T.twoDay(dd,sv),txt=T.twoDayText(t);T.state.day=dd;const h=T.viewMenu();
  ok(/^Готовим \d+,\d порции: \d+,\d сегодня \+ \d+,\d завтра$/.test(txt),'формат «Готовим N порции: a сегодня + b завтра»: '+txt);
  ok(Math.abs(t.today+t.tom-t.total)<1e-9,'сегодня + завтра ≠ всего');ok(h.includes(txt),'в карточке ужина нет '+txt);
  T.ui.sheet={d:dd,s:'d'};const sh=T.viewSheet();T.ui.sheet=null;ok(sh.includes(txt),'в рецепте нет тех же чисел');
  T.state.day=dd+1;ok(T.viewMenu().includes(T.fmtD(t.tom)+' порции из вчерашнего ужина'),'в «Остатках» нет тех же порций');
  console.log('  ',txt);}}

console.log('\n== 5. Здоровье: ужин, недельные лимиты, жиры ==');
{let heavyD=0,wf=0,fat=0,sal=0,kay=0,fatDays=0,n=0;
 for(let seed=0;seed<10;seed++)for(const h of [{diab:true,bp:false},{diab:false,bp:true},{diab:true,bp:true}]){
  fresh(s=>{s.health=Object.assign({},h);s.seed=seed*313;s.mode=['eco','opt','comfort'][seed%3];s.cook2=seed%2===0});T.state.seed=seed*313;T.regenerate(false);n++;
  const pl=T.state.plan,lo=T.state.lo;
  heavyD+=pl.filter(d=>d.d&&T.heavyDinner(T.RM[d.d])).length;
  const cnt=f=>anyR(pl,lo,r=>T.hasF(r,f)).length;
  if(h.diab&&cnt('whiteflour')>2)wf++;if(h.bp&&cnt('fatty')>1)fat++;if(h.bp&&cnt('salty')>0)sal++;if(anyR(pl,lo,r=>T.kaymakStyle(r)).length>1)kay++;
  const sv=T.servings(),tg=T.targets(T.state.people[0]);for(let d=0;d<7;d++)if(T.dayTotals(d,sv,0).f>tg.f*1.1+.5)fatDays++;
 }
 ok(heavyD===0,'тяжёлое блюдо на ужин при флаге здоровья: '+heavyD);
 ok(['zharkop','kartoshka_myaso','borsch'].every(id=>!T.RM[id]||T.heavyDinner(T.RM[id])),'жаркоп/тушёная картошка/борщ не считаются тяжёлыми на ужин');
 ok(wf===0,'диабет: белая мука больше 2 раз в неделю ('+wf+' недель)');ok(fat===0,'давление: жирное больше 1 раза ('+fat+')');ok(sal===0,'давление: солёное в меню ('+sal+')');
 ok(kay===0,'лепёшка с каймаком чаще раза в неделю ('+kay+')');ok(fatDays===0,'жиры дня выше нормы +10%: '+fatDays+' дней');
 fresh();T.regenerate(true);T.ACT.health('diab');ok(T.state.macro!=='lowcarb','макросы переключились без спроса');
 let h=T.viewMenu();ok(h.includes('Меньше углеводов')&&h.includes('data-act="lowcarb"'),'нет предложения «Меньше углеводов»');
 const cards=(h.match(/<article class="meal /g)||[]).length,carbs=(h.match(/Углеводы <b>/g)||[]).length;ok(carbs>0&&carbs>=cards,'углеводы не у каждого блюда: '+carbs+'/'+cards);
 T.ACT.lowcarb();ok(T.state.macro==='lowcarb'&&!T.viewMenu().includes('data-act="lowcarb"'),'переключение «Меньше углеводов» не сработало');
 fresh(s=>{s.health={diab:true,bp:true}});T.regenerate(true);ok(T.replaceOptions(2,'d').every(r=>!T.heavyDinner(r)),'в заменах ужина тяжёлое');
 console.log('  недель проверено',n);}

console.log('\n== 6. Разнообразие ==');
{let dayRep=0,wkRep=0,fruit=0,snack=0,n=0,rep=0;const chk=()=>{const pl=T.state.plan,lo=T.state.lo,bw={},fw={},sw={};n++;
  pl.forEach((day,d)=>{const bs=new Set();for(const s in day){const r=T.RM[day[s]];if(!r||(s==='l'&&lo[d]))continue;const b=T.baseOf(r);if(bs.has(b))dayRep++;bs.add(b);bw[b]=(bw[b]||0)+1;T.fruitIds(r).forEach(f=>fw[f]=(fw[f]||0)+1);if(s==='s')sw[r.id]=(sw[r.id]||0)+1;}});
  wkRep+=Object.values(bw).filter(v=>v>3).length;fruit+=Object.values(fw).filter(v=>v>3).length;snack+=Object.values(sw).filter(v=>v>3).length;};
 for(let seed=0;seed<8;seed++)for(const mode of ['eco','opt','comfort']){fresh(s=>{s.seed=seed*97+3;s.mode=mode});T.state.seed=seed*97+3;T.regenerate(false);chk();}
 for(const cap of [1500,2200]){fresh(s=>{s.cap=cap;s.mode='eco'});T.regenerate(true);chk();}
 fresh();T.regenerate(true);T.ACT.cuisine('eu');T.ACT.update();chk();
 ok(dayRep===0,'одна основа дважды в день: '+dayRep);ok(wkRep===0,'основа чаще 3 раз в неделю: '+wkRep);ok(fruit===0,'фрукт чаще 3 раз в неделю: '+fruit);ok(snack===0,'перекус чаще 3 раз: '+snack);
 fresh();T.regenerate(true);for(let d=0;d<7;d++)for(const s of ['b','l','d']){const day=T.state.plan[d],other=new Set(Object.keys(day).filter(x=>x!==s&&!(x==='l'&&T.state.lo[d])&&T.RM[day[x]]).map(x=>T.baseOf(T.RM[day[x]])));
  if(T.replaceOptions(d,s).some(r=>other.has(T.baseOf(r))))rep++;}
 ok(rep===0,'в заменах блюдо с той же основой, что уже есть в этот день: '+rep);
 console.log('  меню проверено',n);}

console.log('\n== 7. Студент: есть дома, эконом, подсказки к лимиту ==');
{fresh();T.regenerate(true);let c=T.computeCart();const oil=c.items.find(x=>x.id==='oil');
 const pant=c.items.filter(x=>x.pantry);ok(pant.length>0,'ничего не отмечено «есть дома» по умолчанию');
 ok(pant.every(x=>x.home)&&Math.abs(c.total-c.items.filter(x=>!x.home).reduce((a,x)=>a+x.cost,0))<.01,'«есть дома» входит в сумму');
 if(oil){ok(oil.home,'масло не отмечено «есть дома»');T.ACT.home('oil');c=T.computeCart();ok(!c.items.find(x=>x.id==='oil').home,'«купить» не вернул масло в сумму');T.ACT.home('oil');ok(T.computeCart().items.find(x=>x.id==='oil').home,'повторное нажатие не вернуло «есть дома»');}
 ok(/Обычно есть дома: .+ — не учтены/.test(T.viewCart()),'нет пометки «Обычно есть дома: … — не учтены»');
 console.log('  по умолчанию дома:',pant.map(x=>x.id).join(', '));
 let prem=0;for(let seed=0;seed<5;seed++){fresh(s=>{s.mode='eco';s.seed=seed*5+2});T.state.seed=seed*5+2;T.regenerate(false);prem+=anyR(T.state.plan,T.state.lo,r=>T.premOf(r).length>0).length;}
 ok(prem===0,'«Эконом»: дорогие продукты в меню: '+prem);
 fresh(s=>{s.cap=900;s.mode='opt'});T.regenerate(true);c=T.computeCart();const tips=T.capTips(),h=T.viewMenu();
 ok(c.total>900&&tips.length>0,'нет подсказок «Чтобы уложиться в лимит»');ok(h.includes('Чтобы уложиться в лимит:')&&/data-act="(pick|noSnack)"/.test(h),'подсказки без кнопок');
 ok(tips.every(t=>t.save>=10),'подсказка без реальной экономии');
 const sn=tips.find(t=>t.kind==='snack');if(sn){const before=c.total;T.ACT.noSnack(String(sn.d));const after=T.computeCart().total;ok(Math.abs(before-after-sn.save)<1,'экономия «убрать перекус» не совпала');
  const sv=T.servings(),K=T.personKcal(T.state.people[0]);ok(Math.abs(T.dayTotals(sn.d,sv,0).k/K-1)<=.05,'без перекуса калории дня не в норме');ok(!sv.some(x=>x.d===sn.d&&x.s==='s'),'перекус остался');T.ACT.undo();ok(!T.state.noSnack[sn.d],'отмена не вернула перекус');}
 T.state.mode='eco';T.state.split=true;T.state.stores2=T.SD?T.SD.keys.slice(0,2):[];const h2=T.viewMenu();ok(!h2.includes('data-act="tipEco"')&&!h2.includes('включить «Где дешевле»'),'советуем то, что уже включено');
 console.log('  подсказок',tips.length,tips.map(t=>t.kind+' −'+Math.round(t.save)).join(', '));}

console.log('\n== 9. Дети ==');
{const kid=(sex,age,cact,w)=>T.childKcal({kind:'child',sex,age,cact,weight:w||''});
 ok(kid('m',5,'mid')>=1300&&kid('m',5,'mid')<=1450&&kid('f',5,'mid')>=1250&&kid('f',5,'mid')<=1450,'4–6 лет ≈ 1300–1450: '+kid('m',5,'mid')+'/'+kid('f',5,'mid'));
 ok(kid('m',8,'mid')>=1600&&kid('m',8,'mid')<=1800,'7–10 лет ≈ 1600–1800: '+kid('m',8,'mid'));
 ok(kid('m',13,'mid')>=1900&&kid('m',13,'mid')<=2300&&kid('f',12,'mid')>=1800,'11–14 лет ≈ 1900–2300: '+kid('m',13,'mid'));
 ok(kid('m',9,'low')<kid('m',9,'mid')&&kid('m',9,'mid')<kid('m',9,'high'),'активность ребёнка не влияет');
 ok(kid('m',9,'mid')>kid('f',9,'mid'),'пол ребёнка не влияет');
 const t=kid('m',9,'mid'),w=kid('m',9,'mid',45);ok(w!==t&&w<=t*1.2+10&&w>=t*.8-10,'вес ребёнка не учтён или вне ±20%');
 const mg=T.migrate({v:2,onboarded:true,family:true,people:[{id:'x',kind:'adult',sex:'f',age:30,height:165,weight:70,act:1.375,goal:'keep'},{id:'c',kind:'child',sex:'m',age:7}],plan:null});
 ok(mg.people[1].cact==='mid'&&mg.allergyWho&&typeof mg.allergyWho==='object','миграция ребёнка/allergyWho');
 fresh(s=>{famKid(s);s.allergies=['nuts'];s.openSec='allergy'});T.ACT.allWho('nuts:k1');ok(T.state.allergyWho.nuts.includes('k1'),'«нельзя: Арсен» не сохраняется');
 ok(T.viewProfile().includes('нельзя: Арсен'),'нет «нельзя: Арсен»');
 T.state.openSec='family';ok(T.viewProfile().includes('p1-cact'),'нет активности ребёнка');
 console.log('  5 лет м/д',kid('m',5,'mid'),kid('f',5,'mid'),'| 8 лет',kid('m',8,'mid'),'| 13 лет',kid('m',13,'mid'),'| 9 лет с весом 45',w);}

console.log('\n== 10. Мелочи ==');
{fresh();T.regenerate(true);let h=T.viewMenu();ok((h.match(/class="kc">ккал</g)||[]).length===7,'нет «ккал» под днями');
 T.state.onboarded=false;T.state.step=0;h=T.viewOnboarding();ok(h.includes('Крупнее'),'кнопка «Аа» без текста «Крупнее»');T.state.big=true;ok(T.viewOnboarding().includes('Обычный'),'нет «Обычный» в крупном режиме');T.state.big=false;T.state.onboarded=true;
 T.ui.replace={d:1,s:'l'};const rp=T.viewReplace();T.ui.replace=null;ok(/(дороже|дешевле) на \d|та же цена/.test(rp),'в замене нет разницы по цене');
 T.state.dirty=true;T.state.tab='profile';h=T.viewProfile();ok(h.includes('Пересобрать неделю')&&!h.includes('Всё заново'),'нет «Пересобрать неделю»');
 ok(h.includes('Удалить все данные')&&h.lastIndexOf('Удалить все данные')>h.lastIndexOf('acc-btn'),'«Удалить все данные» не внизу');
 ok(!T.SECS.some(x=>x[0]==='reset'),'«Начать заново» осталось разделом');
 fresh(s=>{s.cap=999999});T.regenerate(true);ok(!T.viewMenu().includes('Не укладываемся'),'баннер лимита при запасе');}

console.log('\n== 12. Зимние овощи ==');
{const S=T.summerIds();ok(S.size>0,'нет летних продуктов');
 let st='2026-07-06';
 const sg=()=>{let g=0;for(let seed=0;seed<6;seed++){fresh(s=>{s.seed=seed*41;s.start=st});T.state.seed=seed*41;T.regenerate(false);const sv=T.servings();for(const x of sv)if(x.r)for(const id in x.r.ing)if(S.has(id))g+=x.r.ing[id]*x.who.reduce((a,w)=>a+w.m,0);}return g;};
 const summer=sg();st='2026-12-07';const winter=sg();
 ok(winter<summer,'зимой тепличных овощей не меньше, чем летом: '+Math.round(winter)+' / '+Math.round(summer));
 fresh(s=>{s.start='2026-12-07'});T.regenerate(true);const c=T.computeCart();if(c.items.some(x=>S.has(x.id)&&!x.home))ok(/зимой дорог/.test(T.viewCart()),'нет подсказки про дорогие зимой овощи');
 console.log('  тепличных овощей за неделю: летом',Math.round(summer),'г, зимой',Math.round(winter),'г');}

console.log('\n== 11. Офлайн (sw.js) ==');
{const sw=rd('web/sw.js'),bw=rd('tools/build-web.js');
 ok(sw.includes('__BUILD__')&&/__BUILD__/.test(bw),'версия SW не проставляется сборкой');
 ok(/fonts\.googleapis\.com/.test(sw)&&/fonts\.gstatic\.com/.test(sw),'шрифты Google не кэшируются');
 ok(/3000/.test(sw)&&/navigate/.test(sw),'нет таймаута 3 с для навигации');ok(/prices\.json/.test(sw),'нет prices.json network-first');
 try{new vm.Script(sw);ok(true,'');}catch(e){ok(false,'sw.js с синтаксической ошибкой: '+e.message);}}

console.log('\n== Старое сохранение и неизвестные блюда ==');
{const old={v:2,onboarded:true,people:[{id:'x',kind:'adult',sex:'f',age:30,height:165,weight:70,act:1.375,goal:'lose'}],cart:{oil:{b:true}},plan:Array.from({length:7},()=>({b:'nonexistent_dish',l:'plov',d:'borsch',s:'kefir_banana'})),lo:[],stores2:['frunze'],tab:'menu'};
 let st;try{st=T.migrate(old);T.state=st;T.resetCaches();T.dropUnknown(st);renderAll();T.computeCart();ok(true,'');}catch(e){ok(false,'старое сохранение с неизвестным блюдом упало: '+e.message);}
 ok(st&&st.plan.every(d=>d.b!=='nonexistent_dish'),'неизвестное блюдо осталось');}

console.log('\n== Скорость ==');
fresh(s=>{s.family=true;s.cap=2500;s.cook2=true;s.people.push({id:'a',kind:'adult',sex:'m',age:35,height:178,weight:85,act:1.55,goal:'keep',dislikes:['fish']},{id:'b',kind:'child',sex:'f',age:7,dislikes:[]})});
{let t0=Date.now();T.regenerate(true);const g=Date.now()-t0;t0=Date.now();for(let i=0;i<20;i++){T.computeCart();}const cc=(Date.now()-t0)/20;t0=Date.now();T.render();const rr=Date.now()-t0;
 console.log(`  пересборка с лимитом (семья, 2 дня) ${g} мс | корзина ${cc.toFixed(1)} мс | рендер меню ${rr} мс | худший сценарий выше ${maxMs} мс`);
 ok(g<400,'пересборка слишком медленная на десктопе: '+g);}

console.log(`\n${checks} проверок, ошибок: ${fails}`);
process.exit(fails?1:0);
