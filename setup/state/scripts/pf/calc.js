const fs=require('fs');const f=process.argv[2];const L=fs.readFileSync(f,'utf8').split('\n');
const s=L.findIndex(l=>/const GrowthData = \[/.test(l)); const e=L.findIndex(l=>/const priceData = /.test(l));
let code=L.slice(s,e).join('\n').replace(/<\/script>[\s\S]*?<script[^>]*>/g,'\n');
code+=`\n;module.exports={GrowthData,SelectData,LightningData,InterMiamiData,couponDetails};`;
const m={exports:{}};new Function('module','window','document',code)(m,{}, {querySelectorAll:()=>[],addEventListener(){}});
const {couponDetails:cd}=m.exports;
const fmt=(n,sf)=>{if(sf===true)return n.toFixed(2).replace(/\.00$/,'');const d=n-Math.floor(n);return d>=0.5?Math.ceil(n):Math.floor(n)};
for(const k of ['GrowthData','SelectData','LightningData','InterMiamiData'])for(const p of m.exports[k])for(const b of p.broker){if(b.isVisible===false)continue;const out=b.account_size.filter(a=>a.isVisible!==false).map(a=>{const d=(cd[(a.couponCode||'').toLowerCase()]||cd.default_code);return `${a.name} $${a.price}→$${fmt(a.price*(100-d[1])/100,a.showFraction)} (${d[0]} ${d[1]}%, cc=${a.couponCode})`});console.log(p.name,'|',b.broker_name,'|',out.join('; '))}
