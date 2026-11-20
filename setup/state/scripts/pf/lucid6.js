const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function open(url){const t=await (await fetch('http://127.0.0.1:9334/json/new?'+url,{method:'PUT'})).json();const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pend={};ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend[d.id]){pend[d.id](d);delete pend[d.id]}};return expr=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:expr,returnByValue:true,awaitPromise:true}}))}).then(d=>d.result&&d.result.result&&d.result.result.value)}
(async()=>{const lu=await open('https://lucidtrading.com/');await sleep(20000);
require('fs').writeFileSync('lucid_dom.html',await lu('document.documentElement.outerHTML'));
console.log('tabs:',await lu(`[...document.querySelectorAll('button.tab')].map(b=>b.dataset.planType+':'+b.innerText).join(',')`));
for(const p of ['lucidpro','lucidflex','luciddaily','luciddirect']){await lu(`document.querySelector('button.tab[data-plan-type="${p}"]')?.click()`);await sleep(4000);
const t=await lu(`[...document.querySelectorAll('body *')].filter(e=>e.offsetParent!==null&&e.children.length==0&&/^\\$[\\d.,]+$/.test(e.textContent.trim())).map(e=>e.textContent.trim()).join(' ')`);console.log(p,t);}
console.log('BANNER:',await lu(`[...document.querySelectorAll('body *')].filter(e=>e.children.length==0&&/coupon|code|off|black|cyber|sale/i.test(e.textContent)&&e.offsetParent!==null).map(e=>e.textContent.trim()).filter((v,i,a)=>a.indexOf(v)==i).slice(0,20).join(' | ')`));
process.exit(0)})();
