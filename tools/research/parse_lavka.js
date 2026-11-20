const fs=require('fs');
const strip=x=>x.replace(/<[^>]+>/g,'').replace(/\u00AD/g,'').replace(/&nbsp;|\u00A0/g,' ').replace(/\s+/g,' ').trim();
function parse(s){
  const out=[];const seen=new Set();
  const parts=s.split('data-testid="product-id-');
  for(const p of parts.slice(1)){
    const id=p.slice(0,p.indexOf('"'));
    if(seen.has(id))continue;
    const h=p.match(/<h3[^>]*>([\s\S]*?)<\/h3>/); if(!h)continue;
    const spans=[...h[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map(x=>strip(x[1]));
    const pr=p.match(/data-testid="price-text">([\s\S]*?)<\/span><\/span>/);
    const old=p.match(/data-testid="price-old-text">([\s\S]*?)<\/span>/);
    if(!pr)continue;
    seen.add(id);
    out.push({id,name:spans[0],unit:spans[1]||'',price:strip(pr[1]),old:old?strip(old[1]):''});
  }
  return out;
}
module.exports=parse;
if(require.main===module){for(const f of process.argv.slice(2)){const s=fs.readFileSync(f,'utf8');for(const p of parse(s))console.log(JSON.stringify(p));}}
