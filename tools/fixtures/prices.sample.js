// ТЕСТОВЫЕ ДАННЫЕ для разработки, НЕ настоящие цены. Никогда не копировать в src/.
// Загружается после data.js (использует ING). Подключение: PRICES=tools/fixtures/prices.sample.js node tools/test.js
const PRICES_DATE = '2026-11-20';
const STORE_INFO = {
  globus:{n:'Глобус', source:'тестовый каталог Глобус', url:'https://example.com/globus'},
  asia:{n:'Азия', source:'тестовый каталог Азия', url:'https://example.com/asia'},
  narodny:{n:'Народный', source:'тестовый каталог Народный', url:'https://example.com/narodny'}
};
const STORE_ITEMS = (() => {
  const mult = {globus:1.06, asia:.96, narodny:1}, out = {};
  Object.keys(mult).forEach((st, si) => {
    out[st] = {};
    Object.keys(ING).forEach((id, i) => {
      if ((i + si*3) % 9 === 0) return; // часть товаров «нет в каталоге»
      const g = ING[id], jitter = 1 + (((i*37 + si*11) % 21) - 10)/100;
      let size = g.sale === 'w' ? 'w' : g.sale;
      if (st === 'asia' && id === 'milk') size = 900;
      out[st][id] = {name:`${g.n} (тест, ${STORE_INFO[st].n})`, size, price:Math.round(g.price*mult[st]*jitter*(size === 900 ? .9 : 1)), url:`https://example.com/${st}/${id}`};
    });
  });
  return out;
})();
