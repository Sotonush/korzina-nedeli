// Общий загрузчик для тестов по областям: tools/tests/<область>.test.js
//   const { load } = require('./harness'); const A = load(); A.ev('state.people.length')
// Все верхнеуровневые объявления приложения (state, RECIPES, computeCart, viewMenu…) доступны через A.ev('…').
const fs = require('fs'), path = require('path'), vm = require('vm');
const { root, rd, appSource } = require('../sources');
function load({ prices = 'src/prices.js', storage = {} } = {}) {
  const el = () => ({ innerHTML: '', className: '', hidden: false, style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, appendChild() {}, focus() {}, children: [] });
  const store = Object.assign({}, storage);
  const ctx = { console, Math, JSON, Date, Intl, setTimeout, clearTimeout, performance,
    document: { getElementById: el, createElement: el, querySelector: () => null, querySelectorAll: () => [], body: el(), documentElement: el(), addEventListener() {}, activeElement: null },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    window: { scrollTo() {}, scrollY: 0, addEventListener() {} }, navigator: {}, location: { hash: '' } };
  vm.createContext(ctx);
  vm.runInContext([rd('src/data.js'), rd(prices), appSource()].join('\n'), ctx, { filename: 'app-bundle.js' });
  return { ctx, ev: s => vm.runInContext(s, ctx) };
}
let fails = 0, passes = 0;
function check(name, ok, info) { if (ok) passes++; else { fails++; console.log('  FAIL:', name, info !== undefined ? '— ' + JSON.stringify(info) : ''); } }
function done(label) { console.log(`${label}: ${passes} проверок, ошибок: ${fails}`); if (fails) process.exitCode = 1; }
module.exports = { load, check, done, root };
